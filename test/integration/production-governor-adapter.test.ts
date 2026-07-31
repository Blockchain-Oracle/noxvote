import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type Handle } from "@iexec-nox/handle";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { network } from "hardhat";
import {
  encodeFunctionData,
  keccak256,
  parseAbi,
  parseAbiItem,
  stringToHex,
  zeroAddress,
  type Address,
} from "viem";
import {
  deployProductionFactory,
  encryptChoice,
  waitForPublicVerdict,
  writeAndWait,
} from "./helpers/production-governance.js";

const targetAbi = parseAbi([
  "function setValue(uint256 nextValue)",
  "function value() view returns (uint256)",
  "function calls() view returns (uint256)",
]);
const governorStackDeployedEvent = parseAbiItem(
  "event GovernorStackDeployed(uint16 indexed contractVersion,address indexed governor,address indexed timelock,address core,address token,bytes32 deploymentConfigHash,uint32 organizationMinimumPrivacyFloor,address ivotesSnapshotStrategy,address merkleWeightedAllowlistStrategy)",
);
const timelockAbi = parseAbi([
  "function PROPOSER_ROLE() view returns (bytes32)",
  "function CANCELLER_ROLE() view returns (bytes32)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function getMinDelay() view returns (uint256)",
]);

describe("production confidential Governor adapter", () => {
  it(
    "factory-deploys the real Timelock stack and executes a real-Nox verdict end to end",
    { timeout: 240_000 },
    async () => {
      const startedAt = performance.now();
      const connection = await network.getOrCreate();
      const noxConnection = await nox.connect(connection);
      const { handleGatewayUrl, noxComputeAddress } = noxConnection;
      const publicClient = await connection.viem.getPublicClient();
      const [deployer, voterA, voterB, voterC, voterD] =
        await connection.viem.getWalletClients();
      const voterWallets = [voterA, voterB, voterC, voterD] as const;
      const weights = [4n, 3n, 2n, 1n] as const;

      const token = await connection.viem.deployContract(
        "ProductionIntegrationVotesToken",
      );
      for (let index = 0; index < voterWallets.length; index += 1) {
        const wallet = voterWallets[index];
        await writeAndWait(
          token.write.mint([wallet.account.address, weights[index]]),
          publicClient,
        );
        const voterToken = await connection.viem.getContractAt(
          "ProductionIntegrationVotesToken",
          token.address,
          { client: { public: publicClient, wallet } },
        );
        await writeAndWait(
          voterToken.write.delegate([wallet.account.address]),
          publicClient,
        );
      }
      await connection.networkHelpers.mine(1);

      const factoryContext = await deployProductionFactory(
        connection,
        deployer,
      );
      const deploymentBlock = await publicClient.getBlockNumber();
      const deploymentConfig = {
        name: "Production Nox Governor",
        token: token.address,
        timelockMinDelay: 2n,
        initialVotingDelay: 1,
        initialVotingPeriod: 8,
        initialProposalThreshold: 0n,
        initialQuorumNumerator: 50n,
        minimumPrivacyFloor: 4,
      } as const;
      await writeAndWait(
        factoryContext.factory.write.deployGovernor([
          deploymentConfig,
          factoryContext.governorCreationCode,
          factoryContext.timelockCreationCode,
        ]),
        publicClient,
      );
      const deploymentLogs = await publicClient.getLogs({
        address: factoryContext.factory.address,
        event: governorStackDeployedEvent,
        fromBlock: deploymentBlock,
      });
      assert.equal(deploymentLogs.length, 1);
      assert.ok(deploymentLogs[0].args.token);
      assert.equal(
        deploymentLogs[0].args.token.toLowerCase(),
        token.address.toLowerCase(),
      );
      const governorAddress = deploymentLogs[0].args.governor;
      const timelockAddress = deploymentLogs[0].args.timelock;
      const coreAddress = deploymentLogs[0].args.core;
      assert.ok(governorAddress && timelockAddress && coreAddress);

      const governor = await connection.viem.getContractAt(
        "ConfidentialGovernor",
        governorAddress,
      );
      const timelock = {
        address: timelockAddress,
        read: {
          PROPOSER_ROLE: () =>
            publicClient.readContract({
              address: timelockAddress,
              abi: timelockAbi,
              functionName: "PROPOSER_ROLE",
            }),
          CANCELLER_ROLE: () =>
            publicClient.readContract({
              address: timelockAddress,
              abi: timelockAbi,
              functionName: "CANCELLER_ROLE",
            }),
          EXECUTOR_ROLE: () =>
            publicClient.readContract({
              address: timelockAddress,
              abi: timelockAbi,
              functionName: "EXECUTOR_ROLE",
            }),
          DEFAULT_ADMIN_ROLE: () =>
            publicClient.readContract({
              address: timelockAddress,
              abi: timelockAbi,
              functionName: "DEFAULT_ADMIN_ROLE",
            }),
          hasRole: (role: `0x${string}`, account: Address) =>
            publicClient.readContract({
              address: timelockAddress,
              abi: timelockAbi,
              functionName: "hasRole",
              args: [role, account],
            }),
          getMinDelay: () =>
            publicClient.readContract({
              address: timelockAddress,
              abi: timelockAbi,
              functionName: "getMinDelay",
            }),
        },
      } as const;
      const core = await connection.viem.getContractAt(
        "ConfidentialBallotCore",
        coreAddress,
      );
      const proposerRole = await timelock.read.PROPOSER_ROLE();
      const cancellerRole = await timelock.read.CANCELLER_ROLE();
      const executorRole = await timelock.read.EXECUTOR_ROLE();
      const adminRole = await timelock.read.DEFAULT_ADMIN_ROLE();
      assert.equal(
        await timelock.read.hasRole(proposerRole, governorAddress),
        true,
      );
      assert.equal(
        await timelock.read.hasRole(cancellerRole, governorAddress),
        true,
      );
      assert.equal(
        await timelock.read.hasRole(executorRole, zeroAddress),
        true,
      );
      assert.equal(
        await timelock.read.hasRole(adminRole, factoryContext.factory.address),
        false,
      );

      const target = await connection.viem.deployContract(
        "ProductionIntegrationTarget",
      );
      const actionCalldata = encodeFunctionData({
        abi: targetAbi,
        functionName: "setValue",
        args: [77n],
      });
      const description = "Production real-Nox Governor execution";
      const descriptionHash = keccak256(stringToHex(description));
      const voterGovernor = await connection.viem.getContractAt(
        "ConfidentialGovernor",
        governorAddress,
        { client: { public: publicClient, wallet: voterA } },
      );
      await writeAndWait(
        voterGovernor.write.proposeConfidential([
          [target.address],
          [0n],
          [actionCalldata],
          description,
          4,
        ]),
        publicClient,
      );
      const proposalId = await governor.read.hashProposal([
        [target.address],
        [0n],
        [actionCalldata],
        descriptionHash,
      ]);
      const ballotId = await governor.read.ballotOfProposal([proposalId]);
      const snapshot = await governor.read.proposalSnapshot([proposalId]);
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= snapshot) {
        await connection.networkHelpers.mine(
          Number(snapshot - currentBlock + 1n),
        );
      }

      for (const wallet of voterWallets) {
        const encrypted = await encryptChoice({
          wallet,
          choice: 1n,
          coreAddress,
          noxComputeAddress,
          handleGatewayUrl,
        });
        const voterCore = await connection.viem.getContractAt(
          "ConfidentialBallotCore",
          coreAddress,
          { client: { public: publicClient, wallet } },
        );
        await writeAndWait(
          voterCore.write.castVote([
            ballotId,
            1n,
            encrypted.handle,
            encrypted.handleProof,
            "0x",
          ]),
          publicClient,
        );
      }

      const deadline = await governor.read.proposalDeadline([proposalId]);
      const blockBeforeClose = await publicClient.getBlockNumber();
      if (blockBeforeClose <= deadline) {
        await connection.networkHelpers.mine(
          Number(deadline - blockBeforeClose + 1n),
        );
      }
      assert.equal(await governor.read.state([proposalId]), 0);
      await writeAndWait(core.write.requestTally([ballotId]), publicClient);
      const verdictHandle = (await core.read.expectedVerdictHandle([
        ballotId,
      ])) as Handle<"bool">;
      const publicResult = await waitForPublicVerdict(
        noxConnection,
        verdictHandle,
      );
      assert.equal(publicResult.value, true);
      await writeAndWait(
        core.write.finalize([ballotId, publicResult.decryptionProof]),
        publicClient,
      );
      assert.equal(await governor.read.state([proposalId]), 4);

      await writeAndWait(
        governor.write.queue([
          [target.address],
          [0n],
          [actionCalldata],
          descriptionHash,
        ]),
        publicClient,
      );
      assert.equal(await governor.read.state([proposalId]), 5);
      await connection.networkHelpers.time.increase(
        (await timelock.read.getMinDelay()) + 1n,
      );
      await writeAndWait(
        governor.write.execute([
          [target.address],
          [0n],
          [actionCalldata],
          descriptionHash,
        ]),
        publicClient,
      );
      assert.equal(await target.read.value(), 77n);
      assert.equal(await target.read.calls(), 1n);
      assert.equal(await governor.read.state([proposalId]), 7);

      console.info(
        `production-governor metrics: realNoxBallots=4 elapsedMs=${Math.round(performance.now() - startedAt)}`,
      );
    },
  );
});

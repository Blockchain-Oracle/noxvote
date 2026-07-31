import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type Handle } from "@iexec-nox/handle";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { artifacts, network } from "hardhat";
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbi,
  parseAbiItem,
  stringToHex,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import {
  buildFourWalletMerkleConfig,
  deployOfficialSafe,
  deployProductionFactory,
  encryptChoice,
  executeSafeCall,
  waitForPublicVerdict,
  writeAndWait,
  type AccountWallet,
  type Connection,
} from "./helpers/production-governance.js";

const safeModuleManagerAbi = parseAbi([
  "function enableModule(address module)",
]);
const targetAbi = parseAbi([
  "function setValue(uint256 nextValue)",
  "function value() view returns (uint256)",
  "function calls() view returns (uint256)",
]);
const safeModuleDeployedEvent = parseAbiItem(
  "event SafeModuleDeployed(uint16 indexed contractVersion,address indexed safe,address indexed module,address core,uint32 organizationMinimumPrivacyFloor,address ivotesSnapshotStrategy,address merkleWeightedAllowlistStrategy,address multiSendCallOnly)",
);

describe("production Safe confidential voting adapter", () => {
  it(
    "factory-deploys the official-Safe module and executes real-Nox direct and batch verdicts",
    { timeout: 240_000 },
    async () => {
      const startedAt = performance.now();
      const connection = await network.getOrCreate();
      const noxConnection = await nox.connect(connection);
      const { handleGatewayUrl, noxComputeAddress } = noxConnection;
      const publicClient = await connection.viem.getPublicClient();
      const [owner, voterA, voterB, voterC, voterD] =
        (await connection.viem.getWalletClients()) as AccountWallet[];
      const voters = [
        voterA.account.address,
        voterB.account.address,
        voterC.account.address,
        voterD.account.address,
      ] as const;
      const weights = [4n, 3n, 2n, 1n] as const;

      const safe = await deployOfficialSafe(owner, publicClient);
      const factoryContext = await deployProductionFactory(connection, owner);
      const deploymentBlock = await publicClient.getBlockNumber();
      await writeAndWait(
        factoryContext.factory.write.deploySafeModule([
          safe.address,
          4,
          factoryContext.safeModuleCreationCode,
        ]),
        publicClient,
      );
      const deploymentLogs = await publicClient.getLogs({
        address: factoryContext.factory.address,
        event: safeModuleDeployedEvent,
        args: { safe: safe.address },
        fromBlock: deploymentBlock,
      });
      assert.equal(deploymentLogs.length, 1);
      const moduleAddress = deploymentLogs[0].args.module;
      const coreAddress = deploymentLogs[0].args.core;
      assert.ok(moduleAddress && coreAddress);

      const module = await connection.viem.getContractAt(
        "SafeConfidentialVotingModule",
        moduleAddress,
      );
      const core = await connection.viem.getContractAt(
        "ConfidentialBallotCore",
        coreAddress,
      );
      const moduleArtifact = await artifacts.readArtifact(
        "SafeConfidentialVotingModule",
      );
      await executeSafeCall({
        safe,
        owner,
        publicClient,
        to: safe.address,
        data: encodeFunctionData({
          abi: safeModuleManagerAbi,
          functionName: "enableModule",
          args: [moduleAddress],
        }),
      });
      assert.equal(await module.read.isInstalled(), true);

      const directTarget = await connection.viem.deployContract(
        "ProductionIntegrationTarget",
      );
      const directActions = [
        {
          to: directTarget.address,
          value: 0n,
          data: encodeFunctionData({
            abi: targetAbi,
            functionName: "setValue",
            args: [41n],
          }),
        },
      ] as const;
      const directProposalId = await registerAndPassSafeProposal({
        connection,
        publicClient,
        noxConnection,
        noxComputeAddress,
        handleGatewayUrl,
        safe,
        owner,
        module,
        core,
        moduleAbi: moduleArtifact.abi,
        voters,
        voterWallets: [voterA, voterB, voterC, voterD],
        weights,
        actions: directActions,
        merkleStrategy: deploymentLogs[0].args.merkleWeightedAllowlistStrategy!,
        domain: "production-safe-direct",
      });
      await writeAndWait(
        module.write.execute([directProposalId, directActions]),
        publicClient,
      );
      assert.equal(await directTarget.read.value(), 41n);
      assert.equal(await directTarget.read.calls(), 1n);

      const batchTargetA = await connection.viem.deployContract(
        "ProductionIntegrationTarget",
      );
      const batchTargetB = await connection.viem.deployContract(
        "ProductionIntegrationTarget",
      );
      const batchActions = [
        {
          to: batchTargetA.address,
          value: 0n,
          data: encodeFunctionData({
            abi: targetAbi,
            functionName: "setValue",
            args: [51n],
          }),
        },
        {
          to: batchTargetB.address,
          value: 0n,
          data: encodeFunctionData({
            abi: targetAbi,
            functionName: "setValue",
            args: [52n],
          }),
        },
      ] as const;
      const batchProposalId = await registerAndPassSafeProposal({
        connection,
        publicClient,
        noxConnection,
        noxComputeAddress,
        handleGatewayUrl,
        safe,
        owner,
        module,
        core,
        moduleAbi: moduleArtifact.abi,
        voters,
        voterWallets: [voterA, voterB, voterC, voterD],
        weights,
        actions: batchActions,
        merkleStrategy: deploymentLogs[0].args.merkleWeightedAllowlistStrategy!,
        domain: "production-safe-batch",
      });
      await writeAndWait(
        module.write.execute([batchProposalId, batchActions]),
        publicClient,
      );
      assert.equal(await batchTargetA.read.value(), 51n);
      assert.equal(await batchTargetB.read.value(), 52n);
      assert.equal(await batchTargetA.read.calls(), 1n);
      assert.equal(await batchTargetB.read.calls(), 1n);
      assert.equal(
        (await module.read.proposal([directProposalId])).executed,
        true,
      );
      assert.equal(
        (await module.read.proposal([batchProposalId])).executed,
        true,
      );

      console.info(
        `production-safe metrics: proposals=2 realNoxBallots=8 elapsedMs=${Math.round(performance.now() - startedAt)}`,
      );
    },
  );
});

async function registerAndPassSafeProposal({
  connection,
  publicClient,
  noxConnection,
  noxComputeAddress,
  handleGatewayUrl,
  safe,
  owner,
  module,
  core,
  moduleAbi,
  voters,
  voterWallets,
  weights,
  actions,
  merkleStrategy,
  domain,
}: {
  connection: Connection;
  publicClient: PublicClient;
  noxConnection: Awaited<ReturnType<typeof nox.connect>>;
  noxComputeAddress: Address;
  handleGatewayUrl: string;
  safe: Awaited<ReturnType<typeof deployOfficialSafe>>;
  owner: AccountWallet;
  // Hardhat's generated getContractAt overload is a union across every
  // artifact. The concrete names above still bind runtime ABI safety.
  module: any;
  core: any;
  moduleAbi: readonly unknown[];
  voters: readonly [Address, Address, Address, Address];
  voterWallets: readonly [
    AccountWallet,
    AccountWallet,
    AccountWallet,
    AccountWallet,
  ];
  weights: readonly [bigint, bigint, bigint, bigint];
  actions: readonly { to: Address; value: bigint; data: Hex }[];
  merkleStrategy: Address;
  domain: string;
}) {
  const chainId = BigInt(await publicClient.getChainId());
  const latestBlock = await publicClient.getBlock();
  const voteStart = latestBlock.timestamp + 2n;
  const voteEnd = voteStart + 10n;
  const snapshotId = keccak256(stringToHex(domain));
  const { eligibilityConfig, proofs } = buildFourWalletMerkleConfig({
    chainId,
    host: module.address,
    snapshotId,
    voters,
    weights,
  });
  const safeProposalId = keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
      ],
      [
        chainId,
        module.address,
        safe.address,
        (await module.read.proposalNonce()) + 1n,
      ],
    ),
  );
  const ballotConfig = {
    eligibilityStrategy: merkleStrategy,
    eligibilityConfig,
    snapshot: voteStart - 1n,
    voteStart,
    voteEnd,
    privacyFloor: 4,
    maxReplacements: 2,
    governanceQuorum: 7n,
  } as const;
  await executeSafeCall({
    safe,
    owner,
    publicClient,
    to: module.address,
    data: encodeFunctionData({
      abi: moduleAbi as Abi,
      functionName: "registerProposal",
      args: [actions, ballotConfig],
    }),
  });
  const ballotId = (await module.read.proposal([safeProposalId])).ballotId;
  assert.notEqual(ballotId, `0x${"00".repeat(32)}`);

  await connection.networkHelpers.time.increaseTo(voteStart + 1n);
  const coreArtifact = await artifacts.readArtifact("ConfidentialBallotCore");
  for (let index = 0; index < voterWallets.length; index += 1) {
    const wallet = voterWallets[index];
    const encrypted = await encryptChoice({
      wallet,
      choice: 1n,
      coreAddress: core.address,
      noxComputeAddress,
      handleGatewayUrl,
    });
    const eligibilityProof = encodeAbiParameters(
      [{ type: "uint256" }, { type: "bytes32[]" }],
      [weights[index], proofs[index]],
    );
    await writeAndWait(
      wallet.writeContract({
        account: wallet.account,
        chain: wallet.chain,
        address: core.address,
        abi: coreArtifact.abi,
        functionName: "castVote",
        args: [
          ballotId,
          1n,
          encrypted.handle,
          encrypted.handleProof,
          eligibilityProof,
        ],
      }),
      publicClient,
    );
  }
  await connection.networkHelpers.time.increaseTo(voteEnd + 1n);
  await writeAndWait(core.write.requestTally([ballotId]), publicClient);
  const verdictHandle = (await core.read.expectedVerdictHandle([
    ballotId,
  ])) as Handle<"bool">;
  const result = await waitForPublicVerdict(noxConnection, verdictHandle);
  assert.equal(result.value, true);
  await writeAndWait(
    core.write.finalize([ballotId, result.decryptionProof]),
    publicClient,
  );
  assert.equal(await core.read.result([ballotId]), 3);
  return safeProposalId;
}

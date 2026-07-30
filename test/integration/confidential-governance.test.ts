import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import { createViemHandleClient, type Handle } from "@iexec-nox/handle";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { network } from "hardhat";
import {
  concatHex,
  encodeFunctionData,
  getContract,
  padHex,
  parseAbi,
  parseAbiItem,
  zeroAddress,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import safeArtifact from "@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json" with { type: "json" };
import safeProxyArtifact from "@safe-global/safe-smart-account/build/artifacts/contracts/proxies/SafeProxy.sol/SafeProxy.json" with { type: "json" };

const noxAclAbi = parseAbi([
  "function isPubliclyDecryptable(bytes32 handle) view returns (bool)",
]);

const zeroHandle = `0x${"00".repeat(32)}` as const;
const executionTargetAbi = parseAbi(["function setValue(uint256 newValue)"]);
const safeModuleAbi = parseAbi(["function enableModule(address module)"]);
// Public development-only fixture key shipped in the official local Nox stack.
// It is used solely to construct adversarial proofs against the local contract.
const localNoxGatewayKey =
  "0x7d9d57f334cbf385b4a5ec1be108f25fc1668b0eae639249bb51aaae85e61022";
const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const noxPluginEntry = require.resolve("@iexec-nox/nox-hardhat-plugin");
const noxComposeDirectory = path.resolve(
  path.dirname(noxPluginEntry),
  "..",
  "..",
  "offchain-services",
);
const noxJetStream = "nox_ingestor";
const noxJetStreamConsumer = "nox_ingestor_consumer";

type RawNatsMessage = {
  subject: string;
  reply?: string;
  payload: string;
};

type JetStreamConsumerInfo = {
  delivered: { consumer_seq: number; stream_seq: number };
  ack_floor: { consumer_seq: number; stream_seq: number };
  num_ack_pending: number;
  num_pending: number;
  num_redelivered: number;
};

describe("full-shape confidential governance", () => {
  it(
    "replaces a weighted ballot, normalizes non-canonical input, and discloses one verdict",
    { timeout: 240_000 },
    async () => {
      const startedAt = performance.now();
      const connection = await network.getOrCreate();
      const noxConnection = await nox.connect(connection);
      const { handleGatewayUrl, noxComputeAddress } = noxConnection;
      const publicClient = await connection.viem.getPublicClient();
      const wallets = await connection.viem.getWalletClients();
      const [creator, voterA, voterB, voterC, voterD] = wallets;
      assert.ok(
        creator.account &&
          voterA.account &&
          voterB.account &&
          voterC.account &&
          voterD.account,
      );

      const governance = await connection.viem.deployContract(
        "ConfidentialGovernanceSpike",
      );
      const executionTarget = await connection.viem.deployContract(
        "SafeExecutionTarget",
      );
      const safe = await deployOfficialSafe(
        creator,
        publicClient,
        governance.address,
      );
      assert.equal(await safe.read.isModuleEnabled([governance.address]), true);
      const actionCalldata = encodeFunctionData({
        abi: executionTargetAbi,
        functionName: "setValue",
        args: [42n],
      });
      const deploymentBlock = await publicClient.getBlockNumber();
      const latestBlock = await publicClient.getBlock();
      const deadline = latestBlock.timestamp + 120n;
      const voters = [
        voterA.account.address,
        voterB.account.address,
        voterC.account.address,
        voterD.account.address,
      ] as const;
      const weights = [5n, 3n, 2n, 1n] as const;

      const createHash = await governance.write.createProposal([
        safe.address,
        executionTarget.address,
        0n,
        actionCalldata,
        deadline,
        4,
        11n,
        voters,
        weights,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      const voterFixtures = [
        { wallet: voterA, choice: 0n, sequence: 1n },
        { wallet: voterB, choice: 0n, sequence: 1n },
        { wallet: voterC, choice: 2n, sequence: 1n },
        // Every non-canonical uint16 is deliberately normalized to Abstain.
        { wallet: voterD, choice: 65_535n, sequence: 1n },
      ] as const;

      const ballotGas: bigint[] = [];
      for (const fixture of voterFixtures) {
        const handleClient = await createViemHandleClient(
          scopeWalletForHandleSdk(fixture.wallet),
          {
            smartContractAddress: noxComputeAddress,
            gatewayUrl: handleGatewayUrl as `http://${string}`,
            subgraphUrl: "https://example.com/subgraphs/id/none",
          },
        );
        const encrypted = await handleClient.encryptInput(
          fixture.choice,
          "uint16",
          governance.address,
        );
        const voterContract = await connection.viem.getContractAt(
          "ConfidentialGovernanceSpike",
          governance.address,
          { client: { public: publicClient, wallet: fixture.wallet } },
        );
        const hash = await voterContract.write.castVote([
          1n,
          fixture.sequence,
          encrypted.handle,
          encrypted.handleProof,
        ]);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        ballotGas.push(receipt.gasUsed);
      }

      // A changes Against(5) -> Abstain(5) -> For(5). If either old
      // contribution is not removed, For cannot beat Against; the final true
      // verdict is sensitive to two accepted replacements.
      const voterAHandleClient = await createViemHandleClient(
        scopeWalletForHandleSdk(voterA),
        {
          smartContractAddress: noxComputeAddress,
          gatewayUrl: handleGatewayUrl as `http://${string}`,
          subgraphUrl: "https://example.com/subgraphs/id/none",
        },
      );
      const replacement = await voterAHandleClient.encryptInput(
        2n,
        "uint16",
        governance.address,
      );
      const voterAContract = await connection.viem.getContractAt(
        "ConfidentialGovernanceSpike",
        governance.address,
        { client: { public: publicClient, wallet: voterA } },
      );
      const replacementHash = await voterAContract.write.castVote([
        1n,
        2n,
        replacement.handle,
        replacement.handleProof,
      ]);
      const replacementReceipt = await publicClient.waitForTransactionReceipt({
        hash: replacementHash,
      });
      ballotGas.push(replacementReceipt.gasUsed);

      const finalReplacement = await voterAHandleClient.encryptInput(
        1n,
        "uint16",
        governance.address,
      );
      const finalReplacementHash = await voterAContract.write.castVote([
        1n,
        3n,
        finalReplacement.handle,
        finalReplacement.handleProof,
      ]);
      const finalReplacementReceipt =
        await publicClient.waitForTransactionReceipt({
          hash: finalReplacementHash,
        });
      ballotGas.push(finalReplacementReceipt.gasUsed);
      await assert.rejects(
        voterAContract.write.castVote([
          1n,
          3n,
          finalReplacement.handle,
          finalReplacement.handleProof,
        ]),
        /WrongSequence/,
      );

      const proposalBeforeClose = await governance.read.getProposal([1n]);
      const ballotA = await governance.read.getBallot([
        1n,
        voterA.account.address,
      ]);
      assert.equal(proposalBeforeClose[6], 4);
      assert.equal(ballotA[0], true);
      assert.equal(ballotA[1], 3n);

      await connection.networkHelpers.time.increaseTo(deadline + 1n);
      const closeStartedAt = performance.now();
      const closeHash = await governance.write.close([1n]);
      const closeReceipt = await publicClient.waitForTransactionReceipt({
        hash: closeHash,
      });

      const accumulators = await governance.read.getAccumulatorHandles([1n]);
      const verdictHandle = accumulators[3];
      assert.notEqual(verdictHandle, zeroHandle);
      assert.equal(await governance.read.isExpectedVerdictPublic([1n]), true);

      const publicResult = await waitForPublicVerdict(
        noxConnection,
        verdictHandle as Handle<"bool">,
      );
      const closeToProofMs = Math.round(performance.now() - closeStartedAt);
      assert.equal(publicResult.solidityType, "bool");
      assert.equal(publicResult.value, true);

      await assert.rejects(
        governance.write.finalize([
          1n,
          tamperLastByte(publicResult.decryptionProof),
        ]),
        /revert/i,
      );

      const finalizeHash = await governance.write.finalize([
        1n,
        publicResult.decryptionProof,
      ]);
      const finalizeReceipt = await publicClient.waitForTransactionReceipt({
        hash: finalizeHash,
      });
      const finalized = await governance.read.getProposal([1n]);
      assert.equal(finalized[0], 4);
      assert.equal(finalized[9], true);

      const safeNonceBefore = await safe.read.nonce();
      await assert.rejects(
        governance.write.execute([
          1n,
          wallets[5].account.address,
          0n,
          actionCalldata,
        ]),
        /ActionMismatch/,
      );
      await assert.rejects(
        governance.write.execute([
          1n,
          executionTarget.address,
          1n,
          actionCalldata,
        ]),
        /ActionMismatch/,
      );
      await assert.rejects(
        governance.write.execute([1n, executionTarget.address, 0n, "0x1234"]),
        /ActionMismatch/,
      );
      const executeHash = await governance.write.execute([
        1n,
        executionTarget.address,
        0n,
        actionCalldata,
      ]);
      const executeReceipt = await publicClient.waitForTransactionReceipt({
        hash: executeHash,
      });
      assert.equal(await executionTarget.read.value(), 42n);
      assert.equal(await executionTarget.read.calls(), 1n);
      assert.equal(await safe.read.nonce(), safeNonceBefore);
      const executed = await governance.read.getProposal([1n]);
      assert.equal(executed[0], 5);
      await assert.rejects(
        governance.write.execute([
          1n,
          executionTarget.address,
          0n,
          actionCalldata,
        ]),
        /WrongProposalState/,
      );

      const privateHandles = new Set<Hex>();
      for (const [wallet, sequence] of [
        [voterA.account.address, 1n],
        [voterA.account.address, 2n],
        [voterA.account.address, 3n],
        [voterB.account.address, 1n],
        [voterC.account.address, 1n],
        [voterD.account.address, 1n],
      ] as const) {
        const trace = await governance.read.getOperationTrace([
          1n,
          wallet,
          sequence,
        ]);
        for (const handle of Object.values(trace) as Hex[]) {
          privateHandles.add(handle);
        }
      }
      for (const handle of accumulators.slice(0, 3)) {
        privateHandles.add(handle);
      }
      const tallyTrace = await governance.read.getTallyTrace([1n]);
      for (const handle of [
        tallyTrace.totalParticipation,
        tallyTrace.quorumReached,
        tallyTrace.forWins,
        tallyTrace.quorumWord,
        tallyTrace.winsWord,
        tallyTrace.conjunction,
      ]) {
        privateHandles.add(handle);
      }
      privateHandles.delete(zeroHandle);
      privateHandles.delete(verdictHandle);

      for (const handle of privateHandles) {
        const isPublic = await publicClient.readContract({
          address: noxComputeAddress,
          abi: noxAclAbi,
          functionName: "isPubliclyDecryptable",
          args: [handle],
        });
        assert.equal(isPublic, false, `unexpected public handle: ${handle}`);
      }

      const viewerEvents = await publicClient.getLogs({
        address: noxComputeAddress,
        event: parseAbiItem(
          "event ViewerAdded(address indexed sender, address indexed viewer, bytes32 indexed handle)",
        ),
        args: { sender: governance.address },
        fromBlock: deploymentBlock,
      });
      const publicEvents = await publicClient.getLogs({
        address: noxComputeAddress,
        event: parseAbiItem(
          "event MarkedAsPubliclyDecryptable(address indexed sender, bytes32 indexed handle)",
        ),
        args: { sender: governance.address },
        fromBlock: deploymentBlock,
      });
      assert.equal(viewerEvents.length, 0);
      assert.equal(publicEvents.length, 1);
      assert.equal(publicEvents[0].args.handle, verdictHandle);

      const elapsedMs = Math.round(performance.now() - startedAt);
      console.info(
        `full-shape metrics: ballots=${ballotGas.join(",")} close=${closeReceipt.gasUsed} finalize=${finalizeReceipt.gasUsed} execute=${executeReceipt.gasUsed} closeToProofMs=${closeToProofMs} elapsedMs=${elapsedMs}`,
      );
    },
  );

  it(
    "withholds a below-floor proposal without creating a public verdict",
    { timeout: 120_000 },
    async () => {
      const connection = await network.getOrCreate();
      const { handleGatewayUrl, noxComputeAddress } =
        await nox.connect(connection);
      const publicClient = await connection.viem.getPublicClient();
      const wallets = await connection.viem.getWalletClients();
      const governance = await connection.viem.deployContract(
        "ConfidentialGovernanceSpike",
      );
      const latestBlock = await publicClient.getBlock();
      const deadline = latestBlock.timestamp + 60n;
      const createHash = await governance.write.createProposal([
        wallets[0].account.address,
        wallets[5].account.address,
        0n,
        "0x1234",
        deadline,
        2,
        1n,
        [wallets[1].account.address, wallets[2].account.address],
        [1n, 1n],
      ]);
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      const ownerClient = await createViemHandleClient(
        scopeWalletForHandleSdk(wallets[1]),
        {
          smartContractAddress: noxComputeAddress,
          gatewayUrl: handleGatewayUrl as `http://${string}`,
          subgraphUrl: "https://example.com/subgraphs/id/none",
        },
      );
      const wrongOwnerInput = await ownerClient.encryptInput(
        1n,
        "uint16",
        governance.address,
      );
      const wrongSubmittingContract = await connection.viem.getContractAt(
        "ConfidentialGovernanceSpike",
        governance.address,
        { client: { public: publicClient, wallet: wallets[2] } },
      );
      await assert.rejects(
        wrongSubmittingContract.write.castVote([
          1n,
          1n,
          wrongOwnerInput.handle,
          wrongOwnerInput.handleProof,
        ]),
        (error) =>
          (error as { details?: string }).details?.includes("0xae385f38") ===
          true,
      );

      await connection.networkHelpers.time.increaseTo(deadline + 1n);
      const closeHash = await governance.write.close([1n]);
      await publicClient.waitForTransactionReceipt({ hash: closeHash });

      const proposal = await governance.read.getProposal([1n]);
      const handles = await governance.read.getAccumulatorHandles([1n]);
      assert.equal(proposal[0], 2);
      assert.equal(proposal[6], 0);
      assert.deepEqual(handles, [
        zeroHandle,
        zeroHandle,
        zeroHandle,
        zeroHandle,
      ]);
      assert.equal(await governance.read.isExpectedVerdictPublic([1n]), false);
    },
  );

  it(
    "resolves the same queued verdict after the real Runner is stopped and restarted",
    { timeout: 180_000 },
    async () => {
      const connection = await network.getOrCreate();
      const noxConnection = await nox.connect(connection);
      const { handleGatewayUrl, noxComputeAddress } = noxConnection;
      const publicClient = await connection.viem.getPublicClient();
      const wallets = await connection.viem.getWalletClients();
      const governance = await connection.viem.deployContract(
        "ConfidentialGovernanceSpike",
      );
      const latestBlock = await publicClient.getBlock();
      const deadline = latestBlock.timestamp + 60n;
      const createHash = await governance.write.createProposal([
        wallets[0].account.address,
        wallets[5].account.address,
        0n,
        "0x1234",
        deadline,
        1,
        1n,
        [wallets[1].account.address],
        [1n],
      ]);
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      const handleClient = await createViemHandleClient(
        scopeWalletForHandleSdk(wallets[1]),
        {
          smartContractAddress: noxComputeAddress,
          gatewayUrl: handleGatewayUrl as `http://${string}`,
          subgraphUrl: "https://example.com/subgraphs/id/none",
        },
      );
      const encryptedFor = await handleClient.encryptInput(
        1n,
        "uint16",
        governance.address,
      );
      const voterContract = await connection.viem.getContractAt(
        "ConfidentialGovernanceSpike",
        governance.address,
        { client: { public: publicClient, wallet: wallets[1] } },
      );

      await setRunnerState("stop");
      try {
        const voteHash = await voterContract.write.castVote([
          1n,
          1n,
          encryptedFor.handle,
          encryptedFor.handleProof,
        ]);
        await publicClient.waitForTransactionReceipt({ hash: voteHash });
        await connection.networkHelpers.time.increaseTo(deadline + 1n);
        const closeHash = await governance.write.close([1n]);
        await publicClient.waitForTransactionReceipt({ hash: closeHash });

        const verdictHandle = (
          await governance.read.getAccumulatorHandles([1n])
        )[3];
        assert.notEqual(verdictHandle, zeroHandle);
        const unresolved = await fetch(
          `${handleGatewayUrl}/v0/public/${verdictHandle}`,
        );
        assert.equal(unresolved.status, 404);

        await setRunnerState("start");
        const result = await waitForPublicVerdict(
          noxConnection,
          verdictHandle as Handle<"bool">,
        );
        assert.equal(result.value, true);
        assert.equal(
          (await governance.read.getAccumulatorHandles([1n]))[3],
          verdictHandle,
        );
        const finalizeHash = await governance.write.finalize([
          1n,
          result.decryptionProof,
        ]);
        await publicClient.waitForTransactionReceipt({ hash: finalizeHash });
        const finalized = await governance.read.getProposal([1n]);
        assert.equal(finalized[0], 4);
        assert.equal(finalized[9], true);
      } finally {
        await setRunnerState("start");
      }
    },
  );

  it(
    "rejects the complete public-verdict proof matrix without mutating either proposal",
    { timeout: 180_000 },
    async () => {
      const connection = await network.getOrCreate();
      const noxConnection = await nox.connect(connection);
      const { handleGatewayUrl, noxComputeAddress } = noxConnection;
      const publicClient = await connection.viem.getPublicClient();
      const wallets = await connection.viem.getWalletClients();
      const governance = await connection.viem.deployContract(
        "ConfidentialGovernanceSpike",
      );
      const latestBlock = await publicClient.getBlock();
      const deadline = latestBlock.timestamp + 60n;

      for (let proposalIndex = 0; proposalIndex < 2; proposalIndex += 1) {
        const createHash = await governance.write.createProposal([
          wallets[0].account.address,
          wallets[5].account.address,
          0n,
          `0x12${proposalIndex + 10}` as Hex,
          deadline,
          1,
          1n,
          [wallets[1].account.address],
          [1n],
        ]);
        await publicClient.waitForTransactionReceipt({ hash: createHash });

        const handleClient = await createViemHandleClient(
          scopeWalletForHandleSdk(wallets[1]),
          {
            smartContractAddress: noxComputeAddress,
            gatewayUrl: handleGatewayUrl as `http://${string}`,
            subgraphUrl: "https://example.com/subgraphs/id/none",
          },
        );
        const encryptedFor = await handleClient.encryptInput(
          1n,
          "uint16",
          governance.address,
        );
        const voterContract = await connection.viem.getContractAt(
          "ConfidentialGovernanceSpike",
          governance.address,
          { client: { public: publicClient, wallet: wallets[1] } },
        );
        const voteHash = await voterContract.write.castVote([
          BigInt(proposalIndex + 1),
          1n,
          encryptedFor.handle,
          encryptedFor.handleProof,
        ]);
        await publicClient.waitForTransactionReceipt({ hash: voteHash });
      }

      await assert.rejects(
        governance.write.finalize([1n, "0x"]),
        /WrongProposalState|revert/i,
      );
      await connection.networkHelpers.time.increaseTo(deadline + 1n);
      for (const proposalId of [1n, 2n]) {
        const closeHash = await governance.write.close([proposalId]);
        await publicClient.waitForTransactionReceipt({ hash: closeHash });
      }

      await assert.rejects(
        governance.write.finalize([1n, "0x"]),
        /Proof too short|InvalidProof|revert/i,
      );

      const verdictHandle1 = (
        await governance.read.getAccumulatorHandles([1n])
      )[3] as Handle<"bool">;
      const verdictHandle2 = (
        await governance.read.getAccumulatorHandles([2n])
      )[3] as Handle<"bool">;
      const [publicResult1, publicResult2] = await Promise.all([
        waitForPublicVerdict(noxConnection, verdictHandle1),
        waitForPublicVerdict(noxConnection, verdictHandle2),
      ]);

      await assert.rejects(
        governance.write.finalize([
          1n,
          tamperLastByte(publicResult1.decryptionProof),
        ]),
        /Invalid signature|InvalidProof|revert/i,
      );
      await assert.rejects(
        governance.write.finalize([2n, publicResult1.decryptionProof]),
        /Invalid signature|InvalidProof|revert/i,
      );

      const wrongSignerProof = await signLocalDecryptionProof({
        chainId: 31_337,
        noxComputeAddress,
        handle: verdictHandle1,
        decryptedResult: "0x01",
        privateKey: `0x${"11".repeat(32)}`,
      });
      await assert.rejects(
        governance.write.finalize([1n, wrongSignerProof]),
        /Invalid signature|InvalidProof|revert/i,
      );

      const wrongDomainProof = await signLocalDecryptionProof({
        chainId: 31_337,
        noxComputeAddress,
        handle: verdictHandle1,
        decryptedResult: "0x01",
        privateKey: localNoxGatewayKey,
        domainVersion: "2",
      });
      await assert.rejects(
        governance.write.finalize([1n, wrongDomainProof]),
        /Invalid signature|InvalidProof|revert/i,
      );

      const wrongLengthProof = await signLocalDecryptionProof({
        chainId: 31_337,
        noxComputeAddress,
        handle: verdictHandle1,
        decryptedResult: "0x0001",
        privateKey: localNoxGatewayKey,
      });
      await assert.rejects(
        governance.write.finalize([1n, wrongLengthProof]),
        /MalformedDecryptedData|revert/i,
      );

      const invalidBooleanProof = await signLocalDecryptionProof({
        chainId: 31_337,
        noxComputeAddress,
        handle: verdictHandle1,
        decryptedResult: "0x02",
        privateKey: localNoxGatewayKey,
      });
      await assert.rejects(
        governance.write.finalize([1n, invalidBooleanProof]),
        /MalformedDecryptedData|revert/i,
      );

      assert.equal((await governance.read.getProposal([1n]))[0], 3);
      assert.equal((await governance.read.getProposal([2n]))[0], 3);

      const finalize1 = await governance.write.finalize([
        1n,
        publicResult1.decryptionProof,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: finalize1 });
      await assert.rejects(
        governance.write.finalize([1n, publicResult1.decryptionProof]),
        /WrongProposalState|revert/i,
      );
      const finalize2 = await governance.write.finalize([
        2n,
        publicResult2.decryptionProof,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: finalize2 });
      assert.equal((await governance.read.getProposal([1n]))[9], true);
      assert.equal((await governance.read.getProposal([2n]))[9], true);
    },
  );

  it(
    "redelivers a negatively acknowledged JetStream tally message deterministically",
    { timeout: 180_000 },
    async () => {
      const connection = await network.getOrCreate();
      const noxConnection = await nox.connect(connection);
      const { handleGatewayUrl, noxComputeAddress } = noxConnection;
      const publicClient = await connection.viem.getPublicClient();
      const wallets = await connection.viem.getWalletClients();
      const governance = await connection.viem.deployContract(
        "ConfidentialGovernanceSpike",
      );
      const latestBlock = await publicClient.getBlock();
      const deadline = latestBlock.timestamp + 60n;
      const createHash = await governance.write.createProposal([
        wallets[0].account.address,
        wallets[5].account.address,
        0n,
        "0x1234",
        deadline,
        1,
        1n,
        [wallets[1].account.address],
        [1n],
      ]);
      await publicClient.waitForTransactionReceipt({ hash: createHash });

      const consumerBeforeVote = await getNoxConsumerInfo();
      const handleClient = await createViemHandleClient(
        scopeWalletForHandleSdk(wallets[1]),
        {
          smartContractAddress: noxComputeAddress,
          gatewayUrl: handleGatewayUrl as `http://${string}`,
          subgraphUrl: "https://example.com/subgraphs/id/none",
        },
      );
      const encryptedFor = await handleClient.encryptInput(
        1n,
        "uint16",
        governance.address,
      );
      const voterContract = await connection.viem.getContractAt(
        "ConfidentialGovernanceSpike",
        governance.address,
        { client: { public: publicClient, wallet: wallets[1] } },
      );
      const voteHash = await voterContract.write.castVote([
        1n,
        1n,
        encryptedFor.handle,
        encryptedFor.handleProof,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voteHash });
      await waitForNoxConsumer(
        (info) =>
          info.delivered.consumer_seq >
            consumerBeforeVote.delivered.consumer_seq &&
          info.num_pending === 0 &&
          info.num_ack_pending === 0,
        "vote transaction acknowledgement",
      );

      await setRunnerState("stop");
      try {
        await connection.networkHelpers.time.increaseTo(deadline + 1n);
        const closeHash = await governance.write.close([1n]);
        await publicClient.waitForTransactionReceipt({ hash: closeHash });

        const beforePull = await waitForNoxConsumer(
          (info) => info.num_pending === 1 && info.num_ack_pending === 0,
          "queued tally message",
        );
        const firstDelivery = await rawNatsRequest(
          `$JS.API.CONSUMER.MSG.NEXT.${noxJetStream}.${noxJetStreamConsumer}`,
          JSON.stringify({ batch: 1, expires: 5_000_000_000 }),
        );
        const acknowledgementSubject = firstDelivery.reply;
        if (!acknowledgementSubject?.startsWith("$JS.ACK.")) {
          throw new Error("JetStream delivery did not contain an ACK subject");
        }
        const transactionMessage = JSON.parse(firstDelivery.payload) as {
          transactionHash: string;
        };
        assert.equal(
          transactionMessage.transactionHash.toLowerCase(),
          closeHash.toLowerCase(),
        );

        const afterFirstDelivery = await getNoxConsumerInfo();
        assert.equal(
          afterFirstDelivery.delivered.consumer_seq,
          beforePull.delivered.consumer_seq + 1,
        );
        assert.equal(afterFirstDelivery.num_ack_pending, 1);

        await rawNatsPublish(acknowledgementSubject, "-NAK");
        await setRunnerState("start");

        const verdictHandle = (
          await governance.read.getAccumulatorHandles([1n])
        )[3];
        const result = await waitForPublicVerdict(
          noxConnection,
          verdictHandle as Handle<"bool">,
        );
        assert.equal(result.value, true);

        const afterRedelivery = await waitForNoxConsumer(
          (info) =>
            info.delivered.consumer_seq >=
              beforePull.delivered.consumer_seq + 2 &&
            info.num_pending === 0 &&
            info.num_ack_pending === 0,
          "negative-acknowledgement redelivery",
        );
        assert.equal(
          afterRedelivery.delivered.consumer_seq,
          beforePull.delivered.consumer_seq + 2,
        );
        assert.equal(afterRedelivery.ack_floor.stream_seq > 0, true);

        const finalizeHash = await governance.write.finalize([
          1n,
          result.decryptionProof,
        ]);
        await publicClient.waitForTransactionReceipt({ hash: finalizeHash });
        assert.equal((await governance.read.getProposal([1n]))[9], true);
      } finally {
        await setRunnerState("start");
      }
    },
  );
});

async function waitForPublicVerdict(
  noxConnection: Awaited<ReturnType<typeof nox.connect>>,
  handle: Handle<"bool">,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await noxConnection.publicDecrypt(handle);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError;
}

/**
 * @iexec-nox/handle@0.1.0-beta.13 derives the proof owner from
 * walletClient.getAddresses()[0] instead of walletClient.account. Hardhat's
 * account-bound clients still return every node account from getAddresses(),
 * so scope that one discovery method to the actual submitting account.
 */
function scopeWalletForHandleSdk<
  Wallet extends { account: { address: Address } },
>(wallet: Wallet): Wallet {
  return new Proxy(wallet, {
    get(target, property, receiver) {
      if (property === "getAddresses") {
        return async () => [target.account.address];
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

function tamperLastByte(value: Hex): Hex {
  const lastByte = value.slice(-2) === "00" ? "01" : "00";
  return `${value.slice(0, -2)}${lastByte}` as Hex;
}

async function signLocalDecryptionProof({
  chainId,
  noxComputeAddress,
  handle,
  decryptedResult,
  privateKey,
  domainVersion = "1",
}: {
  chainId: number;
  noxComputeAddress: Address;
  handle: Hex;
  decryptedResult: Hex;
  privateKey: Hex;
  domainVersion?: string;
}): Promise<Hex> {
  const signer = privateKeyToAccount(privateKey);
  const signature = await signer.signTypedData({
    domain: {
      name: "NoxCompute",
      version: domainVersion,
      chainId,
      verifyingContract: noxComputeAddress,
    },
    types: {
      DecryptionProof: [
        { name: "handle", type: "bytes32" },
        { name: "decryptedResult", type: "bytes" },
      ],
    },
    primaryType: "DecryptionProof",
    message: { handle, decryptedResult },
  });
  return concatHex([signature, decryptedResult]);
}

async function setRunnerState(state: "start" | "stop") {
  await execFileAsync(
    "docker",
    ["compose", "--env-file", "dev.env", state, "nox-runner"],
    { cwd: noxComposeDirectory },
  );
}

async function getNoxConsumerInfo(): Promise<JetStreamConsumerInfo> {
  const response = await rawNatsRequest(
    `$JS.API.CONSUMER.INFO.${noxJetStream}.${noxJetStreamConsumer}`,
    "",
  );
  const parsed = JSON.parse(response.payload) as JetStreamConsumerInfo & {
    error?: { description?: string };
  };
  if (parsed.error) {
    throw new Error(
      `JetStream consumer info failed: ${parsed.error.description ?? "unknown error"}`,
    );
  }
  return parsed;
}

async function waitForNoxConsumer(
  predicate: (info: JetStreamConsumerInfo) => boolean,
  label: string,
): Promise<JetStreamConsumerInfo> {
  let latest: JetStreamConsumerInfo | undefined;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    latest = await getNoxConsumerInfo();
    if (predicate(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `Timed out waiting for ${label}; last consumer state: ${JSON.stringify(latest)}`,
  );
}

async function getNatsContainerId(): Promise<string> {
  const { stdout } = await execFileAsync(
    "docker",
    ["compose", "--env-file", "dev.env", "ps", "-q", "nats"],
    { cwd: noxComposeDirectory },
  );
  const containerId = stdout.trim();
  if (!containerId) throw new Error("Nox NATS container is not running");
  return containerId;
}

async function rawNatsRequest(
  subject: string,
  payload: string,
): Promise<RawNatsMessage> {
  const containerId = await getNatsContainerId();
  const inbox = `_INBOX.codex.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
  const child = spawn(
    "docker",
    ["exec", "-i", containerId, "nc", "127.0.0.1", "4222"],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  return new Promise<RawNatsMessage>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      finish(
        new Error(
          `Timed out waiting for NATS response on ${subject}; wire=${JSON.stringify(stdout)}; stderr=${JSON.stringify(stderr)}`,
        ),
      );
    }, 7_000);

    const finish = (error?: Error, message?: RawNatsMessage) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.stdin.end();
      child.kill();
      if (error) reject(error);
      else resolve(message!);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      const message = parseRawNatsMessage(stdout);
      if (message) finish(undefined, message);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => finish(error));
    child.on("exit", (code) => {
      if (!settled) {
        finish(
          new Error(
            `NATS request transport exited ${code}: ${stderr || stdout}`,
          ),
        );
      }
    });

    const payloadBytes = Buffer.byteLength(payload);
    child.stdin.write(
      `CONNECT {"verbose":false,"pedantic":false}\r\nPING\r\nSUB ${inbox} 1\r\nUNSUB 1 1\r\nPUB ${subject} ${inbox} ${payloadBytes}\r\n${payload}\r\nPING\r\n`,
    );
  });
}

async function rawNatsPublish(subject: string, payload: string): Promise<void> {
  const containerId = await getNatsContainerId();
  const child = spawn(
    "docker",
    ["exec", "-i", containerId, "nc", "127.0.0.1", "4222"],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  await new Promise<void>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error(`Timed out publishing NATS message on ${subject}`));
    }, 7_000);

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.stdin.end();
      child.kill();
      if (error) reject(error);
      else resolve();
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if ((stdout.match(/PONG\r\n/g) ?? []).length >= 2) finish();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => finish(error));
    child.on("exit", (code) => {
      if (!settled) {
        finish(
          new Error(
            `NATS publish transport exited ${code}: ${stderr || stdout}`,
          ),
        );
      }
    });

    const payloadBytes = Buffer.byteLength(payload);
    child.stdin.write(
      `CONNECT {"verbose":false,"pedantic":false}\r\nPING\r\nPUB ${subject} ${payloadBytes}\r\n${payload}\r\nPING\r\n`,
    );
  });
}

function parseRawNatsMessage(wireData: string): RawNatsMessage | undefined {
  // JetStream pull delivery preserves the original stream subject in the MSG
  // frame even though the request/reply inbox owns subscription id 1.
  const messageStart = wireData.indexOf("MSG ");
  if (messageStart === -1) return undefined;
  const headerEnd = wireData.indexOf("\r\n", messageStart);
  if (headerEnd === -1) return undefined;
  const fields = wireData.slice(messageStart, headerEnd).split(" ");
  const payloadLength = Number(fields.at(-1));
  if (!Number.isSafeInteger(payloadLength)) return undefined;
  const payloadStart = headerEnd + 2;
  const payloadEnd = payloadStart + payloadLength;
  if (wireData.length < payloadEnd) return undefined;
  return {
    subject: fields[1],
    reply: fields.length === 5 ? fields[3] : undefined,
    payload: wireData.slice(payloadStart, payloadEnd),
  };
}

async function deployOfficialSafe(
  owner: WalletClient,
  publicClient: PublicClient,
  module: Address,
) {
  const safeAbi = safeArtifact.abi as Abi;
  const proxyAbi = safeProxyArtifact.abi as Abi;
  const singletonHash = await owner.deployContract({
    account: owner.account!,
    chain: owner.chain,
    abi: safeAbi,
    bytecode: safeArtifact.bytecode as Hex,
  });
  const singletonReceipt = await publicClient.waitForTransactionReceipt({
    hash: singletonHash,
  });
  assert.ok(singletonReceipt.contractAddress);

  const proxyHash = await owner.deployContract({
    account: owner.account!,
    chain: owner.chain,
    abi: proxyAbi,
    bytecode: safeProxyArtifact.bytecode as Hex,
    args: [singletonReceipt.contractAddress],
  });
  const proxyReceipt = await publicClient.waitForTransactionReceipt({
    hash: proxyHash,
  });
  assert.ok(proxyReceipt.contractAddress);

  const safe = getContract({
    address: proxyReceipt.contractAddress,
    abi: safeAbi,
    client: { public: publicClient, wallet: owner },
  });
  const setupHash = await safe.write.setup([
    [owner.account!.address],
    1n,
    zeroAddress,
    "0x",
    zeroAddress,
    zeroAddress,
    0n,
    zeroAddress,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: setupHash });

  const enableModuleData = encodeFunctionData({
    abi: safeModuleAbi,
    functionName: "enableModule",
    args: [module],
  });
  // Safe's prevalidated-signature form. Since the submitting account is the
  // sole owner, this is a real 1-of-1 owner-threshold transaction.
  const ownerSignature = concatHex([
    padHex(owner.account!.address, { size: 32 }),
    zeroHandle,
    "0x01",
  ]);
  const enableHash = await safe.write.execTransaction([
    safe.address,
    0n,
    enableModuleData,
    0,
    0n,
    0n,
    0n,
    zeroAddress,
    zeroAddress,
    ownerSignature,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: enableHash });
  return safe;
}

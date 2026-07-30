import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createViemHandleClient, type Handle } from "@iexec-nox/handle";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { network } from "hardhat";
import {
  encodeFunctionData,
  keccak256,
  stringToHex,
  zeroAddress,
  type Address,
} from "viem";

const executionTargetAbi = [
  {
    type: "function",
    name: "setValue",
    stateMutability: "nonpayable",
    inputs: [{ name: "newValue", type: "uint256" }],
    outputs: [],
  },
] as const;

describe("compatible confidential Governor timelock", () => {
  it(
    "maps async Nox tallying explicitly and preserves the real OZ queue/timelock path",
    { timeout: 180_000 },
    async () => {
      const connection = await network.getOrCreate();
      const noxConnection = await nox.connect(connection);
      const { handleGatewayUrl, noxComputeAddress } = noxConnection;
      const publicClient = await connection.viem.getPublicClient();
      const wallets = await connection.viem.getWalletClients();
      const [creator, voterA, voterB] = wallets;

      const timelock = await connection.viem.deployContract(
        "SpikeTimelockController",
        [5n, [creator.account.address], [zeroAddress], creator.account.address],
      );
      const governor = await connection.viem.deployContract(
        "ConfidentialGovernorTimelockSpike",
        [timelock.address],
      );
      const proposerRole = await timelock.read.PROPOSER_ROLE();
      const grantHash = await timelock.write.grantRole([
        proposerRole,
        governor.address,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: grantHash });

      const target = await connection.viem.deployContract(
        "SafeExecutionTarget",
      );
      const actionCalldata = encodeFunctionData({
        abi: executionTargetAbi,
        functionName: "setValue",
        args: [99n],
      });
      const description = "Execute the exact confidentially approved action";
      const descriptionHash = keccak256(stringToHex(description));
      const proposeHash = await governor.write.proposeConfidential([
        [target.address],
        [0n],
        [actionCalldata],
        description,
        1,
        1n,
        [voterA.account.address],
        [1n],
      ]);
      await publicClient.waitForTransactionReceipt({ hash: proposeHash });

      const proposalId = await governor.read.hashProposal([
        [target.address],
        [0n],
        [actionCalldata],
        descriptionHash,
      ]);
      const tallyAddress = (await governor.read.confidentialTally()) as Address;
      const tallyProposalId = (await governor.read.tallyProposalOf([
        proposalId,
      ])) as bigint;
      const tally = await connection.viem.getContractAt(
        "ConfidentialGovernanceSpike",
        tallyAddress,
      );
      const linkedProposal = await tally.read.getProposal([tallyProposalId]);
      assert.equal(
        linkedProposal[1].toLowerCase(),
        timelock.address.toLowerCase(),
      );
      assert.equal(
        linkedProposal[2].toLowerCase(),
        target.address.toLowerCase(),
      );
      assert.equal(linkedProposal[3], 0n);
      assert.equal(linkedProposal[8], keccak256(actionCalldata));

      await assert.rejects(
        governor.read.castVote([proposalId, 1]),
        /PlaintextVoteDisabled|revert/i,
      );

      const handleClient = await createViemHandleClient(
        scopeWalletForHandleSdk(voterA),
        {
          smartContractAddress: noxComputeAddress,
          gatewayUrl: handleGatewayUrl as `http://${string}`,
          subgraphUrl: "https://example.com/subgraphs/id/none",
        },
      );
      const encryptedFor = await handleClient.encryptInput(
        1n,
        "uint16",
        tally.address,
      );
      const voterTally = await connection.viem.getContractAt(
        "ConfidentialGovernanceSpike",
        tally.address,
        { client: { public: publicClient, wallet: voterA } },
      );
      const voteHash = await voterTally.write.castVote([
        tallyProposalId,
        1n,
        encryptedFor.handle,
        encryptedFor.handleProof,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: voteHash });
      assert.equal(
        await governor.read.hasVoted([proposalId, voterA.account.address]),
        true,
      );

      const deadline = (await governor.read.proposalDeadline([
        proposalId,
      ])) as bigint;
      await connection.networkHelpers.time.increaseTo(deadline + 1n);
      assert.equal(await governor.read.state([proposalId]), 0);
      assert.equal(await governor.read.confidentialState([proposalId]), 3);
      await assert.rejects(
        governor.write.queue([
          [target.address],
          [0n],
          [actionCalldata],
          descriptionHash,
        ]),
        /GovernorUnexpectedProposalState|revert/i,
      );

      const closeHash = await tally.write.close([tallyProposalId]);
      await publicClient.waitForTransactionReceipt({ hash: closeHash });
      assert.equal(await governor.read.state([proposalId]), 0);
      assert.equal(await governor.read.confidentialState([proposalId]), 3);

      const verdictHandle = (
        await tally.read.getAccumulatorHandles([tallyProposalId])
      )[3];
      const result = await waitForPublicVerdict(
        noxConnection,
        verdictHandle as Handle<"bool">,
      );
      assert.equal(result.value, true);
      const finalizeHash = await tally.write.finalize([
        tallyProposalId,
        result.decryptionProof,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: finalizeHash });
      assert.equal(await governor.read.state([proposalId]), 4);
      assert.equal(await governor.read.confidentialState([proposalId]), 6);

      const mismatchedCalldata = encodeFunctionData({
        abi: executionTargetAbi,
        functionName: "setValue",
        args: [100n],
      });
      await assert.rejects(
        governor.write.queue([
          [target.address],
          [0n],
          [mismatchedCalldata],
          descriptionHash,
        ]),
        /GovernorNonexistentProposal|GovernorUnexpectedProposalState|revert/i,
      );

      const queueHash = await governor.write.queue([
        [target.address],
        [0n],
        [actionCalldata],
        descriptionHash,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: queueHash });
      assert.equal(await governor.read.state([proposalId]), 5);
      assert.equal(await governor.read.confidentialState([proposalId]), 7);
      assert.equal(await target.read.value(), 0n);

      await assert.rejects(
        governor.write.execute([
          [target.address],
          [0n],
          [actionCalldata],
          descriptionHash,
        ]),
        /TimelockUnexpectedOperationState|revert/i,
      );
      const minDelay = (await timelock.read.getMinDelay()) as bigint;
      await connection.networkHelpers.time.increase(minDelay + 1n);
      const executeHash = await governor.write.execute([
        [target.address],
        [0n],
        [actionCalldata],
        descriptionHash,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: executeHash });
      assert.equal(await target.read.value(), 99n);
      assert.equal(await target.read.calls(), 1n);
      assert.equal(await governor.read.state([proposalId]), 7);
      assert.equal(await governor.read.confidentialState([proposalId]), 8);

      const withheldAction = encodeFunctionData({
        abi: executionTargetAbi,
        functionName: "setValue",
        args: [101n],
      });
      const withheldDescription = "Withhold below the privacy floor";
      const withheldDescriptionHash = keccak256(
        stringToHex(withheldDescription),
      );
      const proposeWithheldHash = await governor.write.proposeConfidential([
        [target.address],
        [0n],
        [withheldAction],
        withheldDescription,
        2,
        1n,
        [voterA.account.address, voterB.account.address],
        [1n, 1n],
      ]);
      await publicClient.waitForTransactionReceipt({
        hash: proposeWithheldHash,
      });
      const withheldProposalId = await governor.read.hashProposal([
        [target.address],
        [0n],
        [withheldAction],
        withheldDescriptionHash,
      ]);
      const withheldTallyId = (await governor.read.tallyProposalOf([
        withheldProposalId,
      ])) as bigint;
      const withheldInput = await handleClient.encryptInput(
        1n,
        "uint16",
        tally.address,
      );
      const withheldVote = await voterTally.write.castVote([
        withheldTallyId,
        1n,
        withheldInput.handle,
        withheldInput.handleProof,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: withheldVote });
      const withheldDeadline = (await governor.read.proposalDeadline([
        withheldProposalId,
      ])) as bigint;
      await connection.networkHelpers.time.increaseTo(withheldDeadline + 1n);
      const withholdHash = await tally.write.close([withheldTallyId]);
      await publicClient.waitForTransactionReceipt({ hash: withholdHash });
      assert.equal(await governor.read.state([withheldProposalId]), 3);
      assert.equal(
        await governor.read.confidentialState([withheldProposalId]),
        4,
      );
      assert.equal(await target.read.value(), 99n);
      await assert.rejects(
        governor.write.queue([
          [target.address],
          [0n],
          [withheldAction],
          withheldDescriptionHash,
        ]),
        /GovernorUnexpectedProposalState|revert/i,
      );
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

/** See the released SDK owner-discovery issue documented in the spike report. */
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

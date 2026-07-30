import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createViemHandleClient, type Handle } from "@iexec-nox/handle";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { network } from "hardhat";
import {
  concatHex,
  encodeAbiParameters,
  keccak256,
  parseAbi,
  parseAbiItem,
  stringToHex,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";

const noxAclAbi = parseAbi([
  "function isAllowed(bytes32 handle, address account) view returns (bool)",
  "function isPubliclyDecryptable(bytes32 handle) view returns (bool)",
]);

const eligibilityLeafTypehash = keccak256(
  stringToHex(
    "ConfidentialVotingEligibility(uint256 chainId,address host,bytes32 snapshotId,address voter,uint256 weight)",
  ),
);

describe("production confidential ballot core", () => {
  it(
    "resolves the four-wallet floor-four graph through the released Nox stack",
    { timeout: 240_000 },
    async () => {
      const startedAt = performance.now();
      const connection = await network.getOrCreate();
      const noxConnection = await nox.connect(connection);
      const { handleGatewayUrl, noxComputeAddress } = noxConnection;
      const publicClient = await connection.viem.getPublicClient();
      const [deployer, voterA, voterB, voterC, voterD] =
        await connection.viem.getWalletClients();
      assert.ok(
        deployer.account &&
          voterA.account &&
          voterB.account &&
          voterC.account &&
          voterD.account,
      );

      const ivotesStrategy = await connection.viem.deployContract(
        "IVotesSnapshotStrategy",
      );
      const merkleStrategy = await connection.viem.deployContract(
        "MerkleWeightedAllowlistStrategy",
      );
      const host = await connection.viem.deployContract("HostClockFixture", [
        merkleStrategy.address,
        ivotesStrategy.address,
        4,
      ]);
      const coreAddress = (await host.read.confidentialCore()) as Address;
      const core = await connection.viem.getContractAt(
        "ConfidentialBallotCore",
        coreAddress,
      );

      const chainId = BigInt(await publicClient.getChainId());
      const snapshotId = keccak256(stringToHex("production-floor-four"));
      const voters = [
        voterA.account.address,
        voterB.account.address,
        voterC.account.address,
        voterD.account.address,
      ] as const;
      const weights = [4n, 3n, 2n, 1n] as const;
      const tree = buildFourLeafTree(
        voters.map((voter, index) =>
          eligibilityLeaf(
            chainId,
            host.address,
            snapshotId,
            voter,
            weights[index],
          ),
        ),
      );
      const eligibilityConfig = encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "bytes32" },
          { type: "uint32" },
          { type: "uint256" },
          { type: "address" },
        ],
        [tree.root, snapshotId, 4, chainId, host.address],
      );
      const params = {
        hostProposalId: keccak256(stringToHex("host-proposal-1")),
        actionHash: keccak256(stringToHex("committed-action-1")),
        eligibilityStrategy: merkleStrategy.address,
        eligibilityConfig,
        snapshot: 90,
        voteStart: 100,
        voteEnd: 110,
        privacyFloor: 4,
        maxReplacements: 2,
      } as const;

      await writeAndWait(host.write.setClock([90n]), publicClient);
      const ballotId = (await core.read.computeBallotId([params])) as Hex;
      await writeAndWait(host.write.register([params]), publicClient);
      await writeAndWait(host.write.setQuorum([7n]), publicClient);
      await writeAndWait(host.write.setClock([101n]), publicClient);

      const graphFromBlock = await publicClient.getBlockNumber();
      const submittedHandles: Hex[] = [];
      const initialChoices = [0n, 1n, 0n, 65_535n] as const;
      for (let index = 0; index < voters.length; index += 1) {
        const wallet = [voterA, voterB, voterC, voterD][index];
        const encrypted = await encryptChoice({
          wallet,
          choice: initialChoices[index],
          coreAddress,
          noxComputeAddress,
          handleGatewayUrl,
        });
        submittedHandles.push(encrypted.handle);
        const voterCore = await connection.viem.getContractAt(
          "ConfidentialBallotCore",
          coreAddress,
          { client: { public: publicClient, wallet } },
        );
        const eligibilityProof = encodeAbiParameters(
          [{ type: "uint256" }, { type: "bytes32[]" }],
          [weights[index], tree.proofs[index]],
        );
        await writeAndWait(
          voterCore.write.castVote([
            ballotId,
            1n,
            encrypted.handle,
            encrypted.handleProof,
            eligibilityProof,
          ]),
          publicClient,
        );
      }

      // A moves Against(4) -> Abstain(4) -> For(4). The final result can only
      // pass if both prior contributions are removed from the encrypted total.
      const voterACore = await connection.viem.getContractAt(
        "ConfidentialBallotCore",
        coreAddress,
        { client: { public: publicClient, wallet: voterA } },
      );
      for (const [sequence, choice] of [
        [2n, 2n],
        [3n, 1n],
      ] as const) {
        const encrypted = await encryptChoice({
          wallet: voterA,
          choice,
          coreAddress,
          noxComputeAddress,
          handleGatewayUrl,
        });
        submittedHandles.push(encrypted.handle);
        await writeAndWait(
          voterACore.write.castVote([
            ballotId,
            sequence,
            encrypted.handle,
            encrypted.handleProof,
            "0x",
          ]),
          publicClient,
        );
      }

      const record = await core.read.ballot([ballotId]);
      const receiptA = await core.read.receipt([
        ballotId,
        voterA.account.address,
      ]);
      assert.equal(record.recordedVoters, 4);
      assert.equal(record.recordedWeight, 10n);
      assert.equal(receiptA.sequence, 3n);
      assert.equal(receiptA.replacementsUsed, 2);

      await writeAndWait(host.write.setClock([111n]), publicClient);
      const proofStartedAt = performance.now();
      await writeAndWait(core.write.requestTally([ballotId]), publicClient);

      const verdictHandle = await core.read.expectedVerdictHandle([ballotId]);
      assert.notEqual(verdictHandle, `0x${"00".repeat(32)}`);
      const publicResult = await waitForPublicVerdict(
        noxConnection,
        verdictHandle as Handle<"bool">,
      );
      const closeToProofMs = Math.round(performance.now() - proofStartedAt);
      assert.equal(publicResult.solidityType, "bool");
      assert.equal(publicResult.value, true);

      await writeAndWait(
        core.write.finalize([ballotId, publicResult.decryptionProof]),
        publicClient,
      );
      assert.equal(await core.read.result([ballotId]), 3);
      assert.equal(await core.read.detailedState([ballotId]), 7);

      for (const handle of submittedHandles) {
        assert.equal(
          await publicClient.readContract({
            address: noxComputeAddress,
            abi: noxAclAbi,
            functionName: "isAllowed",
            args: [handle, coreAddress],
          }),
          true,
        );
        assert.equal(
          await publicClient.readContract({
            address: noxComputeAddress,
            abi: noxAclAbi,
            functionName: "isPubliclyDecryptable",
            args: [handle],
          }),
          false,
        );
      }

      const publicEvents = await publicClient.getLogs({
        address: noxComputeAddress,
        event: parseAbiItem(
          "event MarkedAsPubliclyDecryptable(address indexed sender, bytes32 indexed handle)",
        ),
        args: { sender: coreAddress },
        fromBlock: graphFromBlock,
      });
      const viewerEvents = await publicClient.getLogs({
        address: noxComputeAddress,
        event: parseAbiItem(
          "event ViewerAdded(address indexed sender, address indexed viewer, bytes32 indexed handle)",
        ),
        args: { sender: coreAddress },
        fromBlock: graphFromBlock,
      });
      const allowedEvents = await publicClient.getLogs({
        address: noxComputeAddress,
        event: parseAbiItem(
          "event Allowed(address indexed sender, address indexed account, bytes32 indexed handle)",
        ),
        args: { sender: coreAddress },
        fromBlock: graphFromBlock,
      });
      assert.equal(publicEvents.length, 1);
      assert.equal(publicEvents[0].args.handle, verdictHandle);
      assert.equal(viewerEvents.length, 0);
      assert.ok(allowedEvents.length > 0);
      assert.ok(
        allowedEvents.every((event) => event.args.account === coreAddress),
      );

      console.info(
        `production-core metrics: submittedOperations=${submittedHandles.length} closeToProofMs=${closeToProofMs} elapsedMs=${Math.round(performance.now() - startedAt)}`,
      );
    },
  );
});

function eligibilityLeaf(
  chainId: bigint,
  host: Address,
  snapshotId: Hex,
  voter: Address,
  weight: bigint,
): Hex {
  const inner = keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "uint256" },
        { type: "address" },
        { type: "bytes32" },
        { type: "address" },
        { type: "uint256" },
      ],
      [eligibilityLeafTypehash, chainId, host, snapshotId, voter, weight],
    ),
  );
  return keccak256(inner);
}

function buildFourLeafTree(leaves: readonly Hex[]): {
  root: Hex;
  proofs: readonly [
    readonly Hex[],
    readonly Hex[],
    readonly Hex[],
    readonly Hex[],
  ];
} {
  assert.equal(leaves.length, 4);
  const left = hashPair(leaves[0], leaves[1]);
  const right = hashPair(leaves[2], leaves[3]);
  return {
    root: hashPair(left, right),
    proofs: [
      [leaves[1], right],
      [leaves[0], right],
      [leaves[3], left],
      [leaves[2], left],
    ],
  };
}

function hashPair(left: Hex, right: Hex): Hex {
  const [first, second] = left < right ? [left, right] : [right, left];
  return keccak256(concatHex([first, second]));
}

async function encryptChoice({
  wallet,
  choice,
  coreAddress,
  noxComputeAddress,
  handleGatewayUrl,
}: {
  wallet: WalletClient & { account: { address: Address } };
  choice: bigint;
  coreAddress: Address;
  noxComputeAddress: Address;
  handleGatewayUrl: string;
}) {
  const handleClient = await createViemHandleClient(
    scopeWalletForHandleSdk(wallet),
    {
      smartContractAddress: noxComputeAddress,
      gatewayUrl: handleGatewayUrl as `http://${string}`,
      subgraphUrl: "https://example.com/subgraphs/id/none",
    },
  );
  return handleClient.encryptInput(choice, "uint16", coreAddress);
}

async function waitForPublicVerdict(
  noxConnection: Awaited<ReturnType<typeof nox.connect>>,
  handle: Handle<"bool">,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return await noxConnection.publicDecrypt(handle);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

function scopeWalletForHandleSdk<
  Wallet extends WalletClient & { account: { address: Address } },
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

async function writeAndWait(
  hashPromise: Promise<Hex>,
  publicClient: {
    waitForTransactionReceipt(args: { hash: Hex }): Promise<unknown>;
  },
) {
  const hash = await hashPromise;
  return publicClient.waitForTransactionReceipt({ hash });
}

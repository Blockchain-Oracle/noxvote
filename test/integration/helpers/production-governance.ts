import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createViemHandleClient, type Handle } from "@iexec-nox/handle";
import { nox } from "@iexec-nox/nox-hardhat-plugin";
import { network } from "hardhat";
import {
  concatHex,
  encodeAbiParameters,
  getContract,
  keccak256,
  padHex,
  stringToHex,
  zeroAddress,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import multiSendArtifact from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json" with { type: "json" };
import safeArtifact from "@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json" with { type: "json" };
import safeProxyArtifact from "@safe-global/safe-smart-account/build/artifacts/contracts/proxies/SafeProxy.sol/SafeProxy.json" with { type: "json" };

export type Connection = Awaited<ReturnType<typeof network.getOrCreate>>;
export type AccountWallet = WalletClient & {
  account: { address: Address };
};

export const zeroHandle = `0x${"00".repeat(32)}` as const;
export const eligibilityLeafTypehash = keccak256(
  stringToHex(
    "ConfidentialVotingEligibility(uint256 chainId,address host,bytes32 snapshotId,address voter,uint256 weight)",
  ),
);

export async function deployProductionFactory(
  connection: Connection,
  deployer: AccountWallet,
) {
  const publicClient = await connection.viem.getPublicClient();
  const multiSendHash = await deployer.deployContract({
    account: deployer.account,
    chain: deployer.chain,
    abi: multiSendArtifact.abi as Abi,
    bytecode: multiSendArtifact.bytecode as Hex,
  });
  const multiSendReceipt = await publicClient.waitForTransactionReceipt({
    hash: multiSendHash,
  });
  assert.ok(multiSendReceipt.contractAddress);
  const factory = await connection.viem.deployContract(
    "ConfidentialGovernanceFactory",
    [multiSendReceipt.contractAddress],
  );
  const safeModuleCreationCode = await readFoundryCreationCode(
    "SafeConfidentialVotingModule.sol",
    "SafeConfidentialVotingModule",
  );
  const governorCreationCode = await readFoundryCreationCode(
    "ConfidentialGovernor.sol",
    "ConfidentialGovernor",
  );
  const timelockCreationCode = await readFoundryCreationCode(
    "TimelockController.sol",
    "TimelockController",
  );

  assert.equal(
    await factory.read.SAFE_MODULE_CREATION_CODE_HASH(),
    keccak256(safeModuleCreationCode),
  );
  assert.equal(
    await factory.read.GOVERNOR_CREATION_CODE_HASH(),
    keccak256(governorCreationCode),
  );
  assert.equal(
    await factory.read.TIMELOCK_CREATION_CODE_HASH(),
    keccak256(timelockCreationCode),
  );

  return {
    factory,
    multiSendCallOnly: multiSendReceipt.contractAddress,
    safeModuleCreationCode,
    governorCreationCode,
    timelockCreationCode,
  };
}

export async function deployOfficialSafe(
  owner: AccountWallet,
  publicClient: PublicClient,
) {
  const safeAbi = safeArtifact.abi as Abi;
  const singletonHash = await owner.deployContract({
    account: owner.account,
    chain: owner.chain,
    abi: safeAbi,
    bytecode: safeArtifact.bytecode as Hex,
  });
  const singletonReceipt = await publicClient.waitForTransactionReceipt({
    hash: singletonHash,
  });
  assert.ok(singletonReceipt.contractAddress);

  const proxyHash = await owner.deployContract({
    account: owner.account,
    chain: owner.chain,
    abi: safeProxyArtifact.abi as Abi,
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
  await writeAndWait(
    safe.write.setup([
      [owner.account.address],
      1n,
      zeroAddress,
      "0x",
      zeroAddress,
      zeroAddress,
      0n,
      zeroAddress,
    ]),
    publicClient,
  );
  return safe;
}

export async function executeSafeCall({
  safe,
  owner,
  publicClient,
  to,
  data,
}: {
  safe: Awaited<ReturnType<typeof deployOfficialSafe>>;
  owner: AccountWallet;
  publicClient: PublicClient;
  to: Address;
  data: Hex;
}) {
  const ownerSignature = concatHex([
    padHex(owner.account.address, { size: 32 }),
    zeroHandle,
    "0x01",
  ]);
  return writeAndWait(
    safe.write.execTransaction([
      to,
      0n,
      data,
      0,
      0n,
      0n,
      0n,
      zeroAddress,
      zeroAddress,
      ownerSignature,
    ]),
    publicClient,
  );
}

export async function encryptChoice({
  wallet,
  choice,
  coreAddress,
  noxComputeAddress,
  handleGatewayUrl,
}: {
  wallet: AccountWallet;
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

export async function waitForPublicVerdict(
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

export function buildFourWalletMerkleConfig({
  chainId,
  host,
  snapshotId,
  voters,
  weights,
}: {
  chainId: bigint;
  host: Address;
  snapshotId: Hex;
  voters: readonly [Address, Address, Address, Address];
  weights: readonly [bigint, bigint, bigint, bigint];
}) {
  const leaves = voters.map((voter, index) =>
    eligibilityLeaf(chainId, host, snapshotId, voter, weights[index]),
  ) as [Hex, Hex, Hex, Hex];
  const left = hashPair(leaves[0], leaves[1]);
  const right = hashPair(leaves[2], leaves[3]);
  const proofs = [
    [leaves[1], right],
    [leaves[0], right],
    [leaves[3], left],
    [leaves[2], left],
  ] as const;
  return {
    eligibilityConfig: encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "uint32" },
        { type: "uint256" },
        { type: "address" },
      ],
      [hashPair(left, right), snapshotId, 4, chainId, host],
    ),
    proofs,
  };
}

export async function writeAndWait(
  hashPromise: Promise<Hex>,
  publicClient: {
    waitForTransactionReceipt(args: { hash: Hex }): Promise<unknown>;
  },
) {
  const hash = await hashPromise;
  return publicClient.waitForTransactionReceipt({ hash });
}

function eligibilityLeaf(
  chainId: bigint,
  host: Address,
  snapshotId: Hex,
  voter: Address,
  weight: bigint,
): Hex {
  return keccak256(
    keccak256(
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
    ),
  );
}

function hashPair(left: Hex, right: Hex): Hex {
  const [first, second] = left < right ? [left, right] : [right, left];
  return keccak256(concatHex([first, second]));
}

function scopeWalletForHandleSdk<Wallet extends AccountWallet>(
  wallet: Wallet,
): Wallet {
  return new Proxy(wallet, {
    get(target, property, receiver) {
      if (property === "getAddresses") {
        return async () => [target.account.address];
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

async function readFoundryCreationCode(
  sourceName: string,
  contractName: string,
): Promise<Hex> {
  const artifactPath = path.resolve(
    process.cwd(),
    "out",
    sourceName,
    `${contractName}.json`,
  );
  const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
    bytecode: { object: Hex };
  };
  return artifact.bytecode.object;
}

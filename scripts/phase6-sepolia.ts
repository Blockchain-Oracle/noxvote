import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createViemHandleClient, type Handle } from "@iexec-nox/handle";
import {
  concatHex,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  getAddress,
  http,
  isAddressEqual,
  isHex,
  keccak256,
  padHex,
  parseAbi,
  parseEther,
  parseEventLogs,
  stringToHex,
  zeroAddress,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const DEFAULT_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const EVIDENCE_PATH = path.resolve(
  process.cwd(),
  "deployments/sepolia/phase6-live.json",
);

const NOX_COMPUTE = getAddress("0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf");
const HANDLE_GATEWAY_URL = "https://gateway-testnets.noxprotocol.dev";
const NOX_SUBGRAPH_URL =
  "https://thegraph.ethereum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/9CsccKwvgYFo72zZeU4k4wj2NEBLdWhVE3EUandgmzgo";
const NOX_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

const SAFE_SINGLETON = getAddress("0xFf51A5898e281Db6DfC7855790607438dF2ca44b");
const SAFE_PROXY_FACTORY = getAddress(
  "0x14F2982D601c9458F93bd70B218933A6f8165e7b",
);
const MULTI_SEND_CALL_ONLY = getAddress(
  "0xA83c336B20401Af773B6219BA5027174338D1836",
);
const COMPATIBILITY_FALLBACK_HANDLER = getAddress(
  "0x3EfCBb83A4A7AfcB4F68D501E2c2203a38be77f4",
);

const EXPECTED_CODE_HASHES = {
  noxProxy:
    "0x9051c2db7e8a643e765dbe24abc6661bcd78bcd849f9e1f83bf5a59e95dd7438",
  noxImplementation:
    "0x2353cc148349b7dda236c6dc2e66735db4138a4d7498765729bc01fb121f4256",
  safeSingleton:
    "0xdda019cbd7c867a533a2a86e5c53434fdc50b13122b5a5ddb4a8df61b31c20f2",
  safeProxyFactory:
    "0x967dae4cda22b0c9ef7f31b010bdc1ceb0af9904b0c3dc060b5302e4c18a4529",
  multiSendCallOnly:
    "0xcdbdcec38d2f1c7d961b0029ff8416b7e86e9974d6f0e9c9580c7d17fcfb6663",
  compatibilityFallbackHandler:
    "0x3c6a85bcf7b563daa624b884b4e9a1b9fa5371edde7be945d998071a48f28bbc",
} as const satisfies Record<string, Hex>;

const EXPECTED_NOX_IMPLEMENTATION = getAddress(
  "0xc9B5D2e99e45dc652b3B90bA5FA79667ACFEb819",
);
const EXPECTED_NOX_GATEWAY_SIGNER = getAddress(
  "0xE13191F53671957C8a48A7A3Ff15E16450a1552F",
);
const EXPECTED_NOX_PROOF_EXPIRATION_SECONDS = 3_600n;
const SAFE_VOTING_WINDOW_SECONDS = 600n;
const GOVERNOR_VOTING_PERIOD_BLOCKS = 60;
// The live graph's heavy local measurements are ~8.7m gas for the Governor
// stack and ~4.1m gas for the Safe module/core pair. These actor-scoped
// budgets retain headroom for the remaining deployments and proof lifecycle
// calls without requiring a blanket quarter-ETH testnet balance.
const DEPLOYER_GAS_BUDGET = 25_000_000n;
const VOTER_GAS_BUDGET = 3_000_000n;
const MINIMUM_VOTER_BALANCE = parseEther("0.003");
const MINIMUM_DEPLOYER_BALANCE = parseEther("0.045");
const RESUME_BALANCE_BUFFER = parseEther("0.003");
const EXPECTED_FACTORY_CREATION_HASHES = {
  factory: "0x8081bb2add253ccced934d38eddb3d9724c5ee377560670c41707ee7f70f9644",
  safeModule:
    "0xf2db65301dd9ad0ee89d4832aa13eb9b45bf7f0c274c7f6155f8e4b824d88a7c",
  governor:
    "0x571bb7cca27e83bde00bd212859994dfcf65f52084eafd5ab21900e394895dbd",
  timelock:
    "0x47f65cb680d9975a35852ab37b8bbb0619387b78478d26ceb9a703b29eead293",
} as const satisfies Record<string, Hex>;

const NOX_ABI = parseAbi([
  "function gateway() view returns (address)",
  "function proofExpirationDuration() view returns (uint256)",
  "function isPubliclyDecryptable(bytes32 handle) view returns (bool)",
]);
const SAFE_MODULE_MANAGER_ABI = parseAbi([
  "function enableModule(address module)",
]);
const TIMELOCK_ABI = parseAbi([
  "function PROPOSER_ROLE() view returns (bytes32)",
  "function CANCELLER_ROLE() view returns (bytes32)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function getMinDelay() view returns (uint256)",
]);

const zeroHandle = `0x${"00".repeat(32)}` as const;
const eligibilityLeafTypehash = keccak256(
  stringToHex(
    "ConfidentialVotingEligibility(uint256 chainId,address host,bytes32 snapshotId,address voter,uint256 weight)",
  ),
);

interface ContractArtifact {
  abi: Abi;
  bytecode: Hex;
  deployedBytecode?: Hex;
}

interface PreflightReport {
  checkedAt: string;
  chainId: number;
  blockNumber: string;
  blockTimestamp: string;
  gasPrice: string;
  dependencies: {
    noxCompute: Address;
    noxProxyCodeHash: Hex;
    noxImplementation: Address;
    noxImplementationCodeHash: Hex;
    noxGatewaySigner: Address;
    noxProofExpirationSeconds: string;
    handleGatewayUrl: string;
    handleGatewayStatus: number;
    subgraphUrl: string;
    subgraphStatus: number;
    subgraphBlock: string;
    safeSingleton: Address;
    safeProxyFactory: Address;
    multiSendCallOnly: Address;
    compatibilityFallbackHandler: Address;
    safeCodeHashes: Record<string, Hex>;
  };
  localCreationCodeHashes: Record<string, Hex>;
  sourceCommits: Record<string, string>;
}

interface AbandonedProof {
  attempt: number;
  proposalId: string;
  ballotId?: Hex;
  abandonedAt: string;
  reason: string;
}

interface Phase6Evidence {
  schemaVersion: 2;
  status: "in_progress" | "complete";
  startedAt: string;
  completedAt?: string;
  runId: Hex;
  chainId: 11155111;
  deployer: Address;
  voters: [Address, Address, Address, Address];
  preflight: PreflightReport;
  transactions: Record<string, Hex>;
  contracts: Record<string, Address>;
  safeProof?: {
    attempt: number;
    proposalId: Hex;
    ballotId?: Hex;
    voteStart: string;
    voteEnd: string;
    verdictHandle?: Hex;
    verdict?: boolean;
    executedValue?: string;
  };
  governorProof?: {
    attempt: number;
    proposalId: string;
    description: string;
    ballotId?: Hex;
    snapshot?: string;
    deadline?: string;
    verdictHandle?: Hex;
    verdict?: boolean;
    executedValue?: string;
  };
  abandonedProofs: {
    safe: AbandonedProof[];
    governor: AbandonedProof[];
  };
}

interface Artifacts {
  factory: ContractArtifact;
  safeModule: ContractArtifact;
  core: ContractArtifact;
  governor: ContractArtifact;
  token: ContractArtifact;
  target: ContractArtifact;
  safe: ContractArtifact;
  safeProxyFactory: ContractArtifact;
  factoryCreationCode: Hex;
  safeModuleCreationCode: Hex;
  governorCreationCode: Hex;
  timelockCreationCode: Hex;
}

type AccountWallet = ReturnType<typeof createAccountWallet>;

const rpcUrl = process.env.PHASE6_SEPOLIA_RPC_URL ?? DEFAULT_RPC_URL;
const execute = process.argv.includes("--execute");
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl, { timeout: 30_000 }),
});

const artifacts = await loadArtifacts();
const preflight = await runPreflight(publicClient, artifacts);
console.info(JSON.stringify({ phase6Preflight: preflight }, null, 2));

const showAccount = process.argv.includes("--account");
assert.equal(
  execute && showAccount,
  false,
  "Choose either --account or --execute, not both",
);

if (showAccount) {
  await reportPhase6Account(publicClient, preflight);
} else if (!execute) {
  console.info(
    "Phase 6 preflight passed. No transaction was signed or broadcast. Use pnpm phase6:execute only with the dedicated funded deployer configured.",
  );
} else {
  await executePhase6(publicClient, artifacts, preflight);
}

async function runPreflight(
  client: PublicClient,
  loadedArtifacts: Artifacts,
): Promise<PreflightReport> {
  const chainId = await client.getChainId();
  assert.equal(chainId, sepolia.id, "RPC is not Ethereum Sepolia");
  const block = await client.getBlock();
  const gasPrice = await client.getGasPrice();

  const noxProxyCodeHash = await requireCodeHash(client, NOX_COMPUTE);
  assert.equal(noxProxyCodeHash, EXPECTED_CODE_HASHES.noxProxy);
  const implementationWord = await client.getStorageAt({
    address: NOX_COMPUTE,
    slot: NOX_IMPLEMENTATION_SLOT,
  });
  assert.ok(implementationWord, "Nox implementation slot is empty");
  const noxImplementation = getAddress(`0x${implementationWord.slice(-40)}`);
  assert.equal(noxImplementation, EXPECTED_NOX_IMPLEMENTATION);
  const noxImplementationCodeHash = await requireCodeHash(
    client,
    noxImplementation,
  );
  assert.equal(
    noxImplementationCodeHash,
    EXPECTED_CODE_HASHES.noxImplementation,
  );
  const [noxGatewaySigner, noxProofExpiration] = await Promise.all([
    client.readContract({
      address: NOX_COMPUTE,
      abi: NOX_ABI,
      functionName: "gateway",
    }),
    client.readContract({
      address: NOX_COMPUTE,
      abi: NOX_ABI,
      functionName: "proofExpirationDuration",
    }),
  ]);
  assert.equal(
    getAddress(noxGatewaySigner),
    EXPECTED_NOX_GATEWAY_SIGNER,
    "Nox Gateway signer changed",
  );
  assert.equal(
    noxProofExpiration,
    EXPECTED_NOX_PROOF_EXPIRATION_SECONDS,
    "Nox proof expiration changed",
  );

  const safeAddresses = {
    safeSingleton: SAFE_SINGLETON,
    safeProxyFactory: SAFE_PROXY_FACTORY,
    multiSendCallOnly: MULTI_SEND_CALL_ONLY,
    compatibilityFallbackHandler: COMPATIBILITY_FALLBACK_HANDLER,
  } as const;
  const safeCodeHashes = Object.fromEntries(
    await Promise.all(
      Object.entries(safeAddresses).map(async ([name, address]) => [
        name,
        await requireCodeHash(client, address),
      ]),
    ),
  ) as Record<string, Hex>;
  for (const [name, expectedHash] of Object.entries(EXPECTED_CODE_HASHES)) {
    if (name.startsWith("nox")) continue;
    assert.equal(safeCodeHashes[name], expectedHash, `${name} code changed`);
  }

  const [gatewayResponse, subgraphResponse] = await Promise.all([
    fetch(HANDLE_GATEWAY_URL, { signal: AbortSignal.timeout(15_000) }),
    fetch(NOX_SUBGRAPH_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ _meta { block { number } } }" }),
      signal: AbortSignal.timeout(15_000),
    }),
  ]);
  assert.ok(gatewayResponse.ok, "Handle Gateway health check failed");
  assert.ok(subgraphResponse.ok, "Nox subgraph health check failed");
  const subgraphBody = (await subgraphResponse.json()) as {
    data?: { _meta?: { block?: { number?: number } } };
  };
  const subgraphBlock = subgraphBody.data?._meta?.block?.number;
  assert.ok(subgraphBlock !== undefined, "Subgraph omitted block metadata");

  const localCreationCodeHashes = {
    factory: keccak256(loadedArtifacts.factoryCreationCode),
    safeModule: keccak256(loadedArtifacts.safeModuleCreationCode),
    governor: keccak256(loadedArtifacts.governorCreationCode),
    timelock: keccak256(loadedArtifacts.timelockCreationCode),
  };
  assert.deepEqual(localCreationCodeHashes, EXPECTED_FACTORY_CREATION_HASHES);

  return {
    checkedAt: new Date().toISOString(),
    chainId,
    blockNumber: block.number.toString(),
    blockTimestamp: block.timestamp.toString(),
    gasPrice: gasPrice.toString(),
    dependencies: {
      noxCompute: NOX_COMPUTE,
      noxProxyCodeHash,
      noxImplementation,
      noxImplementationCodeHash,
      noxGatewaySigner,
      noxProofExpirationSeconds: noxProofExpiration.toString(),
      handleGatewayUrl: HANDLE_GATEWAY_URL,
      handleGatewayStatus: gatewayResponse.status,
      subgraphUrl: NOX_SUBGRAPH_URL,
      subgraphStatus: subgraphResponse.status,
      subgraphBlock: subgraphBlock.toString(),
      safeSingleton: SAFE_SINGLETON,
      safeProxyFactory: SAFE_PROXY_FACTORY,
      multiSendCallOnly: MULTI_SEND_CALL_ONLY,
      compatibilityFallbackHandler: COMPATIBILITY_FALLBACK_HANDLER,
      safeCodeHashes,
    },
    localCreationCodeHashes,
    sourceCommits: {
      noxProtocolContracts: "688c965dff38c1b86a1cf49ebc1263873b9d9645",
      noxHandleSdk: "b1cbfade5ea51b1ce54b51f5d9ad8e49fa8c7f5e",
      noxDocumentation: "e21835571131bf574376610c4be15902cd4752b9",
      safeDeployments: "9f5c7a4259fdd03fd63fa5a57d3d9802cb38ad12",
    },
  };
}

function requireDeployerPrivateKey(): Hex {
  const privateKey = process.env.PHASE6_DEPLOYER_PRIVATE_KEY;
  assert.ok(
    privateKey && isHex(privateKey) && privateKey.length === 66,
    "PHASE6_DEPLOYER_PRIVATE_KEY must be one 32-byte 0x-prefixed key",
  );
  return privateKey;
}

function voterFundingTarget(report: PreflightReport) {
  const dynamicTarget = BigInt(report.gasPrice) * VOTER_GAS_BUDGET;
  return dynamicTarget > MINIMUM_VOTER_BALANCE
    ? dynamicTarget
    : MINIMUM_VOTER_BALANCE;
}

function requiredDeployerBalance(report: PreflightReport) {
  const dynamicBudget =
    BigInt(report.gasPrice) * DEPLOYER_GAS_BUDGET +
    4n * voterFundingTarget(report);
  return dynamicBudget > MINIMUM_DEPLOYER_BALANCE
    ? dynamicBudget
    : MINIMUM_DEPLOYER_BALANCE;
}

async function requiredResumeBalance(
  client: PublicClient,
  state: Phase6Evidence,
  report: PreflightReport,
) {
  const receiptResults = await Promise.allSettled(
    Object.values(state.transactions).map((hash) =>
      client.getTransactionReceipt({ hash }),
    ),
  );
  const consumedDeployerGas = receiptResults.reduce(
    (total, result) =>
      result.status === "fulfilled" &&
      isAddressEqual(result.value.from, state.deployer)
        ? total + result.value.gasUsed
        : total,
    0n,
  );
  const remainingDeployerGas =
    consumedDeployerGas >= DEPLOYER_GAS_BUDGET
      ? 0n
      : DEPLOYER_GAS_BUDGET - consumedDeployerGas;
  const voterTarget = voterFundingTarget(report);
  const voterBalances = await Promise.all(
    state.voters.map((address) => client.getBalance({ address })),
  );
  const remainingVoterFunding = voterBalances.reduce(
    (total, balance) =>
      total + (balance < voterTarget ? voterTarget - balance : 0n),
    0n,
  );
  return (
    BigInt(report.gasPrice) * remainingDeployerGas +
    remainingVoterFunding +
    RESUME_BALANCE_BUFFER
  );
}

async function reportPhase6Account(
  client: PublicClient,
  report: PreflightReport,
) {
  const privateKey = requireDeployerPrivateKey();
  const deployer = privateKeyToAccount(privateKey);
  const voters = [0, 1, 2, 3].map((index) =>
    deriveVoterAccount(privateKey, index),
  );
  const voterAddresses = voters.map((voter) => voter.address) as [
    Address,
    Address,
    Address,
    Address,
  ];
  const state = await loadOrCreateEvidence(
    deployer.address,
    voterAddresses,
    report,
  );
  const isResume = Object.keys(state.transactions).length > 0;
  const balance = await client.getBalance({ address: deployer.address });
  const requiredBalance = isResume
    ? await requiredResumeBalance(client, state, report)
    : requiredDeployerBalance(report);
  console.info(
    JSON.stringify(
      {
        phase6Account: {
          deployer: deployer.address,
          voters: voterAddresses,
          resumeCheckpoint: isResume,
          balanceWei: balance.toString(),
          balanceSepoliaEth: formatEther(balance),
          requiredBalanceWei: requiredBalance.toString(),
          requiredBalanceSepoliaEth: formatEther(requiredBalance),
          sufficientlyFunded: balance >= requiredBalance,
        },
      },
      null,
      2,
    ),
  );
  console.info(
    "Account inspection passed. No transaction was signed or broadcast and no deployment evidence was written.",
  );
}

async function executePhase6(
  client: PublicClient,
  loadedArtifacts: Artifacts,
  report: PreflightReport,
) {
  const privateKey = requireDeployerPrivateKey();
  const deployerAccount = privateKeyToAccount(privateKey);
  const voterAccounts = [0, 1, 2, 3].map((index) =>
    deriveVoterAccount(privateKey, index),
  ) as [
    PrivateKeyAccount,
    PrivateKeyAccount,
    PrivateKeyAccount,
    PrivateKeyAccount,
  ];
  const deployer = createAccountWallet(deployerAccount);
  const voters = voterAccounts.map(createAccountWallet) as [
    AccountWallet,
    AccountWallet,
    AccountWallet,
    AccountWallet,
  ];

  const state = await loadOrCreateEvidence(
    deployerAccount.address,
    voterAccounts.map((account) => account.address) as [
      Address,
      Address,
      Address,
      Address,
    ],
    report,
  );
  state.preflight = report;
  await saveEvidence(state);

  const deployerBalance = await client.getBalance({
    address: deployerAccount.address,
  });
  const isResume = Object.keys(state.transactions).length > 0;
  const requiredBalance = isResume
    ? await requiredResumeBalance(client, state, report)
    : requiredDeployerBalance(report);
  assert.ok(
    deployerBalance >= requiredBalance,
    `Dedicated deployer ${deployerAccount.address} has ${formatEther(deployerBalance)} Sepolia ETH; at least ${formatEther(requiredBalance)} is required by the current gas/funding gate`,
  );
  console.info(
    `Phase 6 execute enabled for ${deployerAccount.address}; balance=${formatEther(deployerBalance)} Sepolia ETH; resume=${isResume}`,
  );

  await fundVoters(client, deployer, voters, state, report);
  const context = {
    client,
    deployer,
    voters,
    state,
    artifacts: loadedArtifacts,
  };
  await deployBaseGraph(context);
  await runSafeProof(context);
  await runGovernorProof(context);

  state.status = "complete";
  state.completedAt = new Date().toISOString();
  await saveEvidence(state);
  console.info(
    `Phase 6 complete. Public evidence checkpoint: ${EVIDENCE_PATH}`,
  );
}

async function deployBaseGraph(context: ExecutionContext) {
  const {
    client,
    deployer,
    voters,
    state,
    artifacts: loadedArtifacts,
  } = context;
  const factory = await deployArtifact(
    "factory",
    loadedArtifacts.factory,
    [MULTI_SEND_CALL_ONLY],
    context,
  );

  const safe = await deploySafe(context);
  if (!state.contracts.safeModule || !state.contracts.safeCore) {
    const receipt = await transact(
      "deploySafeModule",
      () =>
        deployer.writeContract({
          account: deployer.account,
          chain: sepolia,
          address: factory,
          abi: loadedArtifacts.factory.abi,
          functionName: "deploySafeModule",
          args: [safe, 4, loadedArtifacts.safeModuleCreationCode],
        } as never),
      context,
    );
    const event = findEvent(
      receipt,
      loadedArtifacts.factory.abi,
      "SafeModuleDeployed",
    );
    state.contracts.safeModule = event.module as Address;
    state.contracts.safeCore = event.core as Address;
    state.contracts.ivotesSnapshotStrategy =
      event.ivotesSnapshotStrategy as Address;
    state.contracts.merkleWeightedAllowlistStrategy =
      event.merkleWeightedAllowlistStrategy as Address;
    await saveEvidence(state);
  }
  await requireContract(client, state.contracts.safeModule);
  await requireContract(client, state.contracts.safeCore);

  const moduleEnabled = await client.readContract({
    address: safe,
    abi: loadedArtifacts.safe.abi,
    functionName: "isModuleEnabled",
    args: [state.contracts.safeModule],
  } as never);
  if (!moduleEnabled) {
    await executeSafeTransaction(
      "enableSafeModule",
      safe,
      safe,
      encodeFunctionData({
        abi: SAFE_MODULE_MANAGER_ABI,
        functionName: "enableModule",
        args: [state.contracts.safeModule],
      }),
      context,
    );
  }
  assert.equal(
    await client.readContract({
      address: safe,
      abi: loadedArtifacts.safe.abi,
      functionName: "isModuleEnabled",
      args: [state.contracts.safeModule],
    } as never),
    true,
  );

  const token = await deployArtifact(
    "votesToken",
    loadedArtifacts.token,
    [],
    context,
  );
  const weights = [4n, 3n, 2n, 1n] as const;
  for (let index = 0; index < voters.length; index += 1) {
    const voter = voters[index];
    const balance = (await client.readContract({
      address: token,
      abi: loadedArtifacts.token.abi,
      functionName: "balanceOf",
      args: [voter.account.address],
    } as never)) as bigint;
    if (balance < weights[index]) {
      await writeContract(
        `mintVoter${index}`,
        deployer,
        token,
        loadedArtifacts.token.abi,
        "mint",
        [voter.account.address, weights[index] - balance],
        context,
      );
    }
    const delegate = (await client.readContract({
      address: token,
      abi: loadedArtifacts.token.abi,
      functionName: "delegates",
      args: [voter.account.address],
    } as never)) as Address;
    if (!isAddressEqual(delegate, voter.account.address)) {
      await writeContract(
        `delegateVoter${index}`,
        voter,
        token,
        loadedArtifacts.token.abi,
        "delegate",
        [voter.account.address],
        context,
      );
    }
  }

  if (!state.contracts.governor) {
    const receipt = await transact(
      "deployGovernorStack",
      () =>
        deployer.writeContract({
          account: deployer.account,
          chain: sepolia,
          address: factory,
          abi: loadedArtifacts.factory.abi,
          functionName: "deployGovernor",
          args: [
            {
              name: "Production Nox Governor — Sepolia Phase 6",
              token,
              timelockMinDelay: 30n,
              initialVotingDelay: 1,
              initialVotingPeriod: GOVERNOR_VOTING_PERIOD_BLOCKS,
              initialProposalThreshold: 0n,
              initialQuorumNumerator: 50n,
              minimumPrivacyFloor: 4,
            },
            loadedArtifacts.governorCreationCode,
            loadedArtifacts.timelockCreationCode,
          ],
        } as never),
      context,
    );
    const event = findEvent(
      receipt,
      loadedArtifacts.factory.abi,
      "GovernorStackDeployed",
    );
    state.contracts.governor = event.governor as Address;
    state.contracts.timelock = event.timelock as Address;
    state.contracts.governorCore = event.core as Address;
    await saveEvidence(state);
  }
  await requireContract(client, state.contracts.governor);
  await requireContract(client, state.contracts.timelock);
  await requireContract(client, state.contracts.governorCore);
  await verifyTimelockRoles(context);
}

async function runSafeProof(context: ExecutionContext) {
  const { client, voters, state, artifacts: loadedArtifacts } = context;
  const safe = state.contracts.safe;
  const module = state.contracts.safeModule;
  const core = state.contracts.safeCore;
  const target = await deployArtifact(
    "safeExecutionTarget",
    loadedArtifacts.target,
    [],
    context,
  );
  const actionData = encodeFunctionData({
    abi: loadedArtifacts.target.abi,
    functionName: "setValue",
    args: [41n],
  } as never);
  const actions = [{ to: target, value: 0n, data: actionData }] as const;

  await recoverExpiredSafeProof(context);
  if (!state.safeProof) {
    const latest = await client.getBlock();
    const proposalNonce = (await client.readContract({
      address: module,
      abi: loadedArtifacts.safeModule.abi,
      functionName: "proposalNonce",
    } as never)) as bigint;
    const proposalId = keccak256(
      encodeAbiParameters(
        [
          { type: "uint256" },
          { type: "address" },
          { type: "address" },
          { type: "uint256" },
        ],
        [BigInt(sepolia.id), module, safe, proposalNonce + 1n],
      ),
    );
    const voteStart = latest.timestamp + 60n;
    state.safeProof = {
      attempt: nextProofAttempt(state.abandonedProofs.safe),
      proposalId,
      voteStart: voteStart.toString(),
      voteEnd: (voteStart + SAFE_VOTING_WINDOW_SECONDS).toString(),
    };
    await saveEvidence(state);
  }

  const attempt = state.safeProof.attempt;
  const voteStart = BigInt(state.safeProof.voteStart);
  const voteEnd = BigInt(state.safeProof.voteEnd);
  const snapshotId = keccak256(stringToHex("phase6-safe-direct"));
  const weights = [4n, 3n, 2n, 1n] as const;
  const voterAddresses = voters.map((wallet) => wallet.account.address) as [
    Address,
    Address,
    Address,
    Address,
  ];
  const { eligibilityConfig, proofs } = buildFourWalletMerkleConfig({
    chainId: BigInt(sepolia.id),
    host: module,
    snapshotId,
    voters: voterAddresses,
    weights,
  });
  const ballotConfig = {
    eligibilityStrategy: state.contracts.merkleWeightedAllowlistStrategy,
    eligibilityConfig,
    snapshot: voteStart - 1n,
    voteStart,
    voteEnd,
    privacyFloor: 4,
    maxReplacements: 2,
    governanceQuorum: 7n,
  } as const;

  let proposal = await readSafeProposal(
    client,
    module,
    state.safeProof.proposalId,
    loadedArtifacts.safeModule.abi,
  );
  if (proposal.ballotId === zeroHandle) {
    await executeSafeTransaction(
      proofTransactionKey("safe", attempt, "register"),
      safe,
      module,
      encodeFunctionData({
        abi: loadedArtifacts.safeModule.abi,
        functionName: "registerProposal",
        args: [actions, ballotConfig],
      } as never),
      context,
    );
    proposal = await readSafeProposal(
      client,
      module,
      state.safeProof.proposalId,
      loadedArtifacts.safeModule.abi,
    );
  }
  assert.notEqual(proposal.ballotId, zeroHandle);
  state.safeProof.ballotId = proposal.ballotId;
  await saveEvidence(state);

  const encryptedVotes = await Promise.all(
    voters.map(async (voter) =>
      (await isVoteRecorded(
        client,
        core,
        loadedArtifacts.core.abi,
        proposal.ballotId,
        voter.account.address,
      ))
        ? undefined
        : encryptChoice(voter, core),
    ),
  );
  await waitForTimestamp(client, voteStart + 1n, "Safe ballot open");
  for (let index = 0; index < voters.length; index += 1) {
    if (
      await isVoteRecorded(
        client,
        core,
        loadedArtifacts.core.abi,
        proposal.ballotId,
        voters[index].account.address,
      )
    ) {
      continue;
    }
    const latest = await client.getBlock();
    if (latest.timestamp >= voteEnd) {
      await abandonSafeProof(
        state,
        `Safe voting window closed before voter ${index + 1} was recorded`,
      );
      return runSafeProof(context);
    }
    const encrypted = encryptedVotes[index];
    assert.ok(encrypted, `Safe vote ${index} was not prepared`);
    const eligibilityProof = encodeAbiParameters(
      [{ type: "uint256" }, { type: "bytes32[]" }],
      [weights[index], proofs[index]],
    );
    await writeContract(
      proofTransactionKey("safe", attempt, `cast:${index}`),
      voters[index],
      core,
      loadedArtifacts.core.abi,
      "castVote",
      [
        proposal.ballotId,
        1n,
        encrypted.handle,
        encrypted.handleProof,
        eligibilityProof,
      ],
      context,
    );
    assert.equal(
      await isPubliclyDecryptable(client, encrypted.handle),
      false,
      "An individual Safe input handle became publicly decryptable",
    );
  }
  await waitForTimestamp(client, voteEnd + 1n, "Safe ballot closed");
  const detailedState = await readDetailedBallotState(
    client,
    core,
    loadedArtifacts.core.abi,
    proposal.ballotId,
  );
  if (detailedState === 3) {
    await writeContract(
      proofTransactionKey("safe", attempt, "request-tally"),
      context.deployer,
      core,
      loadedArtifacts.core.abi,
      "requestTally",
      [proposal.ballotId],
      context,
    );
  } else {
    assert.ok(
      detailedState === 4 || detailedState === 7,
      `Unexpected Safe ballot state ${detailedState} before tally`,
    );
  }
  const verdictHandle = (await client.readContract({
    address: core,
    abi: loadedArtifacts.core.abi,
    functionName: "expectedVerdictHandle",
    args: [proposal.ballotId],
  } as never)) as Handle<"bool">;
  state.safeProof.verdictHandle = verdictHandle;
  assert.equal(await isPubliclyDecryptable(client, verdictHandle), true);
  const result = await waitForPublicVerdict(context.deployer, verdictHandle);
  assert.equal(result.value, true, "Safe proposal did not pass");
  if (
    (await readBallotResult(
      client,
      core,
      loadedArtifacts.core.abi,
      proposal.ballotId,
    )) !== 3
  ) {
    await writeContract(
      proofTransactionKey("safe", attempt, "finalize"),
      context.deployer,
      core,
      loadedArtifacts.core.abi,
      "finalize",
      [proposal.ballotId, result.decryptionProof],
      context,
    );
  }
  let executedCalls = (await client.readContract({
    address: target,
    abi: loadedArtifacts.target.abi,
    functionName: "calls",
  } as never)) as bigint;
  if (executedCalls === 0n) {
    await writeContract(
      proofTransactionKey("safe", attempt, "execute"),
      context.deployer,
      module,
      loadedArtifacts.safeModule.abi,
      "execute",
      [state.safeProof.proposalId, actions],
      context,
    );
    executedCalls = (await client.readContract({
      address: target,
      abi: loadedArtifacts.target.abi,
      functionName: "calls",
    } as never)) as bigint;
  }
  const executedValue = (await client.readContract({
    address: target,
    abi: loadedArtifacts.target.abi,
    functionName: "value",
  } as never)) as bigint;
  assert.equal(executedValue, 41n);
  assert.equal(executedCalls, 1n);
  state.safeProof.verdict = true;
  state.safeProof.executedValue = executedValue.toString();
  await saveEvidence(state);
  console.info("Phase 6 Safe verdict and exact action execution passed.");
}

async function recoverExpiredSafeProof(context: ExecutionContext) {
  const { client, voters, state, artifacts: loadedArtifacts } = context;
  const proof = state.safeProof;
  if (!proof || proof.executedValue) return;

  const proposal = await readSafeProposal(
    client,
    state.contracts.safeModule,
    proof.proposalId,
    loadedArtifacts.safeModule.abi,
  );
  if (proposal.ballotId !== zeroHandle && !proof.ballotId) {
    proof.ballotId = proposal.ballotId;
    await saveEvidence(state);
  }

  const latest = await client.getBlock();
  if (proposal.ballotId === zeroHandle) {
    if (latest.timestamp >= BigInt(proof.voteStart)) {
      await abandonSafeProof(
        state,
        "Safe proposal was not registered before its scheduled opening",
      );
    }
    return;
  }
  if (latest.timestamp <= BigInt(proof.voteEnd)) return;

  const recordedVotes = await countRecordedVotes(
    client,
    state.contracts.safeCore,
    loadedArtifacts.core.abi,
    proposal.ballotId,
    voters,
  );
  if (recordedVotes < voters.length) {
    await abandonSafeProof(
      state,
      `Safe ballot closed with ${recordedVotes}/${voters.length} votes recorded`,
    );
  }
}

async function abandonSafeProof(state: Phase6Evidence, reason: string) {
  const proof = state.safeProof;
  assert.ok(proof, "No Safe proof is available to abandon");
  state.abandonedProofs.safe.push({
    attempt: proof.attempt,
    proposalId: proof.proposalId,
    ballotId: proof.ballotId,
    abandonedAt: new Date().toISOString(),
    reason,
  });
  delete state.safeProof;
  await saveEvidence(state);
  console.warn(`${reason}; starting a fresh Safe proposal attempt.`);
}

async function readSafeProposal(
  client: PublicClient,
  module: Address,
  proposalId: Hex,
  abi: Abi,
) {
  return client.readContract({
    address: module,
    abi,
    functionName: "proposal",
    args: [proposalId],
  } as never) as Promise<{ ballotId: Hex; executed: boolean }>;
}

async function runGovernorProof(context: ExecutionContext) {
  const { client, voters, state, artifacts: loadedArtifacts } = context;
  const governor = state.contracts.governor;
  const core = state.contracts.governorCore;
  const target = await deployArtifact(
    "governorExecutionTarget",
    loadedArtifacts.target,
    [],
    context,
  );
  const actionData = encodeFunctionData({
    abi: loadedArtifacts.target.abi,
    functionName: "setValue",
    args: [77n],
  } as never);
  await recoverExpiredGovernorProof(context);
  if (!state.governorProof) {
    const attempt = nextProofAttempt(state.abandonedProofs.governor);
    const description = `Phase 6 real-Nox Governor execution (attempt ${attempt})`;
    const descriptionHash = keccak256(stringToHex(description));
    const proposalId = (await client.readContract({
      address: governor,
      abi: loadedArtifacts.governor.abi,
      functionName: "hashProposal",
      args: [[target], [0n], [actionData], descriptionHash],
    } as never)) as bigint;
    state.governorProof = {
      attempt,
      proposalId: proposalId.toString(),
      description,
    };
    await saveEvidence(state);
  }
  const attempt = state.governorProof.attempt;
  const description = state.governorProof.description;
  const descriptionHash = keccak256(stringToHex(description));
  const proposalId = (await client.readContract({
    address: governor,
    abi: loadedArtifacts.governor.abi,
    functionName: "hashProposal",
    args: [[target], [0n], [actionData], descriptionHash],
  } as never)) as bigint;
  assert.equal(state.governorProof.proposalId, proposalId.toString());

  let ballotId = (await client.readContract({
    address: governor,
    abi: loadedArtifacts.governor.abi,
    functionName: "ballotOfProposal",
    args: [proposalId],
  } as never)) as Hex;
  if (ballotId === zeroHandle) {
    await writeContract(
      proofTransactionKey("governor", attempt, "propose"),
      voters[0],
      governor,
      loadedArtifacts.governor.abi,
      "proposeConfidential",
      [[target], [0n], [actionData], description, 4],
      context,
    );
    ballotId = (await client.readContract({
      address: governor,
      abi: loadedArtifacts.governor.abi,
      functionName: "ballotOfProposal",
      args: [proposalId],
    } as never)) as Hex;
  }
  assert.notEqual(ballotId, zeroHandle);
  const snapshot = (await client.readContract({
    address: governor,
    abi: loadedArtifacts.governor.abi,
    functionName: "proposalSnapshot",
    args: [proposalId],
  } as never)) as bigint;
  const deadline = (await client.readContract({
    address: governor,
    abi: loadedArtifacts.governor.abi,
    functionName: "proposalDeadline",
    args: [proposalId],
  } as never)) as bigint;
  state.governorProof.ballotId = ballotId;
  state.governorProof.snapshot = snapshot.toString();
  state.governorProof.deadline = deadline.toString();
  await saveEvidence(state);

  const encryptedVotes = await Promise.all(
    voters.map(async (voter) =>
      (await isVoteRecorded(
        client,
        core,
        loadedArtifacts.core.abi,
        ballotId,
        voter.account.address,
      ))
        ? undefined
        : encryptChoice(voter, core),
    ),
  );
  await waitForBlock(client, snapshot + 1n, "Governor ballot open");
  for (let index = 0; index < voters.length; index += 1) {
    if (
      await isVoteRecorded(
        client,
        core,
        loadedArtifacts.core.abi,
        ballotId,
        voters[index].account.address,
      )
    ) {
      continue;
    }
    const currentBlock = await client.getBlockNumber();
    if (currentBlock > deadline) {
      await abandonGovernorProof(
        state,
        `Governor voting period closed before voter ${index + 1} was recorded`,
      );
      return runGovernorProof(context);
    }
    const encrypted = encryptedVotes[index];
    assert.ok(encrypted, `Governor vote ${index} was not prepared`);
    await writeContract(
      proofTransactionKey("governor", attempt, `cast:${index}`),
      voters[index],
      core,
      loadedArtifacts.core.abi,
      "castVote",
      [ballotId, 1n, encrypted.handle, encrypted.handleProof, "0x"],
      context,
    );
    assert.equal(
      await isPubliclyDecryptable(client, encrypted.handle),
      false,
      "An individual Governor input handle became publicly decryptable",
    );
  }
  await waitForBlock(client, deadline + 1n, "Governor ballot closed");
  const detailedState = await readDetailedBallotState(
    client,
    core,
    loadedArtifacts.core.abi,
    ballotId,
  );
  if (detailedState === 3) {
    await writeContract(
      proofTransactionKey("governor", attempt, "request-tally"),
      context.deployer,
      core,
      loadedArtifacts.core.abi,
      "requestTally",
      [ballotId],
      context,
    );
  } else {
    assert.ok(
      detailedState === 4 || detailedState === 7,
      `Unexpected Governor ballot state ${detailedState} before tally`,
    );
  }
  const verdictHandle = (await client.readContract({
    address: core,
    abi: loadedArtifacts.core.abi,
    functionName: "expectedVerdictHandle",
    args: [ballotId],
  } as never)) as Handle<"bool">;
  state.governorProof.verdictHandle = verdictHandle;
  assert.equal(await isPubliclyDecryptable(client, verdictHandle), true);
  const result = await waitForPublicVerdict(context.deployer, verdictHandle);
  assert.equal(result.value, true, "Governor proposal did not pass");
  if (
    (await readBallotResult(
      client,
      core,
      loadedArtifacts.core.abi,
      ballotId,
    )) !== 3
  ) {
    await writeContract(
      proofTransactionKey("governor", attempt, "finalize"),
      context.deployer,
      core,
      loadedArtifacts.core.abi,
      "finalize",
      [ballotId, result.decryptionProof],
      context,
    );
  }
  let governorState = await readGovernorState(
    client,
    governor,
    loadedArtifacts.governor.abi,
    proposalId,
  );
  if (governorState === 4) {
    await writeContract(
      proofTransactionKey("governor", attempt, "queue"),
      context.deployer,
      governor,
      loadedArtifacts.governor.abi,
      "queue",
      [[target], [0n], [actionData], descriptionHash],
      context,
    );
    governorState = await readGovernorState(
      client,
      governor,
      loadedArtifacts.governor.abi,
      proposalId,
    );
  }
  assert.ok(
    governorState === 5 || governorState === 7,
    `Unexpected Governor proposal state ${governorState} before execution`,
  );
  if (governorState !== 7) {
    const eta = (await client.readContract({
      address: governor,
      abi: loadedArtifacts.governor.abi,
      functionName: "proposalEta",
      args: [proposalId],
    } as never)) as bigint;
    await waitForTimestamp(client, eta, "Governor timelock ready");
    await writeContract(
      proofTransactionKey("governor", attempt, "execute"),
      context.deployer,
      governor,
      loadedArtifacts.governor.abi,
      "execute",
      [[target], [0n], [actionData], descriptionHash],
      context,
    );
  }
  const executedValue = (await client.readContract({
    address: target,
    abi: loadedArtifacts.target.abi,
    functionName: "value",
  } as never)) as bigint;
  const executedCalls = (await client.readContract({
    address: target,
    abi: loadedArtifacts.target.abi,
    functionName: "calls",
  } as never)) as bigint;
  assert.equal(executedValue, 77n);
  assert.equal(executedCalls, 1n);
  assert.equal(
    await client.readContract({
      address: governor,
      abi: loadedArtifacts.governor.abi,
      functionName: "state",
      args: [proposalId],
    } as never),
    7,
  );
  state.governorProof.verdict = true;
  state.governorProof.executedValue = executedValue.toString();
  await saveEvidence(state);
  console.info("Phase 6 Governor verdict, queue, delay, and execution passed.");
}

async function recoverExpiredGovernorProof(context: ExecutionContext) {
  const { client, voters, state, artifacts: loadedArtifacts } = context;
  const proof = state.governorProof;
  if (!proof || proof.executedValue) return;

  const governor = state.contracts.governor;
  const proposalId = BigInt(proof.proposalId);
  const ballotId = (await client.readContract({
    address: governor,
    abi: loadedArtifacts.governor.abi,
    functionName: "ballotOfProposal",
    args: [proposalId],
  } as never)) as Hex;
  if (ballotId === zeroHandle) return;

  const [snapshot, deadline] = (await Promise.all([
    client.readContract({
      address: governor,
      abi: loadedArtifacts.governor.abi,
      functionName: "proposalSnapshot",
      args: [proposalId],
    } as never),
    client.readContract({
      address: governor,
      abi: loadedArtifacts.governor.abi,
      functionName: "proposalDeadline",
      args: [proposalId],
    } as never),
  ])) as [bigint, bigint];
  proof.ballotId = ballotId;
  proof.snapshot = snapshot.toString();
  proof.deadline = deadline.toString();
  await saveEvidence(state);

  if ((await client.getBlockNumber()) <= deadline) return;
  const recordedVotes = await countRecordedVotes(
    client,
    state.contracts.governorCore,
    loadedArtifacts.core.abi,
    ballotId,
    voters,
  );
  if (recordedVotes < voters.length) {
    await abandonGovernorProof(
      state,
      `Governor ballot closed with ${recordedVotes}/${voters.length} votes recorded`,
    );
  }
}

async function abandonGovernorProof(state: Phase6Evidence, reason: string) {
  const proof = state.governorProof;
  assert.ok(proof, "No Governor proof is available to abandon");
  state.abandonedProofs.governor.push({
    attempt: proof.attempt,
    proposalId: proof.proposalId,
    ballotId: proof.ballotId,
    abandonedAt: new Date().toISOString(),
    reason,
  });
  delete state.governorProof;
  await saveEvidence(state);
  console.warn(`${reason}; starting a fresh Governor proposal attempt.`);
}

async function countRecordedVotes(
  client: PublicClient,
  core: Address,
  abi: Abi,
  ballotId: Hex,
  voters: readonly AccountWallet[],
) {
  const recorded = await Promise.all(
    voters.map((voter) =>
      isVoteRecorded(client, core, abi, ballotId, voter.account.address),
    ),
  );
  return recorded.filter(Boolean).length;
}

async function isVoteRecorded(
  client: PublicClient,
  core: Address,
  abi: Abi,
  ballotId: Hex,
  voter: Address,
) {
  const receipt = (await client.readContract({
    address: core,
    abi,
    functionName: "receipt",
    args: [ballotId, voter],
  } as never)) as { recorded: boolean };
  return receipt.recorded;
}

async function readDetailedBallotState(
  client: PublicClient,
  core: Address,
  abi: Abi,
  ballotId: Hex,
) {
  return client.readContract({
    address: core,
    abi,
    functionName: "detailedState",
    args: [ballotId],
  } as never) as Promise<number>;
}

async function readBallotResult(
  client: PublicClient,
  core: Address,
  abi: Abi,
  ballotId: Hex,
) {
  return client.readContract({
    address: core,
    abi,
    functionName: "result",
    args: [ballotId],
  } as never) as Promise<number>;
}

async function readGovernorState(
  client: PublicClient,
  governor: Address,
  abi: Abi,
  proposalId: bigint,
) {
  return client.readContract({
    address: governor,
    abi,
    functionName: "state",
    args: [proposalId],
  } as never) as Promise<number>;
}

function nextProofAttempt(abandoned: readonly AbandonedProof[]) {
  return (
    abandoned.reduce((highest, proof) => Math.max(highest, proof.attempt), 0) +
    1
  );
}

function proofTransactionKey(
  host: "safe" | "governor",
  attempt: number,
  action: string,
) {
  return `${host}:attempt:${attempt}:${action}`;
}

interface ExecutionContext {
  client: PublicClient;
  deployer: AccountWallet;
  voters: [AccountWallet, AccountWallet, AccountWallet, AccountWallet];
  state: Phase6Evidence;
  artifacts: Artifacts;
}

async function deploySafe(context: ExecutionContext): Promise<Address> {
  const { client, deployer, state, artifacts: loadedArtifacts } = context;
  if (state.contracts.safe) {
    await requireContract(client, state.contracts.safe);
    return state.contracts.safe;
  }
  const initializer = encodeFunctionData({
    abi: loadedArtifacts.safe.abi,
    functionName: "setup",
    args: [
      [deployer.account.address],
      1n,
      zeroAddress,
      "0x",
      COMPATIBILITY_FALLBACK_HANDLER,
      zeroAddress,
      0n,
      zeroAddress,
    ],
  } as never);
  const saltNonce = BigInt(
    keccak256(
      concatHex([
        stringToHex("wtf-confidential-governance-phase6-safe"),
        deployer.account.address,
        state.runId,
      ]),
    ),
  );
  const receipt = await transact(
    "deploySafe",
    () =>
      deployer.writeContract({
        account: deployer.account,
        chain: sepolia,
        address: SAFE_PROXY_FACTORY,
        abi: loadedArtifacts.safeProxyFactory.abi,
        functionName: "createProxyWithNonce",
        args: [SAFE_SINGLETON, initializer, saltNonce],
      } as never),
    context,
  );
  const event = findEvent(
    receipt,
    loadedArtifacts.safeProxyFactory.abi,
    "ProxyCreation",
  );
  state.contracts.safe = event.proxy as Address;
  await saveEvidence(state);
  await requireContract(client, state.contracts.safe);
  return state.contracts.safe;
}

async function executeSafeTransaction(
  key: string,
  safe: Address,
  to: Address,
  data: Hex,
  context: ExecutionContext,
) {
  return writeContract(
    key,
    context.deployer,
    safe,
    context.artifacts.safe.abi,
    "execTransaction",
    [
      to,
      0n,
      data,
      0,
      0n,
      0n,
      0n,
      zeroAddress,
      zeroAddress,
      concatHex([
        padHex(context.deployer.account.address, { size: 32 }),
        zeroHandle,
        "0x01",
      ]),
    ],
    context,
  );
}

async function verifyTimelockRoles(context: ExecutionContext) {
  const { client, state } = context;
  const timelock = state.contracts.timelock;
  const governor = state.contracts.governor;
  const factory = state.contracts.factory;
  const [proposer, canceller, executor, admin] = await Promise.all([
    readRole(client, timelock, "PROPOSER_ROLE"),
    readRole(client, timelock, "CANCELLER_ROLE"),
    readRole(client, timelock, "EXECUTOR_ROLE"),
    readRole(client, timelock, "DEFAULT_ADMIN_ROLE"),
  ]);
  assert.equal(await hasRole(client, timelock, proposer, governor), true);
  assert.equal(await hasRole(client, timelock, canceller, governor), true);
  assert.equal(await hasRole(client, timelock, executor, zeroAddress), true);
  assert.equal(await hasRole(client, timelock, admin, factory), false);
}

async function readRole(
  client: PublicClient,
  timelock: Address,
  functionName:
    | "PROPOSER_ROLE"
    | "CANCELLER_ROLE"
    | "EXECUTOR_ROLE"
    | "DEFAULT_ADMIN_ROLE",
): Promise<Hex> {
  return client.readContract({
    address: timelock,
    abi: TIMELOCK_ABI,
    functionName,
  } as never) as Promise<Hex>;
}

async function hasRole(
  client: PublicClient,
  timelock: Address,
  role: Hex,
  account: Address,
): Promise<boolean> {
  return client.readContract({
    address: timelock,
    abi: TIMELOCK_ABI,
    functionName: "hasRole",
    args: [role, account],
  } as never) as Promise<boolean>;
}

async function deployArtifact(
  key: string,
  artifact: ContractArtifact,
  args: readonly unknown[],
  context: ExecutionContext,
): Promise<Address> {
  const existing = context.state.contracts[key];
  if (existing) {
    await requireContract(context.client, existing);
    return existing;
  }
  const receipt = await transact(
    `deploy:${key}`,
    () =>
      context.deployer.deployContract({
        account: context.deployer.account,
        chain: sepolia,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args,
      } as never),
    context,
  );
  assert.ok(receipt.contractAddress, `${key} deployment omitted address`);
  context.state.contracts[key] = receipt.contractAddress;
  await saveEvidence(context.state);
  return receipt.contractAddress;
}

async function writeContract(
  key: string,
  wallet: AccountWallet,
  address: Address,
  abi: Abi,
  functionName: string,
  args: readonly unknown[],
  context: ExecutionContext,
) {
  return transact(
    key,
    () =>
      wallet.writeContract({
        account: wallet.account,
        chain: sepolia,
        address,
        abi,
        functionName,
        args,
      } as never),
    context,
  );
}

async function transact(
  key: string,
  send: () => Promise<Hex>,
  context: ExecutionContext,
): Promise<TransactionReceipt> {
  let hash = context.state.transactions[key];
  if (!hash) {
    console.info(`Broadcasting ${key}`);
    hash = await send();
    context.state.transactions[key] = hash;
    await saveEvidence(context.state);
  } else {
    console.info(`Resuming ${key} from ${hash}`);
  }
  const receipt = await context.client.waitForTransactionReceipt({
    hash,
    confirmations: 2,
    timeout: 600_000,
  });
  if (receipt.status !== "success") {
    delete context.state.transactions[key];
    await saveEvidence(context.state);
    throw new Error(`${key} reverted in ${hash}`);
  }
  console.info(`${key} confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

async function fundVoters(
  client: PublicClient,
  deployer: AccountWallet,
  voters: readonly AccountWallet[],
  state: Phase6Evidence,
  report: PreflightReport,
) {
  const targetBalance = voterFundingTarget(report);
  const temporaryContext = {
    client,
    deployer,
    voters: voters as [
      AccountWallet,
      AccountWallet,
      AccountWallet,
      AccountWallet,
    ],
    state,
    artifacts,
  };
  for (let index = 0; index < voters.length; index += 1) {
    const address = voters[index].account.address;
    const balance = await client.getBalance({ address });
    if (balance >= targetBalance) continue;
    await transact(
      `fundVoter${index}`,
      () =>
        deployer.sendTransaction({
          account: deployer.account,
          chain: sepolia,
          to: address,
          value: targetBalance - balance,
        }),
      temporaryContext,
    );
  }
}

async function encryptChoice(wallet: AccountWallet, coreAddress: Address) {
  const handleClient = await createViemHandleClient(wallet);
  return handleClient.encryptInput(1n, "uint16", coreAddress);
}

async function waitForPublicVerdict(
  wallet: AccountWallet,
  handle: Handle<"bool">,
) {
  const handleClient = await createViemHandleClient(wallet);
  const deadline = Date.now() + 10 * 60_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return await handleClient.publicDecrypt(handle);
    } catch (error) {
      lastError = error;
      console.info(
        "Verdict is not ready; polling the released Handle Gateway.",
      );
      await delay(10_000);
    }
  }
  throw new Error("Timed out waiting for the real Nox public verdict", {
    cause: lastError,
  });
}

async function waitForTimestamp(
  client: PublicClient,
  target: bigint,
  label: string,
) {
  while (true) {
    const block = await client.getBlock();
    if (block.timestamp >= target) return;
    console.info(
      `${label}: waiting ${target - block.timestamp}s (block ${block.number})`,
    );
    await delay(10_000);
  }
}

async function waitForBlock(
  client: PublicClient,
  target: bigint,
  label: string,
) {
  while (true) {
    const block = await client.getBlockNumber();
    if (block >= target) return;
    console.info(`${label}: waiting ${target - block} block(s)`);
    await delay(10_000);
  }
}

function buildFourWalletMerkleConfig({
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

function deriveVoterAccount(privateKey: Hex, index: number) {
  const digest = createHmac("sha256", Buffer.from(privateKey.slice(2), "hex"))
    .update(`wtf-confidential-governance:sepolia:voter:${index}`)
    .digest("hex");
  assert.notEqual(digest, "0".repeat(64));
  return privateKeyToAccount(`0x${digest}`);
}

function createAccountWallet(account: PrivateKeyAccount) {
  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl, { timeout: 30_000 }),
  });
}

async function requireCodeHash(
  client: PublicClient,
  address: Address,
): Promise<Hex> {
  const code = await requireContract(client, address);
  return keccak256(code);
}

async function isPubliclyDecryptable(
  client: PublicClient,
  handle: Hex,
): Promise<boolean> {
  return client.readContract({
    address: NOX_COMPUTE,
    abi: NOX_ABI,
    functionName: "isPubliclyDecryptable",
    args: [handle],
  }) as Promise<boolean>;
}

async function requireContract(
  client: PublicClient,
  address: Address,
): Promise<Hex> {
  const code = await client.getCode({ address });
  assert.ok(code && code !== "0x", `No contract code at ${address}`);
  return code;
}

function findEvent(
  receipt: TransactionReceipt,
  abi: Abi,
  eventName: string,
): Record<string, unknown> {
  const logs = parseEventLogs({ abi, logs: receipt.logs, strict: false }) as {
    eventName: string;
    args: Record<string, unknown>;
  }[];
  const event = logs.find((log) => log.eventName === eventName);
  assert.ok(event, `${eventName} was not emitted`);
  return event.args;
}

async function loadArtifacts(): Promise<Artifacts> {
  const [
    factory,
    safeModule,
    core,
    governor,
    token,
    target,
    safe,
    safeProxyFactory,
    factoryCreationCode,
    safeModuleCreationCode,
    governorCreationCode,
    timelockCreationCode,
  ] = await Promise.all([
    readHardhatArtifact(
      "artifacts/src/contracts/factory/ConfidentialGovernanceFactory.sol/ConfidentialGovernanceFactory.json",
    ),
    readHardhatArtifact(
      "artifacts/src/contracts/safe/SafeConfidentialVotingModule.sol/SafeConfidentialVotingModule.json",
    ),
    readHardhatArtifact(
      "artifacts/src/contracts/core/ConfidentialBallotCore.sol/ConfidentialBallotCore.json",
    ),
    readHardhatArtifact(
      "artifacts/src/contracts/governor/ConfidentialGovernor.sol/ConfidentialGovernor.json",
    ),
    readHardhatArtifact(
      "artifacts/src/fixtures/ProductionIntegrationFixtures.sol/ProductionIntegrationVotesToken.json",
    ),
    readHardhatArtifact(
      "artifacts/src/fixtures/ProductionIntegrationFixtures.sol/ProductionIntegrationTarget.json",
    ),
    readHardhatArtifact(
      "node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json",
    ),
    readHardhatArtifact(
      "node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json",
    ),
    readFoundryCreationCode(
      "out/ConfidentialGovernanceFactory.sol/ConfidentialGovernanceFactory.json",
    ),
    readFoundryCreationCode(
      "out/SafeConfidentialVotingModule.sol/SafeConfidentialVotingModule.json",
    ),
    readFoundryCreationCode(
      "out/ConfidentialGovernor.sol/ConfidentialGovernor.json",
    ),
    readFoundryCreationCode(
      "out/TimelockController.sol/TimelockController.json",
    ),
  ]);
  return {
    factory: { ...factory, bytecode: factoryCreationCode },
    safeModule,
    core,
    governor,
    token,
    target,
    safe,
    safeProxyFactory,
    factoryCreationCode,
    safeModuleCreationCode,
    governorCreationCode,
    timelockCreationCode,
  };
}

async function readHardhatArtifact(relativePath: string) {
  const parsed = JSON.parse(
    await readFile(path.resolve(process.cwd(), relativePath), "utf8"),
  ) as ContractArtifact;
  assert.ok(parsed.abi && parsed.bytecode, `Invalid artifact ${relativePath}`);
  return parsed;
}

async function readFoundryCreationCode(relativePath: string): Promise<Hex> {
  const parsed = JSON.parse(
    await readFile(path.resolve(process.cwd(), relativePath), "utf8"),
  ) as { bytecode: { object: Hex } };
  assert.ok(parsed.bytecode.object, `Invalid Foundry artifact ${relativePath}`);
  return parsed.bytecode.object;
}

async function loadOrCreateEvidence(
  deployer: Address,
  voters: [Address, Address, Address, Address],
  report: PreflightReport,
): Promise<Phase6Evidence> {
  try {
    const existing = JSON.parse(await readFile(EVIDENCE_PATH, "utf8")) as
      | Phase6Evidence
      | undefined;
    assert.ok(existing);
    assert.equal(existing.schemaVersion, 2);
    assert.equal(existing.chainId, sepolia.id);
    assert.ok(isAddressEqual(existing.deployer, deployer));
    for (let index = 0; index < voters.length; index += 1) {
      assert.ok(isAddressEqual(existing.voters[index], voters[index]));
    }
    return existing;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const startedAt = new Date().toISOString();
    return {
      schemaVersion: 2,
      status: "in_progress",
      startedAt,
      runId: keccak256(
        encodeAbiParameters(
          [{ type: "address" }, { type: "string" }],
          [deployer, startedAt],
        ),
      ),
      chainId: sepolia.id,
      deployer,
      voters,
      preflight: report,
      transactions: {},
      contracts: {},
      abandonedProofs: { safe: [], governor: [] },
    };
  }
}

async function saveEvidence(state: Phase6Evidence) {
  await mkdir(path.dirname(EVIDENCE_PATH), { recursive: true });
  const temporaryPath = `${EVIDENCE_PATH}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, EVIDENCE_PATH);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

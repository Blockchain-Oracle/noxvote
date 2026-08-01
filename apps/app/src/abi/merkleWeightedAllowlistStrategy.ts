// Generated from Foundry out/MerkleWeightedAllowlistStrategy.sol/MerkleWeightedAllowlistStrategy.json — regenerate, never edit.
export const merkleAllowlistStrategyAbi = [
  {"type":"function","name":"LEAF_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},
  {"type":"function","name":"leafFor","inputs":[{"name":"chainId","type":"uint256","internalType":"uint256"},{"name":"host","type":"address","internalType":"address"},{"name":"snapshotId","type":"bytes32","internalType":"bytes32"},{"name":"voter","type":"address","internalType":"address"},{"name":"weight","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"pure"},
  {"type":"function","name":"validateConfig","inputs":[{"name":"config","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"eligibleCount","type":"uint32","internalType":"uint32"}],"stateMutability":"view"},
  {"type":"function","name":"weightOf","inputs":[{"name":"voter","type":"address","internalType":"address"},{"name":"","type":"uint48","internalType":"uint48"},{"name":"config","type":"bytes","internalType":"bytes"},{"name":"proof","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"weight","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"error","name":"InvalidEligibilityConfigLength","inputs":[{"name":"expected","type":"uint256","internalType":"uint256"},{"name":"actual","type":"uint256","internalType":"uint256"}]},
  {"type":"error","name":"InvalidEligibilityHost","inputs":[]},
  {"type":"error","name":"InvalidEligibilityProof","inputs":[{"name":"voter","type":"address","internalType":"address"}]},
  {"type":"error","name":"InvalidEligibilityProofEncoding","inputs":[{"name":"actualLength","type":"uint256","internalType":"uint256"}]},
  {"type":"error","name":"InvalidEligibilityVoter","inputs":[]},
  {"type":"error","name":"InvalidEligibleCount","inputs":[]},
  {"type":"error","name":"InvalidMerkleRoot","inputs":[]},
  {"type":"error","name":"InvalidSnapshotId","inputs":[]},
  {"type":"error","name":"WrongEligibilityChain","inputs":[{"name":"expected","type":"uint256","internalType":"uint256"},{"name":"provided","type":"uint256","internalType":"uint256"}]},
  {"type":"error","name":"ZeroEligibilityWeight","inputs":[{"name":"voter","type":"address","internalType":"address"}]},
] as const

// Generated from Foundry out/IVotesSnapshotStrategy.sol/IVotesSnapshotStrategy.json — regenerate, never edit.
export const ivotesSnapshotStrategyAbi = [
  {"type":"function","name":"validateConfig","inputs":[{"name":"config","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"eligibleCount","type":"uint32","internalType":"uint32"}],"stateMutability":"view"},
  {"type":"function","name":"weightOf","inputs":[{"name":"voter","type":"address","internalType":"address"},{"name":"snapshot","type":"uint48","internalType":"uint48"},{"name":"config","type":"bytes","internalType":"bytes"},{"name":"proof","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"weight","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"error","name":"EmptyEligibilityProofRequired","inputs":[{"name":"actualLength","type":"uint256","internalType":"uint256"}]},
  {"type":"error","name":"InvalidEligibilityConfigLength","inputs":[{"name":"expected","type":"uint256","internalType":"uint256"},{"name":"actual","type":"uint256","internalType":"uint256"}]},
  {"type":"error","name":"InvalidEligibilityToken","inputs":[{"name":"token","type":"address","internalType":"address"}]},
  {"type":"error","name":"InvalidEligibilityVoter","inputs":[]},
  {"type":"error","name":"ZeroEligibilityWeight","inputs":[{"name":"voter","type":"address","internalType":"address"}]},
] as const

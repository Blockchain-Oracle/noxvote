// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { TEEType } from "@iexec-nox/nox-protocol-contracts/contracts/utils/TypeUtils.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import { ConfidentialBallotCore } from "../../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    SafeConfidentialVotingModule
} from "../../../../src/contracts/safe/SafeConfidentialVotingModule.sol";
import {
    BallotReceipt,
    BallotRecord
} from "../../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { SafeAction } from "../../../../src/contracts/types/SafeGovernanceTypes.sol";
import { HostClockFixture } from "./CoreFixtures.sol";
import { VotesTokenFixture } from "./EligibilityFixtures.sol";

struct CoreInvariantConfig {
    address noxCompute;
    HostClockFixture votingHost;
    bytes32 votingBallotId;
    VotesTokenFixture token;
    HostClockFixture belowFloorHost;
    bytes32 belowFloorBallotId;
    HostClockFixture finalizationHost;
    bytes32 finalizationBallotId;
    address[4] voters;
    uint256[4] snapshotWeights;
}

struct SafeInvariantConfig {
    SafeConfidentialVotingModule module;
    bytes32 safeProposalId;
    InvariantSafeExecutionTarget target;
    bytes32 actionHash;
    bytes32 ballotId;
}

contract InvariantSafeExecutionTarget {
    bool public shouldRevert = true;
    uint256 public value;
    uint256 public calls;

    function setShouldRevert(bool nextValue) external {
        shouldRevert = nextValue;
    }

    function setValue(uint256 nextValue) external {
        if (shouldRevert) revert("invariant target failure");
        value = nextValue;
        calls += 1;
    }
}

contract ConfidentialGovernanceInvariantHandler is Test {
    uint256 private constant GATEWAY_PRIVATE_KEY = 0xBEEF;
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant HANDLE_PROOF_TYPEHASH =
        keccak256("HandleProof(bytes32 handle,address owner,address app,uint256 createdAt)");
    bytes32 private constant DECRYPTION_PROOF_TYPEHASH =
        keccak256("DecryptionProof(bytes32 handle,bytes decryptedResult)");

    address public immutable noxCompute;
    HostClockFixture public immutable votingHost;
    ConfidentialBallotCore public immutable votingCore;
    bytes32 public immutable votingBallotId;
    VotesTokenFixture public immutable token;
    HostClockFixture public immutable belowFloorHost;
    ConfidentialBallotCore public immutable belowFloorCore;
    bytes32 public immutable belowFloorBallotId;
    HostClockFixture public immutable finalizationHost;
    ConfidentialBallotCore public immutable finalizationCore;
    bytes32 public immutable finalizationBallotId;
    SafeConfidentialVotingModule public immutable module;
    bytes32 public immutable safeProposalId;
    InvariantSafeExecutionTarget public immutable executionTarget;
    bytes32 public immutable safeActionHash;
    bytes32 public immutable safeBallotId;

    address[4] public voters;
    uint256[4] public snapshotWeights;
    uint64[4] public successfulOperations;

    bool public disclosureDomainsSeeded;
    bool public recordedVotersDecreased;
    bool public failedCastMutatedPublicState;
    uint256 public successfulFinalizations;
    uint256 public successfulSafeExecutions;
    bytes32 public finalizationVerdictHandle;

    address private immutable initializer;
    uint256 private inputNonce;

    constructor(CoreInvariantConfig memory coreConfig, SafeInvariantConfig memory safeConfig) {
        initializer = msg.sender;
        noxCompute = coreConfig.noxCompute;
        votingHost = coreConfig.votingHost;
        votingCore = coreConfig.votingHost.confidentialCore();
        votingBallotId = coreConfig.votingBallotId;
        token = coreConfig.token;
        belowFloorHost = coreConfig.belowFloorHost;
        belowFloorCore = coreConfig.belowFloorHost.confidentialCore();
        belowFloorBallotId = coreConfig.belowFloorBallotId;
        finalizationHost = coreConfig.finalizationHost;
        finalizationCore = coreConfig.finalizationHost.confidentialCore();
        finalizationBallotId = coreConfig.finalizationBallotId;
        module = safeConfig.module;
        safeProposalId = safeConfig.safeProposalId;
        executionTarget = safeConfig.target;
        safeActionHash = safeConfig.actionHash;
        safeBallotId = safeConfig.ballotId;
        voters = coreConfig.voters;
        snapshotWeights = coreConfig.snapshotWeights;
    }

    function seedDisclosureDomains() external {
        require(msg.sender == initializer && !disclosureDomainsSeeded, "invalid invariant seed");
        disclosureDomainsSeeded = true;
        for (uint256 i = 0; i < 3; ++i) {
            _cast(
                belowFloorCore,
                belowFloorBallotId,
                voters[i],
                1,
                keccak256(abi.encode("below-floor", i))
            );
        }
        belowFloorHost.setClock(201);

        for (uint256 i = 0; i < 4; ++i) {
            _cast(
                finalizationCore,
                finalizationBallotId,
                voters[i],
                1,
                keccak256(abi.encode("finalization", i))
            );
        }
        finalizationHost.setClock(201);
        finalizationCore.requestTally(finalizationBallotId);
        finalizationVerdictHandle = finalizationCore.expectedVerdictHandle(finalizationBallotId);
    }

    function castNext(uint256 voterSeed, bytes32 choiceSeed) external {
        uint256 index = voterSeed % voters.length;
        address voter = voters[index];
        BallotReceipt memory beforeReceipt = votingCore.receipt(votingBallotId, voter);
        BallotRecord memory beforeRecord = votingCore.ballot(votingBallotId);
        (externalEuint16 handle, bytes memory proof) = _encryptedInput(
            address(votingCore), voter, keccak256(abi.encode(choiceSeed, index, inputNonce++))
        );

        vm.prank(voter);
        try votingCore.castVote(votingBallotId, beforeReceipt.sequence + 1, handle, proof, "") {
            successfulOperations[index] += 1;
        } catch { }

        BallotRecord memory afterRecord = votingCore.ballot(votingBallotId);
        if (afterRecord.recordedVoters < beforeRecord.recordedVoters) {
            recordedVotersDecreased = true;
        }
    }

    function mutateVotingPower(uint256 voterSeed, uint256 amountSeed) external {
        token.mint(voters[voterSeed % voters.length], (amountSeed % 1_000) + 1);
    }

    function attemptWrongSequence(uint256 voterSeed) external {
        address voter = voters[voterSeed % voters.length];
        BallotReceipt memory beforeReceipt = votingCore.receipt(votingBallotId, voter);
        BallotRecord memory beforeRecord = votingCore.ballot(votingBallotId);
        bytes32 beforeHash = keccak256(abi.encode(beforeReceipt, beforeRecord));

        vm.prank(voter);
        try votingCore.castVote(
            votingBallotId, beforeReceipt.sequence + 2, externalEuint16.wrap(bytes32(0)), "", ""
        ) { }
            catch { }

        bytes32 afterHash = keccak256(
            abi.encode(votingCore.receipt(votingBallotId, voter), votingCore.ballot(votingBallotId))
        );
        if (afterHash != beforeHash) failedCastMutatedPublicState = true;
    }

    function requestBelowFloor() external {
        try belowFloorCore.requestTally(belowFloorBallotId) { } catch { }
    }

    function finalize(uint256 outcomeSeed) external {
        bytes memory plaintext = outcomeSeed % 2 == 0 ? bytes(hex"00") : bytes(hex"01");
        bytes memory proof = _decryptionProof(finalizationVerdictHandle, plaintext);
        try finalizationCore.finalize(finalizationBallotId, proof) {
            successfulFinalizations += 1;
        } catch { }
    }

    function setSafeFailure(bool shouldRevert) external {
        executionTarget.setShouldRevert(shouldRevert);
    }

    function executeSafe(bool exact) external {
        uint256 nextValue = exact ? 42 : 43;
        SafeAction[] memory actions = new SafeAction[](1);
        actions[0] = SafeAction({
            to: address(executionTarget),
            value: 0,
            data: abi.encodeCall(executionTarget.setValue, (nextValue))
        });
        try module.execute(safeProposalId, actions) {
            successfulSafeExecutions += 1;
        } catch { }
    }

    function _cast(
        ConfidentialBallotCore core,
        bytes32 ballotId,
        address voter,
        uint64 sequence,
        bytes32 seed
    ) private {
        (externalEuint16 handle, bytes memory proof) = _encryptedInput(address(core), voter, seed);
        vm.prank(voter);
        core.castVote(ballotId, sequence, handle, proof, "");
    }

    function _encryptedInput(address core, address owner, bytes32 seed)
        private
        view
        returns (externalEuint16 handle, bytes memory proof)
    {
        bytes32 rawHandle = keccak256(abi.encode(seed, core)) >> (7 * 8);
        // The local Nox chain identifier is known to fit in four bytes.
        // forge-lint: disable-next-line(unsafe-typecast)
        rawHandle |= bytes32(bytes4(uint32(block.chainid))) >> (1 * 8);
        rawHandle |= bytes32(bytes1(uint8(TEEType.Uint16))) >> (5 * 8);
        rawHandle |= bytes32(bytes1(0x01)) >> (6 * 8);
        uint256 createdAt = block.timestamp;
        bytes32 structHash =
            keccak256(abi.encode(HANDLE_PROOF_TYPEHASH, rawHandle, owner, core, createdAt));
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GATEWAY_PRIVATE_KEY, digest);
        proof = abi.encodePacked(owner, core, createdAt, r, s, v);
        handle = externalEuint16.wrap(rawHandle);
    }

    function _decryptionProof(bytes32 handle, bytes memory plaintext)
        private
        view
        returns (bytes memory proof)
    {
        bytes32 structHash =
            keccak256(abi.encode(DECRYPTION_PROOF_TYPEHASH, handle, keccak256(plaintext)));
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GATEWAY_PRIVATE_KEY, digest);
        proof = abi.encodePacked(r, s, v, plaintext);
    }

    function _domainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256("NoxCompute"),
                keccak256("1"),
                block.chainid,
                noxCompute
            )
        );
    }
}

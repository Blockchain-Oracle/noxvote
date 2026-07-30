// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { NoxCompute } from "@iexec-nox/nox-protocol-contracts/contracts/NoxCompute.sol";
import { TEEType } from "@iexec-nox/nox-protocol-contracts/contracts/utils/TypeUtils.sol";
import { externalEuint16 } from "encrypted-types/EncryptedTypes.sol";
import { ConfidentialBallotCore } from "../../../../src/contracts/core/ConfidentialBallotCore.sol";
import {
    IVotesSnapshotStrategy
} from "../../../../src/contracts/eligibility/IVotesSnapshotStrategy.sol";
import {
    MerkleWeightedAllowlistStrategy
} from "../../../../src/contracts/eligibility/MerkleWeightedAllowlistStrategy.sol";
import {
    RegisterBallotParams
} from "../../../../src/contracts/types/ConfidentialGovernanceTypes.sol";
import { HostClockFixture } from "./CoreFixtures.sol";
import { VotesTokenFixture } from "./EligibilityFixtures.sol";

abstract contract TallyFixture is Test {
    address internal constant NOX_COMPUTE = 0x75C6AF4430cc474b1bb9b8540b7E46D6f8e1C685;
    address internal constant KEEPER = address(0xC105E);
    uint256 internal constant GATEWAY_PRIVATE_KEY = 0xBEEF;
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    address[4] internal voters =
        [address(0xA11CE), address(0xB0B), address(0xCA401), address(0xD0A)];
    uint256[4] private weights = [uint256(4), uint256(3), uint256(2), uint256(1)];

    IVotesSnapshotStrategy internal votesStrategy;
    MerkleWeightedAllowlistStrategy internal merkleStrategy;
    VotesTokenFixture internal token;
    HostClockFixture internal host;
    ConfidentialBallotCore internal core;
    NoxCompute internal noxCompute;
    bytes32 internal ballotId;

    function setUp() public virtual {
        vm.chainId(31_337);
        vm.roll(10);
        NoxCompute implementation = new NoxCompute();
        bytes memory initData = abi.encodeCall(
            NoxCompute.initialize,
            (address(this), address(this), hex"01", vm.addr(GATEWAY_PRIVATE_KEY))
        );
        deployCodeTo(
            "ERC1967Proxy.sol:ERC1967Proxy",
            abi.encode(address(implementation), initData),
            NOX_COMPUTE
        );
        noxCompute = NoxCompute(NOX_COMPUTE);

        votesStrategy = new IVotesSnapshotStrategy();
        merkleStrategy = new MerkleWeightedAllowlistStrategy();
        token = new VotesTokenFixture();
        for (uint256 i = 0; i < voters.length; i++) {
            token.mint(voters[i], weights[i]);
            vm.prank(voters[i]);
            token.delegate(voters[i]);
        }
        vm.roll(11);

        host = new HostClockFixture(address(votesStrategy), address(merkleStrategy), 4);
        core = host.confidentialCore();
        host.setClock(99);
        ballotId = host.register(_params());
        host.setClock(101);
        host.setQuorum(7);
    }

    function _requestTallyWithFloorMet() internal {
        host.setClock(101);
        _castVoters(4);
        host.setClock(201);
        vm.prank(KEEPER);
        core.requestTally(ballotId);
    }

    function _castVoters(uint256 count) internal {
        for (uint256 i = 0; i < count; i++) {
            (externalEuint16 handle, bytes memory proof) =
                _encryptedInput(voters[i], keccak256(abi.encode("choice", i)));
            vm.prank(voters[i]);
            core.castVote(ballotId, 1, handle, proof, "");
        }
    }

    function _decryptionProof(bytes32 handle, bytes memory plaintext, uint256 signerKey)
        internal
        view
        returns (bytes memory proof)
    {
        return _decryptionProofForDomain(
            handle, plaintext, signerKey, block.chainid, NOX_COMPUTE, "1"
        );
    }

    function _decryptionProofForDomain(
        bytes32 handle,
        bytes memory plaintext,
        uint256 signerKey,
        uint256 domainChainId,
        address verifyingContract,
        string memory domainVersion
    ) internal view returns (bytes memory proof) {
        bytes32 structHash = keccak256(
            abi.encode(noxCompute.DECRYPTION_PROOF_TYPEHASH(), handle, keccak256(plaintext))
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(
            _domainSeparator(domainChainId, verifyingContract, domainVersion), structHash
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        proof = abi.encodePacked(r, s, v, plaintext);
    }

    function _encryptedInput(address owner, bytes32 seed)
        private
        view
        returns (externalEuint16 handle, bytes memory proof)
    {
        return _encryptedInputFor(owner, address(core), seed, block.chainid, block.chainid);
    }

    function _encryptedInputFor(
        address owner,
        address app,
        bytes32 seed,
        uint256 handleChainId,
        uint256 domainChainId
    ) internal view returns (externalEuint16 handle, bytes memory proof) {
        return _encryptedInputForHandleDomain(
                owner, app, seed, bytes32(uint256(uint160(app))), handleChainId, domainChainId
            );
    }

    function _encryptedInputForHandleDomain(
        address owner,
        address app,
        bytes32 seed,
        bytes32 handleDomain,
        uint256 handleChainId,
        uint256 domainChainId
    ) internal view returns (externalEuint16 handle, bytes memory proof) {
        bytes32 rawHandle = _confidentialHandle(seed, handleDomain, handleChainId);
        uint256 createdAt = block.timestamp;
        bytes32 structHash = keccak256(
            abi.encode(noxCompute.HANDLE_PROOF_TYPEHASH(), rawHandle, owner, app, createdAt)
        );
        bytes32 digest = MessageHashUtils.toTypedDataHash(
            _domainSeparator(domainChainId, NOX_COMPUTE, "1"), structHash
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GATEWAY_PRIVATE_KEY, digest);
        proof = abi.encodePacked(owner, app, createdAt, r, s, v);
        handle = externalEuint16.wrap(rawHandle);
    }

    function _domainSeparator(
        uint256 domainChainId,
        address verifyingContract,
        string memory domainVersion
    ) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256("NoxCompute"),
                keccak256(bytes(domainVersion)),
                domainChainId,
                verifyingContract
            )
        );
    }

    function _confidentialHandle(bytes32 seed, bytes32 handleDomain, uint256 handleChainId)
        private
        pure
        returns (bytes32 handle)
    {
        handle = keccak256(abi.encode(seed, handleDomain)) >> (7 * 8);
        // The local Nox chain identifier is known to fit in four bytes.
        // forge-lint: disable-next-line(unsafe-typecast)
        handle |= bytes32(bytes4(uint32(handleChainId))) >> (1 * 8);
        handle |= bytes32(bytes1(uint8(TEEType.Uint16))) >> (5 * 8);
        handle |= bytes32(bytes1(0x01)) >> (6 * 8);
    }

    function _params() private view returns (RegisterBallotParams memory params) {
        params = RegisterBallotParams({
            hostProposalId: keccak256("tally-proposal"),
            actionHash: keccak256("tally-action"),
            eligibilityStrategy: address(votesStrategy),
            eligibilityConfig: abi.encode(address(token)),
            snapshot: 10,
            voteStart: 100,
            voteEnd: 200,
            privacyFloor: 4,
            maxReplacements: 2
        });
    }
}

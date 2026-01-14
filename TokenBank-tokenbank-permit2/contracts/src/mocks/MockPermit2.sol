// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IPermit2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MockPermit2 is IPermit2 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    mapping(address => uint256) public nonces;

    bytes32 public immutable DOMAIN_SEPARATOR;

    bytes32 internal constant PERMIT_TRANSFER_FROM_TYPEHASH =
        keccak256(
            "PermitTransferFrom(TokenPermissions permitted,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
        );

    bytes32 internal constant TOKEN_PERMISSIONS_TYPEHASH =
        keccak256(
            "TokenPermissions(address token,uint256 amount)"
        );

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("Permit2"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    /*//////////////////////////////////////////////////////////////
                        PERMIT TRANSFER (SINGLE)
    //////////////////////////////////////////////////////////////*/

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external override {
        // 1. deadline
        require(block.timestamp <= permit.deadline, "Permit expired");

        // 2. nonce
        require(permit.nonce == nonces[owner], "Invalid nonce");
        nonces[owner]++;

        // 3. amount check
        require(
            transferDetails.requestedAmount <= permit.permitted.amount,
            "Amount exceeds permit"
        );

        // 4. signature verification (simplified EIP-712)
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TRANSFER_FROM_TYPEHASH,
                keccak256(
                    abi.encode(
                        TOKEN_PERMISSIONS_TYPEHASH,
                        permit.permitted.token,
                        permit.permitted.amount
                    )
                ),
                permit.nonce,
                permit.deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address signer = digest.recover(signature);
        require(signer == owner, "Invalid signature");

        // 5. transfer
        IERC20(permit.permitted.token).safeTransferFrom(
            owner,
            transferDetails.to,
            transferDetails.requestedAmount
        );
    }

    /*//////////////////////////////////////////////////////////////
                        BATCH (NOT IMPLEMENTED)
    //////////////////////////////////////////////////////////////*/

    function permitTransferFrom(
        PermitBatchTransferFrom calldata,
        SignatureTransferDetails[] calldata,
        address,
        bytes calldata
    ) external pure override {
        revert("MockPermit2: batch not implemented");
    }

    /*//////////////////////////////////////////////////////////////
                        NONCE BITMAP (MOCK)
    //////////////////////////////////////////////////////////////*/

    function nonceBitmap(address, uint256) external view override returns (uint256) {
        return 0;
    }
}

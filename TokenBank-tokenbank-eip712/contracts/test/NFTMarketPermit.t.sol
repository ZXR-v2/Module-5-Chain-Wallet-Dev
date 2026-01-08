// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/NFTMarketPermit.sol";
import "../src/MyTokenPermit.sol";
import "../src/SimpleNFT.sol";

contract NFTMarketPermitTest is Test {
    NFTMarketPermit market;
    MyTokenPermit token;
    SimpleNFT nft;

    address seller;
    address buyer;
    address projectOwner; // The one who signs the whitelist

    uint256 sellerPrivateKey;
    uint256 buyerPrivateKey; // Not strictly needed unless testing permit for token, but useful
    uint256 projectOwnerPrivateKey;

    function setUp() public {
        // Setup accounts
        sellerPrivateKey = 0xA11CE;
        seller = vm.addr(sellerPrivateKey);
        buyerPrivateKey = 0xB0B;
        buyer = vm.addr(buyerPrivateKey);
        projectOwnerPrivateKey = 0xC0FFEE;
        projectOwner = vm.addr(projectOwnerPrivateKey);

        // Deploy contracts
        vm.startPrank(projectOwner);
        token = new MyTokenPermit(1000000); // 1M tokens
        nft = new SimpleNFT();
        market = new NFTMarketPermit(address(token));
        vm.stopPrank();

        // Distribute tokens and NFT
        // Give seller some NFT
        vm.startPrank(projectOwner);
        nft.mint(seller, "ipfs://metadata");
        // Give buyer some tokens
        token.transfer(buyer, 1000 * 10 ** 18);
        vm.stopPrank();

        // Label addresses for better trace
        vm.label(seller, "Seller");
        vm.label(buyer, "Buyer");
        vm.label(projectOwner, "ProjectOwner");
        vm.label(address(market), "Market");
        vm.label(address(token), "Token");
        vm.label(address(nft), "NFT");
    }

    function test_ListNFT() public {
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        uint256 price = 100 * 10 ** 18;
        uint256 listingId = market.list(address(nft), 0, price);

        (
            address _seller,
            address _nftContract,
            uint256 _tokenId,
            uint256 _price,
            bool _active
        ) = market.listings(listingId);
        assertEq(_seller, seller);
        assertEq(_nftContract, address(nft));
        assertEq(_tokenId, 0);
        assertEq(_price, price);
        assertTrue(_active);
        vm.stopPrank();
    }

    function test_PermitBuy_Success() public {
        // 1. List NFT
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        uint256 price = 100 * 10 ** 18;
        uint256 listingId = market.list(address(nft), 0, price);
        vm.stopPrank();

        // 2. Prepare Buyer
        vm.startPrank(buyer);
        token.approve(address(market), price);
        vm.stopPrank();

        // 3. Generate Signature
        uint256 deadline = block.timestamp + 1 hours;

        // Construct the digest
        // WHITELIST_TYPEHASH = keccak256("Whitelist(address user,uint256 listingId,uint256 deadline)");
        bytes32 WHITELIST_TYPEHASH = keccak256(
            "Whitelist(address user,uint256 listingId,uint256 deadline)"
        );

        bytes32 structHash = keccak256(
            abi.encode(WHITELIST_TYPEHASH, buyer, listingId, deadline)
        );

        bytes32 digest = getDigest(structHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            projectOwnerPrivateKey,
            digest
        );

        // 4. Execute PermitBuy
        vm.startPrank(buyer);
        market.permitBuy(listingId, deadline, v, r, s);
        vm.stopPrank();

        // 5. Verify
        assertEq(nft.ownerOf(0), buyer);
        assertEq(token.balanceOf(buyer), 900 * 10 ** 18); // 1000 - 100
        assertEq(token.balanceOf(seller), 100 * 10 ** 18);

        (, , , , bool active) = market.listings(listingId);
        assertFalse(active);
    }

    function test_PermitBuy_Expired() public {
        // 1. List NFT
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        uint256 price = 100 * 10 ** 18;
        uint256 listingId = market.list(address(nft), 0, price);
        vm.stopPrank();

        // 2. Prepare Buyer
        vm.startPrank(buyer);
        token.approve(address(market), price);
        vm.stopPrank();

        // 3. Generate Signature with expired deadline
        uint256 deadline = block.timestamp - 1; // Expired

        bytes32 WHITELIST_TYPEHASH = keccak256(
            "Whitelist(address user,uint256 listingId,uint256 deadline)"
        );
        bytes32 structHash = keccak256(
            abi.encode(WHITELIST_TYPEHASH, buyer, listingId, deadline)
        );
        bytes32 digest = getDigest(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            projectOwnerPrivateKey,
            digest
        );

        // 4. Expect Revert
        vm.startPrank(buyer);
        vm.expectRevert("NFTMarket: signature expired");
        market.permitBuy(listingId, deadline, v, r, s);
        vm.stopPrank();
    }

    function test_PermitBuy_InvalidSignature_WrongSigner() public {
        // 1. List NFT
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        uint256 price = 100 * 10 ** 18;
        uint256 listingId = market.list(address(nft), 0, price);
        vm.stopPrank();

        // 2. Prepare Buyer
        vm.startPrank(buyer);
        token.approve(address(market), price);
        vm.stopPrank();

        // 3. Generate Signature with WRONG key (seller signs instead of project owner)
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 WHITELIST_TYPEHASH = keccak256(
            "Whitelist(address user,uint256 listingId,uint256 deadline)"
        );
        bytes32 structHash = keccak256(
            abi.encode(WHITELIST_TYPEHASH, buyer, listingId, deadline)
        );
        bytes32 digest = getDigest(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sellerPrivateKey, digest); // WRONG SIGNER

        // 4. Expect Revert
        vm.startPrank(buyer);
        vm.expectRevert("NFTMarket: Not in whitelist or invalid signature");
        market.permitBuy(listingId, deadline, v, r, s);
        vm.stopPrank();
    }

    function test_PermitBuy_InvalidSignature_WrongUser() public {
        // 1. List NFT
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        uint256 price = 100 * 10 ** 18;
        uint256 listingId = market.list(address(nft), 0, price);
        vm.stopPrank();

        // 2. Prepare Buyer
        vm.startPrank(buyer);
        token.approve(address(market), price);
        vm.stopPrank();

        // 3. Generate Signature for SELLER instead of BUYER
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 WHITELIST_TYPEHASH = keccak256(
            "Whitelist(address user,uint256 listingId,uint256 deadline)"
        );
        bytes32 structHash = keccak256(
            abi.encode(
                WHITELIST_TYPEHASH,
                seller, // WRONG USER in signature
                listingId,
                deadline
            )
        );
        bytes32 digest = getDigest(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            projectOwnerPrivateKey,
            digest
        );

        // 4. Expect Revert
        vm.startPrank(buyer);
        // The signature will recover to owner IF the message was "seller", but we are verifying "msg.sender" (buyer)
        // So the digest constructed inside contract will be different from what was signed.
        // ecrecover will return a random address or fail, definitely not owner.
        vm.expectRevert("NFTMarket: Not in whitelist or invalid signature");
        market.permitBuy(listingId, deadline, v, r, s);
        vm.stopPrank();
    }

    function getDigest(bytes32 structHash) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("NFTMarket")),
                keccak256(bytes("1")),
                block.chainid,
                address(market)
            )
        );
        return
            keccak256(
                abi.encodePacked("\x19\x01", domainSeparator, structHash)
            );
    }
}

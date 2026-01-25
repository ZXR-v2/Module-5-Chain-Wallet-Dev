// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/NFTMarket_V2.sol";
import "../src/BaseERC20.sol";
import "../src/SimpleNFT.sol";

contract NFTMarketV2Test is Test {
    NFTMarketV2 private market;
    BaseERC20 private token;
    SimpleNFT private nft;

    address private seller = address(0x1);
    address private buyer = address(0x2);
    uint256 private tokenId;
    uint256 private price = 1000 ether;

    function setUp() public {
        token = new BaseERC20("PayToken", "PAY", 1_000_000 ether);
        nft = new SimpleNFT();
        market = new NFTMarketV2(address(token));

        tokenId = nft.mint(seller, "uri");
        token.transfer(buyer, 10_000 ether);
    }

    function _list() internal returns (uint256 listingId) {
        vm.startPrank(seller);
        nft.setApprovalForAll(address(market), true);
        listingId = market.list(address(nft), tokenId, price);
        vm.stopPrank();
    }

    function testList() public {
        uint256 listingId = _list();
        NFTMarketV2.Listing memory listing = market.getListing(listingId);

        assertEq(listing.seller, seller);
        assertEq(listing.nftContract, address(nft));
        assertEq(listing.tokenId, tokenId);
        assertEq(listing.price, price);
        assertTrue(listing.active);
    }

    function testBuyNFT() public {
        uint256 listingId = _list();

        vm.startPrank(buyer);
        token.approve(address(market), price);
        market.buyNFT(listingId);
        vm.stopPrank();

        assertEq(nft.ownerOf(tokenId), buyer);
        assertEq(token.balanceOf(seller), price);

        NFTMarketV2.Listing memory listing = market.getListing(listingId);
        assertFalse(listing.active);
    }

    function testTokensReceived() public {
        uint256 listingId = _list();
        bytes memory data = abi.encode(listingId);

        vm.prank(buyer);
        token.transferWithCallback(address(market), price, data);

        assertEq(nft.ownerOf(tokenId), buyer);
        assertEq(token.balanceOf(seller), price);

        NFTMarketV2.Listing memory listing = market.getListing(listingId);
        assertFalse(listing.active);
    }

    function testCancelListing() public {
        uint256 listingId = _list();

        vm.prank(seller);
        market.cancelListing(listingId);

        NFTMarketV2.Listing memory listing = market.getListing(listingId);
        assertFalse(listing.active);
    }

    function testGetListing() public {
        uint256 listingId = _list();
        NFTMarketV2.Listing memory listing = market.getListing(listingId);

        assertEq(listing.seller, seller);
        assertEq(listing.nftContract, address(nft));
        assertEq(listing.tokenId, tokenId);
        assertEq(listing.price, price);
        assertTrue(listing.active);
    }
}

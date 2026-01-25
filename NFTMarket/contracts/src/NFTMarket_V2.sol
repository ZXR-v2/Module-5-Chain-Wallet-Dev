// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMarketV2
 * @notice Gas-optimized NFT marketplace using ERC20 payments
 */
contract NFTMarketV2 is ReentrancyGuard {
    struct Listing {
        address seller;
        uint96 price;
        address nftContract;
        bool active;
        uint256 tokenId;
    }

    IERC20 public immutable paymentToken;
    mapping(uint256 => Listing) public listings;
    uint256 public listingCounter;

    event NFTListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    event NFTPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    event ListingCancelled(uint256 indexed listingId);

    error InvalidTokenAddress();
    error PriceZero();
    error PriceTooLarge();
    error InvalidNFTContract();
    error NotOwner();
    error MarketNotApproved();
    error ListingNotActive();
    error CannotBuyOwnNFT();
    error PaymentTransferFailed();
    error InvalidToken();
    error InvalidData();
    error IncorrectAmount();
    error NotSeller();

    constructor(address _paymentToken) {
        if (_paymentToken == address(0)) revert InvalidTokenAddress();
        paymentToken = IERC20(_paymentToken);
    }

    function list(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256 listingId) {
        if (price == 0) revert PriceZero();
        if (price > type(uint96).max) revert PriceTooLarge();
        if (nftContract == address(0)) revert InvalidNFTContract();

        IERC721 nft = IERC721(nftContract);
        if (nft.ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (
            !(nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(tokenId) == address(this))
        ) {
            revert MarketNotApproved();
        }

        listingId = listingCounter;
        unchecked {
            listingCounter = listingId + 1;
        }

        listings[listingId] = Listing({
            seller: msg.sender,
            price: uint96(price),
            nftContract: nftContract,
            active: true,
            tokenId: tokenId
        });

        emit NFTListed(listingId, msg.sender, nftContract, tokenId, price);
    }

    function buyNFT(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();

        address seller = listing.seller;
        if (msg.sender == seller) revert CannotBuyOwnNFT();

        uint256 price = listing.price;
        address nftContract = listing.nftContract;
        uint256 tokenId = listing.tokenId;

        listing.active = false;

        if (!paymentToken.transferFrom(msg.sender, seller, price)) {
            revert PaymentTransferFailed();
        }

        IERC721(nftContract).safeTransferFrom(seller, msg.sender, tokenId);
        emit NFTPurchased(listingId, msg.sender, seller, price);
    }

    function tokensReceived(
        address from,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant returns (bool) {
        if (msg.sender != address(paymentToken)) revert InvalidToken();
        if (data.length != 32) revert InvalidData();

        uint256 listingId = abi.decode(data, (uint256));
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();

        address seller = listing.seller;
        if (from == seller) revert CannotBuyOwnNFT();

        uint256 price = listing.price;
        if (amount != price) revert IncorrectAmount();

        address nftContract = listing.nftContract;
        uint256 tokenId = listing.tokenId;

        listing.active = false;

        if (!paymentToken.transfer(seller, amount)) {
            revert PaymentTransferFailed();
        }

        IERC721(nftContract).safeTransferFrom(seller, from, tokenId);
        emit NFTPurchased(listingId, from, seller, amount);

        return true;
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        listing.active = false;
        emit ListingCancelled(listingId);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol"; // 引入 EIP712
import "@openzeppelin/contracts/access/Ownable.sol";         // 引入 Ownable

/**
 * @title NFTMarket
 * @notice NFT marketplace that uses ERC20 tokens for trading
 * @dev Supports both regular buyNFT and callback-based purchases
 */
contract NFTMarketPermit is ReentrancyGuard, EIP712, Ownable {

    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;      // Price in ERC20 tokens
        bool active;
    }

    // 白名单签名的类型哈希
    // 用户地址 + 对应的 ListingID，防止签名被跨商品复用
    bytes32 public constant WHITELIST_TYPEHASH = keccak256("Whitelist(address user,uint256 listingId,uint256 deadline)");

    // The ERC20 token used for payments
    IERC20 public paymentToken;

    // Mapping from listing ID to Listing
    mapping(uint256 => Listing) public listings;
    uint256 public listingCounter;

    // Events
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

    // 构造函数需要初始化 EIP712 的名字和版本
    constructor(address _paymentToken) EIP712("NFTMarket", "1") Ownable(msg.sender) {
        require(_paymentToken != address(0), "Invalid token address");
        paymentToken = IERC20(_paymentToken);
    }


    /**
     * @notice 白名单专用购买函数
     * @param listingId 挂单ID
     * @param v, r, s 项目方生成的签名碎片
     */
    function permitBuy(
        uint256 listingId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        require(block.timestamp <= deadline, "NFTMarket: signature expired");
        // 1. 验证签名
        bytes32 structHash = keccak256(abi.encode(
            WHITELIST_TYPEHASH, 
            msg.sender, 
            listingId, 
            deadline
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        
        // 恢复签名者
        address signer = ecrecover(digest, v, r, s);
        
        // 必须是合约拥有者（项目方）签的名
        require(signer == owner(), "NFTMarket: Not in whitelist or invalid signature");

        // 2. 执行原有的购买逻辑
        _executeBuy(listingId, msg.sender);
    }


    // 将购买逻辑抽离出来，供普通购买和白名单购买公用（或根据需求只保留白名单购买）
    function _executeBuy(uint256 listingId, address buyer) internal {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(buyer != listing.seller, "Cannot buy own NFT");

        listing.active = false;

        require(
            paymentToken.transferFrom(buyer, listing.seller, listing.price),
            "Payment transfer failed"
        );

        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            buyer,
            listing.tokenId
        );

        emit NFTPurchased(listingId, buyer, listing.seller, listing.price);
    }

    /**
     * @notice 已过期，只保留白名单式购买
     * @notice Buy an NFT using ERC20 tokens
     * @param listingId The ID of the listing to purchase
     */
    // function buyNFT(uint256 listingId) external nonReentrant {
    //     Listing storage listing = listings[listingId];
    //     require(listing.active, "Listing not active");
    //     require(msg.sender != listing.seller, "Cannot buy own NFT");

    //     // Mark as inactive
    //     listing.active = false;

    //     // Transfer payment tokens from buyer to seller
    //     require(
    //         paymentToken.transferFrom(msg.sender, listing.seller, listing.price),
    //         "Payment transfer failed"
    //     );

    //     // Transfer NFT from seller to buyer
    //     IERC721(listing.nftContract).safeTransferFrom(
    //         listing.seller,
    //         msg.sender,
    //         listing.tokenId
    //     );

    //     emit NFTPurchased(listingId, msg.sender, listing.seller, listing.price);
    // }

    /**
     * @notice List an NFT for sale
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID of the NFT
     * @param price Price in ERC20 tokens
     * @return listingId The ID of the created listing
     */
    function list(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(nftContract != address(0), "Invalid NFT contract");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(tokenId) == address(this),
            "Market not approved"
        );

        uint256 listingId = listingCounter++;
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit NFTListed(listingId, msg.sender, nftContract, tokenId, price);

        return listingId;
    }


    /**
     * @notice Callback function for receiving tokens
     * @dev Implements purchase when tokens are transferred via transferWithCallback
     * @param from Address sending the tokens (buyer)
     * @param amount Amount of tokens sent
     * @param data Encoded listing ID
     * @return bool Success status
     */
    function tokensReceived(
        address from,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant returns (bool) {
        require(msg.sender == address(paymentToken), "Invalid token");
        require(data.length == 32, "Invalid data");

        // Decode listing ID from data
        uint256 listingId = abi.decode(data, (uint256));

        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(from != listing.seller, "Cannot buy own NFT");
        require(amount == listing.price, "Incorrect amount");

        // Mark as inactive
        listing.active = false;

        // Transfer tokens to seller
        require(
            paymentToken.transfer(listing.seller, amount),
            "Payment transfer failed"
        );

        // Transfer NFT to buyer
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            from,
            listing.tokenId
        );

        emit NFTPurchased(listingId, from, listing.seller, amount);

        return true;
    }

    /**
     * @notice Cancel a listing
     * @param listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        listing.active = false;

        emit ListingCancelled(listingId);
    }

    /**
     * @notice Get listing details
     * @param listingId The ID of the listing
     * @return Listing struct
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
}

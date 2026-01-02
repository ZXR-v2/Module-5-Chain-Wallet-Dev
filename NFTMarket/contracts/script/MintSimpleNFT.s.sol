// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface ISimpleNFT {
    function mint(address to, string calldata uri) external returns (uint256);
}

contract MintSimpleNFT is Script {
    function run() external {
        // 从环境变量读取私钥（必须是 Sepolia 上有 ETH 的账户）
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        address simpleNFT = 0xca436352EbA363493FBfCadE148c2D5603391c47;
        address to = 0x5aba664d6532973C921A6533E20a35438f2E5A40;

        vm.startBroadcast(privateKey);

        uint256 tokenId = ISimpleNFT(simpleNFT).mint(
            to,
            "https://example.com/test-nft.json"
        );

        vm.stopBroadcast();

        console.log("✅ Minted SimpleNFT tokenId =", tokenId);
    }
}

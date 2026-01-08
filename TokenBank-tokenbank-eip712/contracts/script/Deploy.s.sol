// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MyTokenPermit.sol";
import "../src/TokenBankPermit.sol";
import "../src/NFTMarketPermit.sol";
import "../src/SimpleNFT.sol";

contract Deploy is Script {
    function run() external {
        // Get deployer private key from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts to Sepolia...");
        console.log("Deployer address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MyTokenPermit with 1,000,000 initial supply (will be minted as 1,000,000 * 10^18)
        MyTokenPermit token = new MyTokenPermit(1_000_000);
        console.log("MyTokenPermit deployed at:", address(token));

        // 2. Deploy TokenBankPermit with token address
        TokenBankPermit bank = new TokenBankPermit(address(token));
        console.log("TokenBankPermit deployed at:", address(bank));

        // 3. Deploy SimpleNFT (no parameters needed)
        SimpleNFT nft = new SimpleNFT();
        console.log("SimpleNFT deployed at:", address(nft));

        // 4. Deploy NFTMarketPermit with token address as payment token
        NFTMarketPermit market = new NFTMarketPermit(address(token));
        console.log("NFTMarketPermit deployed at:", address(market));

        vm.stopBroadcast();

        // Save deployment addresses to file
        _saveDeploymentAddresses(
            address(token),
            address(bank),
            address(nft),
            address(market)
        );

        console.log("\n=== Deployment Complete ===");
        console.log("MyTokenPermit:", address(token));
        console.log("TokenBankPermit:", address(bank));
        console.log("SimpleNFT:", address(nft));
        console.log("NFTMarketPermit:", address(market));
    }

    /**
     * @dev Save deployment addresses to a file
     */
    function _saveDeploymentAddresses(
        address token,
        address bank,
        address nft,
        address market
    ) internal {
        string memory chainId = vm.toString(block.chainid);
        
        string memory deploymentInfo = string.concat(
            "=== Deployment Addresses (Sepolia Testnet) ===\n\n",
            "MyTokenPermit: ",
            vm.toString(token),
            "\n",
            "TokenBankPermit: ",
            vm.toString(bank),
            "\n",
            "SimpleNFT: ",
            vm.toString(nft),
            "\n",
            "NFTMarketPermit: ",
            vm.toString(market),
            "\n\n",
            "=== Etherscan Links ===\n\n",
            "MyTokenPermit: https://sepolia.etherscan.io/address/",
            vm.toString(token),
            "\n",
            "TokenBankPermit: https://sepolia.etherscan.io/address/",
            vm.toString(bank),
            "\n",
            "SimpleNFT: https://sepolia.etherscan.io/address/",
            vm.toString(nft),
            "\n",
            "NFTMarketPermit: https://sepolia.etherscan.io/address/",
            vm.toString(market),
            "\n"
        );

        // Write to deployments/deployments.txt file (deployments/ directory is allowed)
        vm.writeFile("deployments/deployments.txt", deploymentInfo);
        
        // Also write JSON format for easier parsing
        string memory json = "deployments";
        json = vm.serializeAddress(json, "MyTokenPermit", token);
        json = vm.serializeAddress(json, "TokenBankPermit", bank);
        json = vm.serializeAddress(json, "SimpleNFT", nft);
        json = vm.serializeAddress(json, "NFTMarketPermit", market);
        
        vm.writeJson(json, string.concat("deployments/deployments_", chainId, ".json"));
    }
}

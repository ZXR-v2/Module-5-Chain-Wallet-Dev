// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

/**
 * @title DeployPermit2Only
 * @notice Deploy Permit2 contract locally
 * 
 * Prerequisites:
 * 1. Install Permit2: forge install Uniswap/permit2
 * 2. Update remappings.txt to include: permit2/=lib/permit2/src/
 * 
 * Usage:
 *   forge script script/DeployPermit2Only.s.sol --rpc-url http://localhost:8545 --broadcast
 */
contract DeployPermit2Only is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying Permit2 to local network...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Note: Uncomment the following lines after installing Permit2
        // import "permit2/src/Permit2.sol";
        // Permit2 permit2 = new Permit2();
        // console.log("Permit2 deployed to:", address(permit2));
        
        console.log("\n=== IMPORTANT ===");
        console.log("To use this script, you need to:");
        console.log("1. Install Permit2: forge install Uniswap/permit2");
        console.log("2. Update remappings.txt");
        console.log("3. Uncomment the Permit2 deployment code above");
        console.log("\nOR use the Fork mode approach (recommended) - see LOCAL_TESTING.md");
        
        vm.stopBroadcast();
    }
}

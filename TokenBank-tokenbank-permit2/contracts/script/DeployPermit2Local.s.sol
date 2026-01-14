// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MyToken.sol";
import "../src/TokenBankPermit2.sol";

/**
 * @title DeployPermit2Local
 * @notice Deployment script for local testing
 * 
 * For local testing, you have two options:
 * 
 * Option 1: Use Anvil fork mode (RECOMMENDED - No Permit2 deployment needed)
 *   anvil --fork-url $SEPOLIA_RPC_URL
 *   Then use PERMIT2_ADDRESS = 0x000000000022D473030F116dDEE9F6B43aC78BA3
 * 
 * Option 2: Deploy Permit2 locally
 *   First install Permit2: forge install Uniswap/permit2
 *   Then deploy Permit2 and use its address
 */
contract DeployPermit2Local is Script {
    // Option 1: Use the official Permit2 address (works with fork mode)
    address constant PERMIT2_OFFICIAL = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    
    // Option 2: Set this to your locally deployed Permit2 address
    // address constant PERMIT2_LOCAL = address(0); // Replace with actual address
    
    function run() external {
        // Use the first account from Anvil (default: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying to local network...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Deploy MyToken with 1,000,000 initial supply
        MyToken token = new MyToken(1_000_000);
        console.log("MyToken deployed to:", address(token));
        
        // Deploy TokenBankPermit2
        // Option 1: Use official Permit2 (requires fork mode)
        TokenBankPermit2 bank = new TokenBankPermit2(address(token), PERMIT2_OFFICIAL);
        
        // Option 2: Use locally deployed Permit2 (uncomment and use PERMIT2_LOCAL)
        // TokenBankPermit2 bank = new TokenBankPermit2(address(token), PERMIT2_LOCAL);
        
        console.log("TokenBankPermit2 deployed to:", address(bank));
        console.log("Using Permit2 at:", PERMIT2_OFFICIAL);
        console.log("\n=== Deployment Summary ===");
        console.log("MyToken:", address(token));
        console.log("TokenBankPermit2:", address(bank));
        console.log("Permit2:", PERMIT2_OFFICIAL);
        
        vm.stopBroadcast();
    }
}

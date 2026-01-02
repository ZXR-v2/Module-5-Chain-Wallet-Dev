// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SimpleMultiSigWallet.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        address;
        owners[0] = vm.addr(1);
        owners[1] = vm.addr(2);
        owners[2] = vm.addr(3);

        new SimpleMultiSigWallet(owners, 2);

        vm.stopBroadcast();
    }
}

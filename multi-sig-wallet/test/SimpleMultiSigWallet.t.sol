// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SimpleMultiSigWallet.sol";

contract SimpleMultiSigWalletTest is Test {
    SimpleMultiSigWallet wallet;

    address owner1 = address(0x1);
    address owner2 = address(0x2);
    address owner3 = address(0x3);
    address receiver = address(0x99);

    function setUp() public {
        // ✅ 关键：先声明 memory 数组，并指定长度
        address[] memory owners = new address[](3);
        owners[0] = owner1;
        owners[1] = owner2;
        owners[2] = owner3;

        wallet = new SimpleMultiSigWallet(owners, 2);

        // 给多签钱包打钱
        vm.deal(address(wallet), 10 ether);
    }

    function testSubmitConfirmExecute() public {
        // owner1 提交提案
        vm.startPrank(owner1);
        wallet.submitTransaction(receiver, 1 ether, "");
        wallet.confirmTransaction(0); // Works because startPrank is active
        vm.stopPrank();

        // owner2 确认
        vm.prank(owner2);
        wallet.confirmTransaction(0);

        uint256 beforeBalance = receiver.balance;

        // 任何人都可以执行
        wallet.executeTransaction(0);

        uint256 afterBalance = receiver.balance;

        assertEq(afterBalance - beforeBalance, 1 ether);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TokenBankPermit.sol";
import "../src/MyTokenPermit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

contract TokenBankPermitTest is Test {
    TokenBankPermit bank;
    MyTokenPermit token;

    address user;
    address otherUser;
    
    uint256 userPrivateKey;
    uint256 otherUserPrivateKey;

    function setUp() public {
        // Setup accounts
        userPrivateKey = 0xA11CE;
        user = vm.addr(userPrivateKey);
        otherUserPrivateKey = 0xB0B;
        otherUser = vm.addr(otherUserPrivateKey);

        // Deploy contracts
        token = new MyTokenPermit(1000000); // 1M tokens
        bank = new TokenBankPermit(address(token));

        // Distribute tokens
        token.transfer(user, 1000 * 10 ** 18);
        token.transfer(otherUser, 500 * 10 ** 18);

        // Label addresses for better trace
        vm.label(user, "User");
        vm.label(otherUser, "OtherUser");
        vm.label(address(bank), "Bank");
        vm.label(address(token), "Token");
    }

    // ============ permitDeposit Tests ============

    function test_PermitDeposit_Success() public {
        uint256 amount = 100 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;

        // Generate permit signature
        (uint8 v, bytes32 r, bytes32 s) = _getPermitSignature(
            user,
            address(bank),
            amount,
            deadline,
            userPrivateKey
        );

        // Verify initial state
        assertEq(bank.balanceOf(user), 0);
        assertEq(token.balanceOf(user), 1000 * 10 ** 18);

        // Execute permitDeposit
        vm.startPrank(user);
        bank.permitDeposit(amount, deadline, v, r, s);
        vm.stopPrank();

        // Verify final state
        assertEq(bank.balanceOf(user), amount);
        assertEq(token.balanceOf(user), 900 * 10 ** 18); // 1000 - 100
        assertEq(token.balanceOf(address(bank)), amount);
    }

    function test_PermitDeposit_ZeroAmount() public {
        uint256 amount = 0;
        uint256 deadline = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = _getPermitSignature(
            user,
            address(bank),
            amount,
            deadline,
            userPrivateKey
        );

        vm.startPrank(user);
        vm.expectRevert(TokenBankPermit.ZeroAmount.selector);
        bank.permitDeposit(amount, deadline, v, r, s);
        vm.stopPrank();
    }

    function test_PermitDeposit_ExpiredDeadline() public {
        uint256 amount = 100 * 10 ** 18;
        uint256 deadline = block.timestamp - 1; // Expired

        (uint8 v, bytes32 r, bytes32 s) = _getPermitSignature(
            user,
            address(bank),
            amount,
            deadline,
            userPrivateKey
        );

        vm.startPrank(user);
        vm.expectRevert(TokenBankPermit.PermitFailed.selector);
        bank.permitDeposit(amount, deadline, v, r, s);
        vm.stopPrank();
    }

    function test_PermitDeposit_InvalidSignature() public {
        uint256 amount = 100 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;

        // Sign with wrong private key (otherUser's key instead of user's key)
        (uint8 v, bytes32 r, bytes32 s) = _getPermitSignature(
            user,
            address(bank),
            amount,
            deadline,
            otherUserPrivateKey // WRONG KEY
        );

        vm.startPrank(user);
        vm.expectRevert(TokenBankPermit.PermitFailed.selector);
        bank.permitDeposit(amount, deadline, v, r, s);
        vm.stopPrank();
    }

    function test_PermitDeposit_WrongSpender() public {
        uint256 amount = 100 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;

        // Sign permit for wrong spender
        (uint8 v, bytes32 r, bytes32 s) = _getPermitSignature(
            user,
            otherUser, // WRONG SPENDER (should be address(bank))
            amount,
            deadline,
            userPrivateKey
        );

        vm.startPrank(user);
        vm.expectRevert(TokenBankPermit.PermitFailed.selector);
        bank.permitDeposit(amount, deadline, v, r, s);
        vm.stopPrank();
    }

    function test_PermitDeposit_InsufficientBalance() public {
        uint256 amount = 2000 * 10 ** 18; // More than user has (1000)
        uint256 deadline = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = _getPermitSignature(
            user,
            address(bank),
            amount,
            deadline,
            userPrivateKey
        );

        vm.startPrank(user);
        // Permit will succeed, but transferFrom will fail
        vm.expectRevert(); // Expect revert from SafeERC20
        bank.permitDeposit(amount, deadline, v, r, s);
        vm.stopPrank();
    }

    function test_PermitDeposit_EventEmitted() public {
        uint256 amount = 100 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = _getPermitSignature(
            user,
            address(bank),
            amount,
            deadline,
            userPrivateKey
        );

        vm.startPrank(user);
        vm.expectEmit(true, false, false, false);
        emit TokenBankPermit.PermitDeposit(user, amount);
        bank.permitDeposit(amount, deadline, v, r, s);
        vm.stopPrank();
    }

    // ============ withdraw Tests ============

    function test_Withdraw_Success() public {
        uint256 depositAmount = 200 * 10 ** 18;
        uint256 withdrawAmount = 150 * 10 ** 18;

        // First deposit some tokens
        vm.startPrank(user);
        token.approve(address(bank), depositAmount);
        bank.deposit(depositAmount);
        vm.stopPrank();

        // Verify initial state
        assertEq(bank.balanceOf(user), depositAmount);
        uint256 initialTokenBalance = token.balanceOf(user);

        // Withdraw
        vm.startPrank(user);
        bank.withdraw(withdrawAmount);
        vm.stopPrank();

        // Verify final state
        assertEq(bank.balanceOf(user), depositAmount - withdrawAmount);
        assertEq(token.balanceOf(user), initialTokenBalance + withdrawAmount);
        assertEq(token.balanceOf(address(bank)), depositAmount - withdrawAmount);
    }

    function test_Withdraw_ZeroAmount() public {
        uint256 depositAmount = 100 * 10 ** 18;

        // First deposit
        vm.startPrank(user);
        token.approve(address(bank), depositAmount);
        bank.deposit(depositAmount);
        vm.stopPrank();

        // Try to withdraw zero
        vm.startPrank(user);
        vm.expectRevert(TokenBankPermit.ZeroAmount.selector);
        bank.withdraw(0);
        vm.stopPrank();
    }

    function test_Withdraw_InsufficientBalance() public {
        uint256 depositAmount = 100 * 10 ** 18;
        uint256 withdrawAmount = 150 * 10 ** 18; // More than deposited

        // First deposit
        vm.startPrank(user);
        token.approve(address(bank), depositAmount);
        bank.deposit(depositAmount);
        vm.stopPrank();

        // Try to withdraw more than balance
        vm.startPrank(user);
        vm.expectRevert(TokenBankPermit.InsufficientBalance.selector);
        bank.withdraw(withdrawAmount);
        vm.stopPrank();
    }

    function test_Withdraw_AllBalance() public {
        uint256 depositAmount = 300 * 10 ** 18;

        // Deposit
        vm.startPrank(user);
        token.approve(address(bank), depositAmount);
        bank.deposit(depositAmount);
        vm.stopPrank();

        uint256 initialTokenBalance = token.balanceOf(user);

        // Withdraw all
        vm.startPrank(user);
        bank.withdraw(depositAmount);
        vm.stopPrank();

        assertEq(bank.balanceOf(user), 0);
        assertEq(token.balanceOf(user), initialTokenBalance + depositAmount);
        assertEq(token.balanceOf(address(bank)), 0);
    }

    function test_Withdraw_EventEmitted() public {
        uint256 depositAmount = 100 * 10 ** 18;
        uint256 withdrawAmount = 50 * 10 ** 18;

        // Deposit first
        vm.startPrank(user);
        token.approve(address(bank), depositAmount);
        bank.deposit(depositAmount);
        vm.stopPrank();

        // Withdraw and check event
        vm.startPrank(user);
        vm.expectEmit(true, false, false, false);
        emit TokenBankPermit.Withdraw(user, withdrawAmount);
        bank.withdraw(withdrawAmount);
        vm.stopPrank();
    }

    function test_Withdraw_MultipleTimes() public {
        uint256 depositAmount = 500 * 10 ** 18;

        // Deposit
        vm.startPrank(user);
        token.approve(address(bank), depositAmount);
        bank.deposit(depositAmount);
        vm.stopPrank();

        uint256 initialTokenBalance = token.balanceOf(user);

        // First withdraw
        vm.startPrank(user);
        bank.withdraw(100 * 10 ** 18);
        vm.stopPrank();
        assertEq(bank.balanceOf(user), 400 * 10 ** 18);

        // Second withdraw
        vm.startPrank(user);
        bank.withdraw(200 * 10 ** 18);
        vm.stopPrank();
        assertEq(bank.balanceOf(user), 200 * 10 ** 18);

        // Third withdraw
        vm.startPrank(user);
        bank.withdraw(200 * 10 ** 18);
        vm.stopPrank();
        assertEq(bank.balanceOf(user), 0);
        assertEq(token.balanceOf(user), initialTokenBalance + depositAmount);
    }

    // ============ Integration Tests ============

    function test_PermitDeposit_Then_Withdraw() public {
        uint256 amount = 250 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;

        // Generate permit signature
        (uint8 v, bytes32 r, bytes32 s) = _getPermitSignature(
            user,
            address(bank),
            amount,
            deadline,
            userPrivateKey
        );

        // Permit deposit
        vm.startPrank(user);
        bank.permitDeposit(amount, deadline, v, r, s);
        vm.stopPrank();

        assertEq(bank.balanceOf(user), amount);

        // Withdraw
        uint256 withdrawAmount = 100 * 10 ** 18;
        vm.startPrank(user);
        bank.withdraw(withdrawAmount);
        vm.stopPrank();

        assertEq(bank.balanceOf(user), amount - withdrawAmount);
        assertEq(token.balanceOf(address(bank)), amount - withdrawAmount);
    }
    // end of Integration Tests     
    // ============ Helper Functions ============

    /**
     * @dev Generate EIP-2612 permit signature
     * @param owner The token owner
     * @param spender The spender address
     * @param value The amount to permit
     * @param deadline The deadline timestamp
     * @param ownerPrivateKey The owner's private key
     * @return v ECDSA signature parameter
     * @return r ECDSA signature parameter
     * @return s ECDSA signature parameter
     */
    function _getPermitSignature(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint256 ownerPrivateKey
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        IERC20Permit permit = IERC20Permit(address(token));

        // Get domain separator
        bytes32 domainSeparator = permit.DOMAIN_SEPARATOR();

        // Get permit typehash
        bytes32 PERMIT_TYPEHASH = keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

        // Get nonce
        uint256 nonce = permit.nonces(owner);

        // Construct permit struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        // Construct digest
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        // Sign digest
        return vm.sign(ownerPrivateKey, digest);
    }
}

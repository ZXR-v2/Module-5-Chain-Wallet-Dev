// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleMultiSigWallet {
    event Deposit(address indexed sender, uint256 amount);
    event Submit(
        uint256 indexed txId,
        address indexed to,
        uint256 value,
        bytes data
    );
    event Confirm(address indexed owner, uint256 indexed txId);
    event Execute(uint256 indexed txId);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmCount;
    }

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmed;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint256 txId) {
        require(txId < transactions.length, "tx not exists");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "tx executed");
        _;
    }

    modifier notConfirmed(uint256 txId) {
        require(!confirmed[txId][msg.sender], "already confirmed");
        _;
    }

    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "owners required");
        require(
            _required > 0 && _required <= _owners.length,
            "invalid required"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "zero owner");
            require(!isOwner[owner], "duplicate owner");

            isOwner[owner] = true;
            owners.push(owner);
        }
        required = _required;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data
    ) external onlyOwner {
        transactions.push(
            Transaction({
                to: to,
                value: value,
                data: data,
                executed: false,
                confirmCount: 0
            })
        );

        emit Submit(transactions.length - 1, to, value, data);
    }

    function confirmTransaction(
        uint256 txId
    ) external onlyOwner txExists(txId) notExecuted(txId) notConfirmed(txId) {
        confirmed[txId][msg.sender] = true;
        transactions[txId].confirmCount += 1;
        emit Confirm(msg.sender, txId);
    }

    function executeTransaction(
        uint256 txId
    ) external txExists(txId) notExecuted(txId) {
        Transaction storage txn = transactions[txId];
        require(txn.confirmCount >= required, "not enough confirmations");

        txn.executed = true;
        (bool ok, ) = txn.to.call{value: txn.value}(txn.data);
        require(ok, "tx failed");

        emit Execute(txId);
    }
}

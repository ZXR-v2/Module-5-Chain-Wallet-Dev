# 运行测试命令

在 WSL 中运行以下命令来执行测试并将结果保存到文件：

```bash
cd /mnt/d/Module-5-Chain-Wallet-Dev/TokenBank-tokenbank-permit2/contracts
forge test --match-path 'test/TokenBankPermit2.t.sol' -vvv 2>&1 | tee test_output.txt
```

或者如果你想要更详细的输出：

```bash
forge test --match-path 'test/TokenBankPermit2.t.sol' -vvvv 2>&1 | tee test_output.txt
```

测试结果将同时显示在终端和保存到 `test_output.txt` 文件中。

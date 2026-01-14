# 部署到 Sepolia 测试网

## 前置要求

1. **环境变量设置**

在部署之前，需要设置以下环境变量：

```bash
export PRIVATE_KEY=你的私钥（不带0x前缀）
export SEPOLIA_RPC_URL=你的Sepolia RPC URL（例如：https://sepolia.infura.io/v3/YOUR_KEY）
export ETHERSCAN_API_KEY=你的Etherscan API Key（可选，用于合约验证）
```

或者创建 `.env` 文件（不会被提交到 git）：

```bash
PRIVATE_KEY=你的私钥
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=你的Etherscan API Key
```

## 部署命令

### 方法1：使用环境变量（推荐）

```bash
cd /mnt/d/Module-5-Chain-Wallet-Dev/TokenBank-tokenbank-permit2/contracts

# 设置环境变量
export PRIVATE_KEY=你的私钥
export SEPOLIA_RPC_URL=你的RPC URL
export ETHERSCAN_API_KEY=你的API Key  # 可选

# 运行部署脚本
forge script script/DeployPermit2.s.sol \
    --rpc-url sepolia \
    --broadcast \
    --verify \
    -vvvv
```

### 方法2：使用 .env 文件

如果使用 `.env` 文件，Foundry 会自动加载：

```bash
cd /mnt/d/Module-5-Chain-Wallet-Dev/TokenBank-tokenbank-permit2/contracts

forge script script/DeployPermit2.s.sol \
    --rpc-url sepolia \
    --broadcast \
    --verify \
    -vvvv
```

### 方法3：仅部署（不验证）

```bash
forge script script/DeployPermit2.s.sol \
    --rpc-url sepolia \
    --broadcast \
    -vvvv
```

## 部署说明

- 脚本会部署两个合约：
  1. **MyToken**: ERC20 代币合约（初始供应量：1,000,000）
  2. **TokenBankPermit2**: 使用官方 Permit2 合约的 TokenBank

- Permit2 合约地址（已部署）：
  `0x000000000022D473030F116dDEE9F6B43aC78BA3`

## 获取 RPC URL

可以从以下服务获取 Sepolia RPC URL：
- [Infura](https://infura.io/)
- [Alchemy](https://www.alchemy.com/)
- [QuickNode](https://www.quicknode.com/)

## 获取 Etherscan API Key

- 访问 [Etherscan](https://etherscan.io/)
- 注册账号并创建 API Key

## 注意事项

⚠️ **安全提醒**：
- 永远不要将私钥提交到 Git
- 确保账户有足够的 Sepolia ETH 支付 gas 费用
- 使用测试网私钥，不要使用主网私钥

## 部署后

部署完成后，脚本会输出合约地址。可以将这些地址用于前端配置。

Script ran successfully.

== Logs ==
  MyToken deployed to: 0x36F3b5d0b358b6722DB13FbA3E08CED108158432
  TokenBankPermit2 deployed to: 0xfc96C7C9B69536D99cbBD54C66e82FA9120128EA
  Using Permit2 at: 0x000000000022D473030F116dDEE9F6B43aC78BA3

## Setting up 1 EVM.
==========================
Simulated On-chain Traces:

  [1749237] → new MyToken@0x36F3b5d0b358b6722DB13FbA3E08CED108158432
    ├─ emit OwnershipTransferred(previousOwner: 0x0000000000000000000000000000000000000000, newOwner: 0x5aba664d6532973C921A6533E20a35438f2E5A40)
    ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: 0x5aba664d6532973C921A6533E20a35438f2E5A40, value: 1000000000000000000000000 [1e24])
    └─ ← [Return] 8137 bytes of code

  [816452] → new TokenBankPermit2@0xfc96C7C9B69536D99cbBD54C66e82FA9120128EA
    └─ ← [Return] 3963 bytes of code


==========================

Chain 11155111

Estimated gas price: 1.972003266 gwei

Estimated total gas used for script: 3794493

Estimated amount required: 0.007482752588814138 ETH

==========================

##### sepolia
✅  [Success] Hash: 0x0a80af2187547320d0ff940abd17c20098018a22559cd4295ca36986a9b8faee
Contract Address: 0x36F3b5d0b358b6722DB13FbA3E08CED108158432
Block: 10036268
Paid: 0.002206423763922147 ETH (1981397 gas * 1.113569751 gwei)


##### sepolia
✅  [Success] Hash: 0x6a4ebda86974f2535e648ceb1294a4d015a9cf2f8c401e10985a3f10858def84
Contract Address: 0xfc96C7C9B69536D99cbBD54C66e82FA9120128EA
Block: 10036270
Paid: 0.000931465617755032 ETH (937444 gas * 0.993622678 gwei)

✅ Sequence #1 on sepolia | Total Paid: 0.003137889381677179 ETH (2918841 gas * avg 1.053596214 gwei)


==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
##
# 本地测试指南 - Permit2 部署

本指南说明如何在本地测试环境中部署和测试 TokenBankPermit2 合约。

## 方法 1: 使用 Anvil Fork 模式（推荐）⭐

这是最简单的方法，无需部署 Permit2 合约。

### 步骤

1. **启动 Anvil Fork 模式**
   ```bash
   # Fork Sepolia 测试网（包含已部署的 Permit2）
   anvil --fork-url $SEPOLIA_RPC_URL
   
   # 或者 fork 主网
   anvil --fork-url $MAINNET_RPC_URL
   ```

2. **部署合约到本地 Fork**
   ```bash
   # 在 contracts 目录下
   forge script script/DeployPermit2Local.s.sol \
     --rpc-url http://localhost:8545 \
     --broadcast \
     -vvv
   ```

3. **测试合约**
   ```bash
   # 运行测试
   forge test --fork-url http://localhost:8545 -vvv
   ```

### 优点
- ✅ 无需部署 Permit2
- ✅ 使用真实的 Permit2 合约（地址: `0x000000000022D473030F116dDEE9F6B43aC78BA3`）
- ✅ 快速设置
- ✅ 模拟真实网络环境

---

## 方法 2: 完整本地部署（需要部署 Permit2）

如果你想在完全本地的环境中部署（不 fork），需要先部署 Permit2 合约。

### 步骤

1. **安装 Permit2 依赖**
   ```bash
   cd contracts
   forge install Uniswap/permit2
   ```

2. **更新 remappings.txt**
   添加 Permit2 的路径映射：
   ```
   permit2/=lib/permit2/src/
   ```

3. **创建 Permit2 部署脚本**
   
   创建一个新文件 `script/DeployPermit2Only.s.sol`:
   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.20;
   
   import "forge-std/Script.sol";
   import "permit2/src/Permit2.sol";
   
   contract DeployPermit2Only is Script {
       function run() external {
           uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
           
           vm.startBroadcast(deployerPrivateKey);
           
           Permit2 permit2 = new Permit2();
           console.log("Permit2 deployed to:", address(permit2));
           
           vm.stopBroadcast();
       }
   }
   ```

4. **启动本地 Anvil 节点**
   ```bash
   anvil
   ```

5. **部署 Permit2**
   ```bash
   forge script script/DeployPermit2Only.s.sol \
     --rpc-url http://localhost:8545 \
     --broadcast \
     -vvv
   ```

6. **部署 TokenBankPermit2**
   
   修改 `script/DeployPermit2Local.s.sol`，使用本地部署的 Permit2 地址：
   ```solidity
   address constant PERMIT2_LOCAL = 0x你的Permit2地址;
   ```
   
   然后部署：
   ```bash
   forge script script/DeployPermit2Local.s.sol \
     --rpc-url http://localhost:8545 \
     --broadcast \
     -vvv
   ```

### 注意事项

⚠️ **重要**: Permit2 合约相对复杂，如果只是测试 TokenBankPermit2 的功能，**强烈建议使用方法 1（Fork 模式）**。

---

## 快速开始（推荐方法）

```bash
# 1. 启动 Anvil Fork（在 contracts 目录）
anvil --fork-url $SEPOLIA_RPC_URL

# 2. 在另一个终端，部署合约
cd contracts
forge script script/DeployPermit2Local.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  -vvv

# 3. 运行测试
forge test --fork-url http://localhost:8545 -vvv
```

## 环境变量

如果需要使用自定义私钥，设置环境变量：
```bash
export PRIVATE_KEY=你的私钥
```

默认使用 Anvil 的第一个账户私钥（仅用于本地测试）。

## 常见问题

### Q: 为什么推荐使用 Fork 模式？
A: Fork 模式使用真实网络上已部署的 Permit2 合约，更接近生产环境，且无需处理 Permit2 的复杂部署逻辑。

### Q: Permit2 的官方地址是什么？
A: 
- 主网: `0x000000000022D473030F116dDEE9F6B43aC78BA3`
- Sepolia: `0x000000000022D473030F116dDEE9F6B43aC78BA3`（相同地址）

### Q: 如何验证部署是否成功？
A: 查看部署脚本的输出，会打印所有合约地址。你也可以使用 cast 命令查询：
```bash
cast call <TokenBankPermit2地址> "permit2()(address)" --rpc-url http://localhost:8545
```

# NFTMarket 智能合约

本目录包含NFT市场的智能合约代码，使用Foundry开发框架。

## 合约说明

### SimpleNFT.sol
简单的ERC721 NFT合约，用于测试市场功能。

### BaseERC20.sol
带回调功能的ERC20代币合约，支持 `transferWithCallback` 实现一步购买。

### NFTMarket.sol
基础版本的NFT市场合约。

**功能：** NFT上架、购买、取消上架、回调购买

### NFTMarket_V2.sol
Gas优化版本的NFT市场合约。

**优化技术：**
- 存储槽打包（5槽 → 3槽）
- `paymentToken` 设为 immutable
- 自定义错误替换 require 字符串
- unchecked 递增
- 存储变量缓存

**Gas 节省：**
| 函数 | V1 Gas | V2 Gas | 节省 |
|------|--------|--------|------|
| `list()` | 152,028 | 108,285 | -28.8% |
| `buyNFT()` | 113,087 | 111,467 | -1.4% |
| `getListing()` | 12,200 | 8,359 | -31.5% |
| 部署成本 | 1,687,660 | 1,395,166 | -17.3% |

详细分析见 [gas_compare.md](./gas_compare.md)

## 开发环境设置

### 1. 安装 Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件填入你的配置
```

### 3. 安装依赖

```bash
forge install
```

### 4. 编译合约

```bash
forge build
```

### 5. 运行测试

```bash
# 运行所有测试
forge test

# 运行 V1 测试并生成 gas 报告
forge test --gas-report --match-path test/NFTMarketV1.t.sol

# 运行 V2 测试并生成 gas 报告
forge test --gas-report --match-path test/NFTMarketV2.t.sol
```

### 6. 部署合约

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url sepolia --broadcast --verify
```

## 导出ABI

导出合约ABI用于前端集成：

```bash
cat out/NFTMarket.sol/NFTMarket.json | jq .abi > ../web/contracts/NFTMarket.json
cat out/NFTMarket_V2.sol/NFTMarketV2.json | jq .abi > ../web/contracts/NFTMarketV2.json
cat out/SimpleNFT.sol/SimpleNFT.json | jq .abi > ../web/contracts/SimpleNFT.json
```

## 项目结构

```
contracts/
├── src/
│   ├── NFTMarket.sol      # 基础版市场合约
│   ├── NFTMarket_V2.sol   # Gas优化版市场合约
│   ├── SimpleNFT.sol      # 测试用NFT合约
│   └── BaseERC20.sol      # 带回调的ERC20合约
├── test/
│   ├── NFTMarketV1.t.sol  # V1 测试用例
│   └── NFTMarketV2.t.sol  # V2 测试用例
├── script/
│   ├── Deploy.s.sol       # 部署脚本
│   └── MintSimpleNFT.s.sol # NFT铸造脚本
├── gas_compare.md         # Gas对比分析报告
└── foundry.toml           # Foundry配置
```

## 学员替换指南

1. 修改 `src/` 目录下的合约文件
2. 更新 `script/Deploy.s.sol` 部署脚本
3. 重新编译: `forge build`
4. 运行测试: `forge test`
5. 部署新合约并导出ABI

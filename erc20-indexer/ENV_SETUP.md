# 环境变量配置指南

本文档详细说明如何创建和配置 `.env` 文件。

## 后端 .env 配置

### 1. 创建后端 .env 文件

在 `erc20-indexer/backend/` 目录下创建 `.env` 文件：

```bash
cd erc20-indexer/backend
touch .env  # Linux/Mac
# 或
type nul > .env  # Windows
```

### 2. 后端 .env 文件内容

```env
# RPC URL - 区块链节点地址
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# 或者使用 Alchemy
# RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# 或者使用本地节点
# RPC_URL=http://localhost:8545

# ERC20 Token 合约地址（你发行的 Token 地址）
TOKEN_ADDRESS=0x1F7cA1b9e2dE35d2c08092fd32E28Fb505ee30b6

# Token 小数位数（通常是 18）
TOKEN_DECIMALS=18

# 起始区块（可选：用于首次索引，设置后不再请求 Etherscan）
START_BLOCK=12345678

# Etherscan API Key（可选：未设置 START_BLOCK 时用于自动获取合约部署区块）
ETHERSCAN_API_KEY=your_etherscan_api_key
# 可选：自定义 Etherscan API Base URL（默认 Sepolia）
ETHERSCAN_BASE_URL=https://api-sepolia.etherscan.io/api

# API 服务器端口
PORT=3001

# 私钥（仅用于模拟转账脚本，格式：0x开头）
PRIVATE_KEY=0x你的私钥（不要包含0x前缀，或者包含都可以）
```

### 3. 如何获取各个配置项

#### RPC_URL（必需）

**选项 1: 使用 Infura（推荐）**
1. 访问 https://infura.io/
2. 注册账号并创建项目
3. 选择 Sepolia 网络
4. 复制 HTTPS URL，格式：`https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

**选项 2: 使用 Alchemy**
1. 访问 https://www.alchemy.com/
2. 注册账号并创建应用
3. 选择 Sepolia 网络
4. 复制 HTTPS URL，格式：`https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

**选项 3: 使用公共 RPC（不推荐，有速率限制）**
- Sepolia 公共 RPC: `https://rpc.sepolia.org`
- 注意：公共 RPC 有请求频率限制，可能影响索引性能

**选项 4: 本地节点（如果运行本地链）**
- 如果使用 Foundry Anvil: `http://localhost:8545`
- 如果使用 Hardhat: `http://localhost:8545`

#### TOKEN_ADDRESS（必需）

这是你之前发行的 ERC20 Token 合约地址。

- 如果已经部署过，使用部署时的地址
- 示例：`0x1F7cA1b9e2dE35d2c08092fd32E28Fb505ee30b6`
- 格式：必须以 `0x` 开头，42 个字符（0x + 40 个十六进制字符）

#### TOKEN_DECIMALS（必需）

Token 的小数位数，大多数 ERC20 Token 使用 18 位小数。

- 常见值：`18`
- 如果不确定，可以在 Etherscan 上查看合约信息

#### START_BLOCK（可选）

首次索引的起始区块号，设置后会直接从该区块开始扫描，跳过从 0 扫描。

- 建议设置为**合约部署区块**
- 示例：`12345678`

#### ETHERSCAN_API_KEY（可选）

当未设置 `START_BLOCK` 时，后端会自动调用 Etherscan 获取合约部署区块。

- 访问 https://etherscan.io/apis 获取 API Key
- Sepolia 使用 `https://api-sepolia.etherscan.io/api`

#### PORT（可选）

API 服务器端口，默认是 3001。

- 如果 3001 端口被占用，可以改为其他端口，如 `3002`

#### PRIVATE_KEY（可选，仅用于模拟转账）

**⚠️ 安全警告：私钥非常敏感，不要提交到 Git！**

只有在运行 `npm run simulate` 模拟转账时才需要。

**如何获取私钥：**
1. 从 MetaMask 导出（不推荐，有安全风险）
2. 使用测试钱包的私钥（仅用于测试）
3. 如果使用 Foundry Anvil，可以使用默认测试账户的私钥

**格式：**
- 可以包含 `0x` 前缀：`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- 也可以不包含：`ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

### 4. 完整示例

```env
# 使用 Infura Sepolia RPC
RPC_URL=https://sepolia.infura.io/v3/1234567890abcdef1234567890abcdef

# 你的 ERC20 Token 地址
TOKEN_ADDRESS=0x1F7cA1b9e2dE35d2c08092fd32E28Fb505ee30b6

# Token 小数位数
TOKEN_DECIMALS=18

# 起始区块（可选）
START_BLOCK=12345678

# Etherscan API Key（可选）
ETHERSCAN_API_KEY=your_etherscan_api_key
# 可选：自定义 Etherscan API Base URL（默认 Sepolia）
ETHERSCAN_BASE_URL=https://api-sepolia.etherscan.io/api

# API 端口
PORT=3001

# 测试私钥（仅用于模拟转账，不要在生产环境使用）
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

## 前端 .env.local 配置

### 1. 创建前端 .env.local 文件

在 `erc20-indexer/frontend/` 目录下创建 `.env.local` 文件：

```bash
cd erc20-indexer/frontend
touch .env.local  # Linux/Mac
# 或
type nul > .env.local  # Windows
```

### 2. 前端 .env.local 文件内容

```env
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:3001

# WalletConnect Project ID（用于钱包连接）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 3. 如何获取各个配置项

#### NEXT_PUBLIC_API_URL（必需）

后端 API 服务器的地址。

- 如果后端运行在本地：`http://localhost:3001`
- 如果后端部署在其他服务器：`https://your-api-domain.com`
- 注意：必须以 `http://` 或 `https://` 开头

#### NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID（必需）

WalletConnect Project ID，用于连接钱包（MetaMask 等）。

**获取步骤：**
1. 访问 https://cloud.walletconnect.com/
2. 注册/登录账号
3. 创建新项目
4. 复制 Project ID（格式类似：`1234567890abcdef1234567890abcdef`）

**注意：**
- 这是免费的
- Project ID 是公开的，可以安全地放在前端代码中
- 每个项目需要单独的 Project ID

### 4. 完整示例

```env
# 后端 API 地址（本地开发）
NEXT_PUBLIC_API_URL=http://localhost:3001

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=1234567890abcdef1234567890abcdef
```

---

## 配置检查清单

### 后端配置检查

- [ ] `.env` 文件已创建在 `backend/` 目录
- [ ] `RPC_URL` 已配置（Infura/Alchemy/公共 RPC）
- [ ] `TOKEN_ADDRESS` 已配置（你的 ERC20 Token 地址）
- [ ] `TOKEN_DECIMALS` 已配置（通常是 18）
- [ ] `PORT` 已配置（默认 3001）
- [ ] `PRIVATE_KEY` 已配置（仅用于模拟转账，可选）

### 前端配置检查

- [ ] `.env.local` 文件已创建在 `frontend/` 目录
- [ ] `NEXT_PUBLIC_API_URL` 已配置（指向后端地址）
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 已配置

---

## 常见问题

### Q: RPC_URL 应该使用哪个？

**A:** 推荐使用 Infura 或 Alchemy，它们提供稳定的服务。公共 RPC 有速率限制。

### Q: 如何知道我的 Token 地址？

**A:** 
- 如果使用 Foundry 部署，查看部署输出
- 在 Etherscan Sepolia 上搜索你的合约
- 查看部署脚本的输出日志

### Q: PRIVATE_KEY 安全吗？

**A:** 
- `.env` 文件已经在 `.gitignore` 中，不会被提交到 Git
- 只使用测试私钥，不要使用主钱包的私钥
- 模拟转账脚本完成后，可以考虑删除或注释掉 PRIVATE_KEY

### Q: 前端无法连接后端？

**A:** 
- 检查 `NEXT_PUBLIC_API_URL` 是否正确
- 确认后端服务器正在运行
- 检查端口是否被占用

### Q: 钱包连接失败？

**A:** 
- 检查 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 是否正确
- 确认已从 https://cloud.walletconnect.com/ 获取 Project ID
- 检查浏览器控制台是否有错误信息

---

## 快速配置命令（Linux/Mac）

```bash
# 后端配置
cd erc20-indexer/backend
cat > .env << EOF
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
TOKEN_ADDRESS=0x1F7cA1b9e2dE35d2c08092fd32E28Fb505ee30b6
TOKEN_DECIMALS=18
PORT=3001
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
EOF

# 前端配置
cd ../frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID
EOF
```

---

## 下一步

配置完成后，按照 `README.md` 或 `USAGE.md` 中的说明启动服务。

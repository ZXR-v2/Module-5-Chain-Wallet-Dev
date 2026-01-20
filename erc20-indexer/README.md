# ERC20 Transfer Indexer

完整的 ERC20 Token 转账索引系统，包括后端索引服务和前端展示界面。

## 项目结构

```
erc20-indexer/
├── backend/          # 后端服务（索引器 + API）
│   ├── src/
│   │   ├── db/       # 数据库配置
│   │   ├── indexer.ts        # 索引服务
│   │   ├── index.ts          # API 服务器
│   │   └── simulate-transfers.ts  # 模拟转账脚本
│   └── package.json
└── frontend/         # 前端应用
    ├── app/          # Next.js App Router
    ├── components/   # React 组件
    └── lib/          # 工具函数
```

## 快速开始

### 1. 配置后端

```bash
cd backend
npm install
cp env.example .env
# 编辑 .env 文件，填入 RPC_URL 和 TOKEN_ADDRESS
```

**详细配置说明请查看 [ENV_SETUP.md](./ENV_SETUP.md)**

### 2. 启动后端服务

```bash
# 终端 1: 启动 API 服务器
npm run dev

# 终端 2: 启动索引器
npm run indexer
```

### 3. 模拟转账（可选）

如果需要测试数据，可以运行：

```bash
npm run simulate
```

这会创建至少两笔转账记录。

### 4. 配置并启动前端

```bash
cd ../frontend
npm install
cp env.local.example .env.local
# 编辑 .env.local 文件，填入 API_URL 和 WALLETCONNECT_PROJECT_ID
npm run dev
```

**详细配置说明请查看 [ENV_SETUP.md](./ENV_SETUP.md)**

访问 http://localhost:3000

## 功能特性

### 后端

- ✅ 使用 Viem 扫描链上 ERC20 Transfer 事件
- ✅ 将转账记录存储到 SQLite 数据库
- ✅ 提供 RESTful API 查询转账记录
- ✅ 支持持续索引新产生的转账
- ✅ 支持按地址、类型（发送/接收）筛选

### 前端

- ✅ 钱包连接（MetaMask 等）
- ✅ 展示转账记录列表
- ✅ 显示发送/接收统计
- ✅ 响应式设计
- ✅ 链接到 Etherscan 查看交易详情

## API 接口

### 获取转账记录

```
GET /api/transfers/:address?page=1&limit=20&type=sent
```

### 获取统计信息

```
GET /api/transfers/:address/stats
```

## 环境变量

### 后端 (.env)

```env
RPC_URL=http://localhost:8545
TOKEN_ADDRESS=0x1F7cA1b9e2dE35d2c08092fd32E28Fb505ee30b6
TOKEN_DECIMALS=18
START_BLOCK=12345678
ETHERSCAN_API_KEY=your_etherscan_api_key
ETHERSCAN_BASE_URL=https://api-sepolia.etherscan.io/api
PORT=3001
PRIVATE_KEY=your_private_key_here  # 仅用于模拟转账
```

### 前端 (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

## 数据库

数据库文件存储在 `backend/data/transfers.db`。

表结构：
- `transfers`: 转账记录
- `index_progress`: 索引进度

## 截图

运行项目后，前端会显示：
1. 钱包连接界面
2. 转账统计卡片（发送/接收）
3. 转账记录表格

## 注意事项

1. 确保后端索引器正在运行，才能获取最新的转账数据
2. 首次运行索引器会扫描所有历史区块，可能需要一些时间
3. 模拟转账需要配置正确的私钥和足够的代币余额

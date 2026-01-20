# ERC20 Transfer Indexer Backend

后端服务，用于索引链上 ERC20 Token 转账数据并存储到数据库。

## 功能

- 使用 Viem 扫描链上 ERC20 Transfer 事件
- 将转账记录存储到 SQLite 数据库
- 提供 RESTful API 查询转账记录
- 支持持续索引新产生的转账

## 安装

```bash
npm install
```

## 配置

1. 复制 `.env.example` 为 `.env`
2. 编辑 `.env` 文件，填入以下配置：

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

## 运行

### 启动 API 服务器

```bash
npm run dev
```

服务器将在 http://localhost:3001 启动

### 启动索引器

在另一个终端运行：

```bash
npm run indexer
```

索引器会持续扫描链上新的转账事件并存储到数据库。

### 模拟转账（可选）

如果需要测试，可以运行模拟转账脚本：

```bash
npm run simulate
```

这会创建至少两笔转账记录用于测试。

## API 接口

### 获取转账记录

```
GET /api/transfers/:address
```

查询参数：
- `page`: 页码（默认: 1）
- `limit`: 每页数量（默认: 20）
- `type`: 类型筛选（可选: "sent", "received"）

示例：
```
GET /api/transfers/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?page=1&limit=10&type=sent
```

### 获取转账统计

```
GET /api/transfers/:address/stats
```

### 健康检查

```
GET /health
```

## 数据库

数据库文件存储在 `data/transfers.db`。

表结构：
- `transfers`: 转账记录表
- `index_progress`: 索引进度表

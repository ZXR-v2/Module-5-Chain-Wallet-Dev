# 项目实现总结

## 题目要求

1. 后端索引出之前自己发行的 ERC20 Token 转账，并记录到数据库中
2. 提供一个 Restful 接口来获取某一个地址的转账记录
3. 前端在用户登录后，从后端查询出该用户地址的转账记录，并展示
4. 要求：模拟两笔以上的转账记录

## 实现方案

### 技术栈

**后端：**
- Node.js + TypeScript
- Express.js (RESTful API)
- Viem (区块链交互)
- SQLite (数据库)
- better-sqlite3 (数据库驱动)

**前端：**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Wagmi + Viem (Web3 交互)
- Reown AppKit (钱包连接)
- TanStack Query (数据获取)

### 项目结构

```
erc20-indexer/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── db/
│   │   │   └── database.ts     # 数据库配置和表结构
│   │   ├── indexer.ts          # ERC20 转账索引服务
│   │   ├── index.ts            # Express API 服务器
│   │   └── simulate-transfers.ts  # 模拟转账脚本
│   ├── package.json
│   └── README.md
├── frontend/                   # 前端应用
│   ├── app/
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 主页面（转账记录展示）
│   │   └── globals.css         # 全局样式
│   ├── components/
│   │   └── Web3Provider.tsx    # Web3 提供者组件
│   ├── lib/
│   │   └── api.ts              # API 调用函数
│   └── package.json
└── README.md
```

## 核心功能实现

### 1. 后端索引服务 (`backend/src/indexer.ts`)

**功能：**
- 使用 Viem 的 `getLogs` API 扫描链上 ERC20 Transfer 事件
- 支持增量索引（记录上次索引的区块号，只扫描新区块）
- 将转账记录存储到 SQLite 数据库
- 每 10 秒自动检查新区块

**关键代码：**
```typescript
const logs = await publicClient.getLogs({
  address: TOKEN_ADDRESS,
  event: TRANSFER_EVENT,
  fromBlock: startBlock,
  toBlock,
});
```

### 2. 数据库设计 (`backend/src/db/database.ts`)

**表结构：**

1. **transfers 表** - 存储转账记录
   - `id`: 主键
   - `transaction_hash`: 交易哈希（唯一）
   - `block_number`: 区块号
   - `block_timestamp`: 区块时间戳
   - `token_address`: Token 地址
   - `from_address`: 发送地址
   - `to_address`: 接收地址
   - `value`: 转账金额（原始值）
   - `value_decimal`: 转账金额（小数形式）
   - `created_at`: 创建时间

2. **index_progress 表** - 记录索引进度
   - `token_address`: Token 地址（唯一）
   - `last_indexed_block`: 最后索引的区块号

**索引：**
- `from_address`, `to_address`, `token_address`, `block_number`, `transaction_hash`

### 3. RESTful API (`backend/src/index.ts`)

**接口：**

1. `GET /api/transfers/:address`
   - 获取指定地址的转账记录
   - 查询参数：
     - `page`: 页码（默认 1）
     - `limit`: 每页数量（默认 20）
     - `type`: 类型筛选（`sent` | `received`）

2. `GET /api/transfers/:address/stats`
   - 获取指定地址的转账统计
   - 返回发送/接收的次数和总金额

3. `GET /health`
   - 健康检查

### 4. 模拟转账脚本 (`backend/src/simulate-transfers.ts`)

**功能：**
- 使用 Viem 创建两笔 ERC20 转账交易
- 第一笔：转账 100.5 tokens
- 第二笔：转账 250.75 tokens
- 等待交易确认

### 5. 前端展示 (`frontend/app/page.tsx`)

**功能：**
- 钱包连接（使用 Reown AppKit）
- 获取用户地址的转账记录
- 显示发送/接收统计
- 展示转账记录表格
- 链接到 Etherscan 查看交易详情

**UI 特性：**
- 响应式设计
- 发送/接收标签区分
- 金额颜色区分（发送红色，接收绿色）
- 时间显示（相对时间）

## 使用流程

1. **配置后端**
   - 设置 `.env` 文件（RPC_URL, TOKEN_ADDRESS 等）

2. **启动后端服务**
   - 启动 API 服务器：`npm run dev`
   - 启动索引器：`npm run indexer`

3. **模拟转账（可选）**
   - 运行 `npm run simulate` 创建测试数据

4. **启动前端**
   - 配置 `.env.local`（API_URL, WALLETCONNECT_PROJECT_ID）
   - 运行 `npm run dev`

5. **查看转账记录**
   - 连接钱包
   - 自动加载并展示该地址的转账记录

## 技术亮点

1. **增量索引**：只扫描新区块，提高效率
2. **数据完整性**：使用唯一约束防止重复记录
3. **类型安全**：全面使用 TypeScript
4. **现代化前端**：使用 Next.js 15 App Router
5. **用户体验**：响应式设计，清晰的 UI

## 测试数据

模拟转账脚本会创建至少两笔转账：
- 第一笔：100.5 tokens
- 第二笔：250.75 tokens

这些转账会被索引器捕获并存储到数据库，然后在前端展示。

## 注意事项

1. 首次运行索引器会扫描所有历史区块，可能需要较长时间
2. 需要配置正确的 RPC URL（支持 Sepolia 测试网）
3. 前端需要 WalletConnect Project ID
4. 模拟转账需要配置私钥和足够的代币余额

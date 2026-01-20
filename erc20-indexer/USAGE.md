# 使用说明

## 快速开始

### 1. 配置后端

进入 `backend` 目录：

```bash
cd backend
npm install
```

创建 `.env` 文件（参考 `.env.example`）：

```env
RPC_URL=http://localhost:8545
TOKEN_ADDRESS=0x1F7cA1b9e2dE35d2c08092fd32E28Fb505ee30b6
TOKEN_DECIMALS=18
PORT=3001
PRIVATE_KEY=your_private_key_here  # 仅用于模拟转账
```

### 2. 启动后端服务

需要启动两个服务：

**终端 1 - API 服务器：**
```bash
cd backend
npm run dev
```

**终端 2 - 索引器：**
```bash
cd backend
npm run indexer
```

索引器会持续扫描链上的 ERC20 Transfer 事件并存储到数据库。

### 3. 模拟转账（可选）

如果需要测试数据，在另一个终端运行：

```bash
cd backend
npm run simulate
```

这会创建至少两笔转账记录。

### 4. 配置并启动前端

进入 `frontend` 目录：

```bash
cd frontend
npm install
```

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

启动前端：

```bash
npm run dev
```

访问 http://localhost:3000

## 功能说明

### 后端索引器

- 自动扫描链上 ERC20 Transfer 事件
- 将转账记录存储到 SQLite 数据库
- 支持增量索引（只扫描新区块）
- 每 10 秒检查一次新区块

### API 接口

1. **获取转账记录**
   ```
   GET /api/transfers/:address?page=1&limit=20&type=sent
   ```
   - `page`: 页码
   - `limit`: 每页数量
   - `type`: 类型筛选（`sent` | `received`）

2. **获取统计信息**
   ```
   GET /api/transfers/:address/stats
   ```

### 前端功能

- 连接钱包（MetaMask 等）
- 查看转账记录列表
- 查看发送/接收统计
- 链接到 Etherscan 查看交易详情

## 注意事项

1. **首次索引**：首次运行索引器会扫描所有历史区块，可能需要较长时间
2. **RPC 限制**：如果使用公共 RPC，注意请求频率限制
3. **数据库位置**：数据库文件存储在 `backend/data/transfers.db`
4. **钱包连接**：前端需要 WalletConnect Project ID，可在 https://cloud.walletconnect.com/ 获取

## 故障排查

### 索引器无法连接 RPC

- 检查 `.env` 中的 `RPC_URL` 是否正确
- 确认网络连接正常

### 前端无法连接后端

- 确认后端 API 服务器正在运行（http://localhost:3001）
- 检查 `.env.local` 中的 `NEXT_PUBLIC_API_URL`

### 钱包连接失败

- 检查 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 是否正确配置
- 确认已安装 MetaMask 或其他 Web3 钱包

# 快速开始指南

## 5 分钟快速配置

### 步骤 1: 配置后端环境变量

```bash
cd erc20-indexer/backend
```

创建 `.env` 文件（Windows 用户可以用记事本创建）：

```bash
# Windows PowerShell
New-Item -Path .env -ItemType File

# Linux/Mac
touch .env
```

编辑 `.env` 文件，填入以下内容：

```env
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
TOKEN_ADDRESS=0x1F7cA1b9e2dE35d2c08092fd32E28Fb505ee30b6
TOKEN_DECIMALS=18
PORT=3001
PRIVATE_KEY=0x你的私钥
```

**需要获取的值：**
- `RPC_URL`: 从 [Infura](https://infura.io/) 或 [Alchemy](https://www.alchemy.com/) 获取
- `TOKEN_ADDRESS`: 你部署的 ERC20 Token 地址
- `PRIVATE_KEY`: 测试钱包私钥（仅用于模拟转账）

### 步骤 2: 配置前端环境变量

```bash
cd ../frontend
```

创建 `.env.local` 文件：

```bash
# Windows PowerShell
New-Item -Path .env.local -ItemType File

# Linux/Mac
touch .env.local
```

编辑 `.env.local` 文件，填入以下内容：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的WalletConnect项目ID
```

**需要获取的值：**
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: 从 [WalletConnect Cloud](https://cloud.walletconnect.com/) 获取

### 步骤 3: 安装依赖

**后端：**
```bash
cd ../backend
npm install
```

**前端：**
```bash
cd ../frontend
npm install
```

### 步骤 4: 启动服务

**终端 1 - 启动后端 API：**
```bash
cd erc20-indexer/backend
npm run dev
```

**终端 2 - 启动索引器：**
```bash
cd erc20-indexer/backend
npm run indexer
```

**终端 3 - 启动前端：**
```bash
cd erc20-indexer/frontend
npm run dev
```

### 步骤 5: 访问应用

打开浏览器访问：http://localhost:3000

连接钱包后即可查看转账记录！

---

## 详细配置说明

如果遇到问题或需要更详细的配置说明，请查看：
- **[ENV_SETUP.md](./ENV_SETUP.md)** - 完整的环境变量配置指南
- **[USAGE.md](./USAGE.md)** - 详细使用说明

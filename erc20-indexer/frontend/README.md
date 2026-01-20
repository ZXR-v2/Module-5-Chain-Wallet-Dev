# ERC20 Transfer Indexer Frontend

前端应用，用于展示用户的 ERC20 Token 转账记录。

## 功能

- 钱包连接（使用 Reown AppKit）
- 查看转账记录（发送/接收）
- 转账统计信息
- 响应式设计

## 安装

```bash
npm install
```

## 配置

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

## 运行

```bash
npm run dev
```

访问 http://localhost:3000

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Wagmi
- Viem
- Reown AppKit
- TanStack Query

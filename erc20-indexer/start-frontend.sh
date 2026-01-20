#!/bin/bash

# 启动前端服务
cd frontend

# 检查 .env.local 文件
if [ ! -f .env.local ]; then
    echo "⚠️  警告: .env.local 文件不存在"
    echo "请创建 .env.local 文件并配置:"
    echo "  NEXT_PUBLIC_API_URL=http://localhost:3001"
    echo "  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id"
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "🚀 启动前端服务..."
npm run dev

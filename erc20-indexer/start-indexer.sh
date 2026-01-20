#!/bin/bash

# 启动索引器
cd backend

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "请复制 .env.example 为 .env 并配置相关参数"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "🔄 启动索引器..."
npm run indexer

#!/bin/bash
# =============================================================================
# init.sh - 环境初始化脚本
# 每个新的 Agent 会话开始时运行此脚本
# =============================================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}正在初始化项目环境...${NC}"

# ---- 安装依赖 ----

if [ -f "package.json" ]; then
  echo "安装 npm 依赖..."
  npm install
elif [ -f "requirements.txt" ]; then
  echo "安装 Python 依赖..."
  pip install -r requirements.txt
elif [ -f "pyproject.toml" ]; then
  echo "安装 Python 依赖..."
  pip install -e .
elif [ -f "go.mod" ]; then
  echo "下载 Go 依赖..."
  go mod download
fi


# ---- 启动开发服务器 ----
echo "启动开发服务器..."
npm run dev &
SERVER_PID=$!


# ---- 等待服务器就绪 ----
echo "等待服务器启动..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 开发服务器已就绪: http://localhost:3000${NC}"
    break
  fi
  sleep 1
done

echo -e "${GREEN}✓ 初始化完成 (Server PID: $SERVER_PID)${NC}"

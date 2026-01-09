#!/bin/bash

# 贪吃蛇游戏 - Nginx 快速部署脚本 (Linux/macOS)

echo "========================================"
echo "贪吃蛇游戏 - Nginx 快速部署脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}注意: 部分操作需要 sudo 权限${NC}"
    echo ""
fi

# 检查 Node.js
echo "[1/5] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Node.js${NC}"
    echo ""
    echo "安装方法:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  CentOS/RHEL:   sudo yum install nodejs npm"
    echo "  macOS:         brew install node"
    exit 1
fi
echo -e "${GREEN}[√] Node.js 已安装 (版本: $(node -v))${NC}"

# 检查 Nginx
echo "[2/5] 检查 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}[提示] Nginx 未安装，正在尝试安装...${NC}"

    # 检测操作系统并安装
    if command -v apt &> /dev/null; then
        sudo apt update
        sudo apt install -y nginx
    elif command -v yum &> /dev/null || command -v dnf &> /dev/null; then
        sudo yum install -y nginx
    elif command -v brew &> /dev/null; then
        brew install nginx
    else
        echo -e "${RED}[错误] 无法自动安装 Nginx，请手动安装${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}[√] Nginx 已安装${NC}"

# 停止现有的 Node.js 服务（如果存在）
echo "[3/5] 检查现有 Node.js 服务..."
NODE_PID=$(lsof -t -i:8888 2>/dev/null)
if [ ! -z "$NODE_PID" ]; then
    echo "检测到 Node.js 服务正在运行 (PID: $NODE_PID)，正在停止..."
    kill $NODE_PID 2>/dev/null
    sleep 1
fi

# 启动 Node.js 服务
echo "[4/5] 启动 Node.js 后端服务..."
nohup node server.js > server.log 2>&1 &
sleep 2

# 检查 Node.js 是否成功启动
if lsof -t -i:8888 > /dev/null 2>&1; then
    echo -e "${GREEN}[√] Node.js 服务已在后台运行 (8888端口)${NC}"
else
    echo -e "${RED}[错误] Node.js 服务启动失败${NC}"
    echo "请查看日志: cat server.log"
    exit 1
fi

# 复制 Nginx 配置文件
echo "[5/5] 配置 Nginx..."
NGINX_CONF_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

# 创建目录（如果不存在）
sudo mkdir -p $NGINX_CONF_DIR
sudo mkdir -p $NGINX_ENABLED_DIR

# 复制配置文件
sudo cp nginx.conf $NGINX_CONF_DIR/snake-game

# 创建软链接
sudo ln -sf $NGINX_CONF_DIR/snake-game $NGINX_ENABLED_DIR/snake-game

# 删除默认配置（可选）
sudo rm -f $NGINX_ENABLED_DIR/default

# 提示用户修改 server_name
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}重要提示：请修改 Nginx 配置${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "请编辑配置文件并修改 server_name："
echo "  sudo nano $NGINX_CONF_DIR/snake-game"
echo ""
echo "将 server_name 改为你的域名或服务器 IP："
echo "  server_name your-domain.com;  或  server_name 192.168.1.100;"
echo ""

# 询问是否继续
read -p "是否已完成配置修改？(y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先完成配置修改后再运行本脚本"
    exit 0
fi

# 测试 Nginx 配置
echo "测试 Nginx 配置..."
sudo nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}[错误] Nginx 配置文件有误${NC}"
    exit 1
fi

# 启动/重启 Nginx
echo "启动 Nginx..."
if pgrep -x "nginx" > /dev/null; then
    sudo systemctl reload nginx
else
    sudo systemctl start nginx
fi

# 设置 Nginx 开机自启
sudo systemctl enable nginx

echo ""
echo "========================================"
echo -e "${GREEN}部署完成！${NC}"
echo "========================================"
echo ""
echo "访问地址："
echo "  - 本地访问: http://localhost"
echo "  - 局域网访问: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "服务端口："
echo "  - Nginx: 80 (HTTP)"
echo "  - Node.js: 8888 (内部)"
echo ""
echo "管理命令："
echo "  - 启动 Nginx:   sudo systemctl start nginx"
echo "  - 停止 Nginx:   sudo systemctl stop nginx"
echo "  - 重启 Nginx:   sudo systemctl restart nginx"
echo "  - 重新加载:     sudo systemctl reload nginx"
echo "  - 查看状态:     sudo systemctl status nginx"
echo "  - 查看 Nginx 日志: sudo tail -f /var/log/nginx/snake-game-access.log"
echo "  - 查看 Node.js 日志: tail -f server.log"
echo ""
echo "如需停止 Node.js 服务:"
echo "  kill $(lsof -t -i:8888)"
echo ""

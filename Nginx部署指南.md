# Nginx 反向代理部署指南

本指南介绍如何使用 Nginx 作为反向代理来部署贪吃蛇游戏应用。

## 为什么使用 Nginx 反向代理？

1. **避免端口冲突**：可以使用标准的 80/443 端口，不影响其他应用
2. **更安全**：隐藏内部服务器端口，只暴露 Nginx
3. **负载均衡**：支持多台后端服务器
4. **静态资源缓存**：提高性能
5. **SSL/TLS 终止**：轻松配置 HTTPS
6. **更好的访问控制**：在 Nginx 层面进行安全配置

## 部署架构

```
用户浏览器 → Nginx (80/443) → Node.js 后端 (8888)
```

## 部署步骤

### 1. 安装 Nginx

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install nginx
```

#### CentOS/RHEL
```bash
sudo yum install nginx
# 或
sudo dnf install nginx
```

#### Windows
1. 下载 Nginx：http://nginx.org/en/download.html
2. 解压到某个目录（如 `C:\nginx`）
3. 修改配置文件 `conf/nginx.conf`

### 2. 修改 Node.js 服务器配置

当前 Node.js 服务器运行在 **8888 端口**（在 `server.js` 第 605 行）。

保持不变，让 Node.js 在内部 8888 端口运行。

### 3. 配置 Nginx

#### Linux/macOS

将项目中的 `nginx.conf` 复制到 Nginx 配置目录：

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/snake-game

# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/snake-game /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 编辑配置文件，修改 server_name
sudo nano /etc/nginx/sites-available/snake-game

# 将 server_name 改为你的域名或服务器 IP
# server_name your-domain.com;  ← 改这里
```

#### Windows

编辑 `C:\nginx\conf\nginx.conf`，将 `nginx.conf` 的内容粘贴进去，并修改 `server_name`。

### 4. 修改配置文件

根据你的情况修改 `server_name`：

```nginx
# 情况 1：使用域名
server_name game.yourdomain.com;

# 情况 2：使用服务器 IP
server_name 192.168.1.100;

# 情况 3：使用 localhost（本地测试）
server_name localhost;
```

### 5. 启动 Node.js 服务

```bash
# 进入项目目录
cd /path/to/贪吃蛇

# 启动 Node.js 服务器（后台运行）
nohup node server.js > server.log 2>&1 &

# 查看日志
tail -f server.log

# 或使用 PM2 进程管理器（推荐）
pm2 start server.js --name snake-game
pm2 logs snake-game
```

### 6. 启动 Nginx

#### Linux/macOS

```bash
# 测试配置文件
sudo nginx -t

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 查看状态
sudo systemctl status nginx

# 重启 Nginx
sudo systemctl restart nginx

# 重新加载配置
sudo systemctl reload nginx
```

#### Windows

```bash
# 打开命令提示符或 PowerShell，进入 Nginx 目录
cd C:\nginx

# 测试配置
nginx -t

# 启动 Nginx
start nginx

# 停止 Nginx
nginx -s stop

# 重新加载配置
nginx -s reload

# 优雅停止
nginx -s quit
```

### 7. 访问应用

配置完成后，通过以下方式访问：

- **使用域名**：`http://game.yourdomain.com`
- **使用 IP**：`http://192.168.1.100`
- **本地测试**：`http://localhost`

## 验证部署

### 1. 检查 Node.js 服务是否运行

```bash
# 检查 8888 端口
netstat -tlnp | grep 8888
# 或
ss -tlnp | grep 8888

# 访问 Node.js 直接接口
curl http://localhost:8888/api/users
```

### 2. 检查 Nginx 是否运行

```bash
# 检查 80 端口
netstat -tlnp | grep 80

# 测试 Nginx 代理
curl http://localhost/api/users
```

### 3. 浏览器测试

访问 `http://your-domain.com`，应该能看到游戏界面。

## 常见问题

### Q1: Nginx 502 Bad Gateway

**原因**：Node.js 服务未启动或端口错误

**解决**：
```bash
# 检查 Node.js 是否运行
ps aux | grep node

# 查看 Node.js 日志
tail -f server.log

# 重启 Node.js 服务
pm2 restart snake-game
```

### Q2: 端口冲突

**问题**：80 端口被占用

**解决**：
```bash
# 查看占用 80 端口的进程
sudo lsof -i :80

# 或
sudo netstat -tlnp | grep :80

# 停止占用端口的进程，或修改 Nginx 监听其他端口
```

### Q3: 静态资源加载失败

**原因**：路径配置错误

**解决**：检查 Nginx 配置中的 `proxy_pass` 是否正确指向 Node.js 的 8888 端口。

### Q4: CORS 跨域问题

**解决**：Nginx 配置已经包含了必要的头部，如果还有问题，可以在 `nginx.conf` 中添加：

```nginx
add_header Access-Control-Allow-Origin *;
add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
add_header Access-Control-Allow-Headers 'Content-Type';
```

## 高级配置

### 启用 HTTPS（SSL）

如果你有 SSL 证书，可以配置 HTTPS：

1. **使用 Let's Encrypt 免费证书**

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 自动配置 SSL
sudo certbot --nginx -d your-domain.com
```

2. **手动配置**

取消 `nginx.conf` 中 HTTPS 部分的注释，填入你的证书路径：

```nginx
listen 443 ssl http2;
ssl_certificate /path/to/your/cert.pem;
ssl_certificate_key /path/to/your/key.pem;
```

### 使用 PM2 管理 Node.js 服务

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name snake-game

# 查看状态
pm2 status

# 查看日志
pm2 logs snake-game

# 重启
pm2 restart snake-game

# 停止
pm2 stop snake-game

# 设置开机自启
pm2 startup
pm2 save
```

### 配置防火墙

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 性能优化

### Nginx 优化参数

编辑 `/etc/nginx/nginx.conf`：

```nginx
worker_processes auto;
worker_connections 1024;

http {
    # 开启 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 设置缓存
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g;
}
```

### Node.js 优化

在 `server.js` 中可以使用 `cluster` 模块利用多核 CPU。

## 监控和日志

### 查看 Nginx 日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/snake-game-access.log

# 错误日志
sudo tail -f /var/log/nginx/snake-game-error.log
```

### 查看 Node.js 日志

```bash
# 如果使用 PM2
pm2 logs snake-game

# 如果使用 nohup
tail -f server.log
```

## 安全建议

1. **限制请求大小**：已在配置中设置 `client_max_body_size 10M`
2. **隐藏 Nginx 版本**：添加 `server_tokens off;`
3. **限制访问频率**：配置 `limit_req` 模块
4. **使用防火墙**：只开放必要的端口
5. **定期更新**：保持 Nginx 和 Node.js 版本最新
6. **使用 HTTPS**：在生产环境中启用 SSL/TLS

## 总结

使用 Nginx 反向代理后：
- 用户通过 `http://your-domain.com` 访问（80 端口）
- Nginx 将请求转发到内部的 Node.js 服务（8888 端口）
- 避免了直接暴露 Node.js 服务，更安全
- 可以随时更换 Node.js 端口，只需修改 Nginx 配置即可

如有问题，请查看日志文件排查。

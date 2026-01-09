# 贪吃蛇游戏 - Linux 从零到一部署指南

完整的生产级部署指南，使用 systemd 管理服务，Nginx 反向代理，Let's Encrypt SSL 证书。

---

## 📋 目录

1. [服务器准备](#服务器准备)
2. [系统环境安装](#系统环境安装)
3. [部署应用](#部署应用)
4. [配置 systemd 服务](#配置-systemd-服务)
5. [安装和配置 Nginx](#安装和配置-nginx)
6. [配置防火墙](#配置防火墙)
7. [配置 SSL 证书](#配置-ssl-证书)
8. [服务管理](#服务管理)
9. [常见问题排查](#常见问题排查)
10. [域名 DNS 配置](#域名-dns-配置)

---

## 服务器准备

### 1. 连接服务器

```bash
# SSH 连接到服务器
ssh root@your-server-ip

# 或使用端口（如果修改了 SSH 端口）
ssh -p 22 root@your-server-ip
```

### 2. 更新系统

**CentOS 7/8:**
```bash
yum update -y
```

**CentOS Stream / Rocky / AlmaLinux:**
```bash
dnf update -y
```

**Ubuntu 18.04/20.04/22.04:**
```bash
apt update && apt upgrade -y
```

---

## 系统环境安装

### CentOS 系统

#### 安装 Node.js 18.x

```bash
# 安装 NodeSource 仓库
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -

# 安装 Node.js 和 npm
yum install -y nodejs

# 验证安装
node -v
npm -v
```

#### 安装必要工具

```bash
yum install -y wget vim git net-tools unzip certbot
```

### Ubuntu 系统

#### 安装 Node.js 18.x

```bash
# 安装 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# 安装 Node.js
apt install -y nodejs

# 验证安装
node -v
npm -v
```

#### 安装必要工具

```bash
apt install -y wget vim git net-tools unzip certbot
```

---

## 部署应用

### 1. 创建项目目录

```bash
# 创建应用目录
mkdir -p /opt/snake-game
cd /opt/snake-game
```

### 2. 上传项目文件

#### 方法一：使用 SCP 从本地上传

在本地电脑（Windows 使用 PowerShell 或 Git Bash）执行：

```bash
# 上传整个项目目录
scp -r "d:/ftp/贪吃蛇"/* root@your-server-ip:/opt/snake-game/
```

#### 方法二：使用 SFTP 工具

使用 WinSCP、FileZilla 等 SFTP 工具：
- 连接到服务器
- 上传所有项目文件到 `/opt/snake-game/`

#### 方法三：先压缩后上传

在本地压缩项目：
```bash
cd "d:/ftp"
tar -czf snake-game.tar.gz 贪吃蛇
```

上传到服务器：
```bash
scp d:/ftp/snake-game.tar.gz root@your-server-ip:/opt/
```

在服务器解压：
```bash
cd /opt
tar -xzf snake-game.tar.gz
mv 贪吃蛇 snake-game
```

### 3. 设置文件权限

```bash
cd /opt/snake-game

# 设置目录权限
chmod -R 755 .

# data 目录需要写权限
chmod -R 777 data/

# 确保所有者正确
chown -R root:root .
```

### 4. 测试运行（可选）

```bash
# 测试运行（前台）
node server.js

# 如果看到以下输出表示正常：
# 服务器运行在 http://0.0.0.0:8888
# 数据目录: /opt/snake-game/data

# 按 Ctrl+C 停止测试
```

---

## 配置 systemd 服务

### 1. 创建 systemd 服务文件

```bash
# 创建服务配置文件
vim /etc/systemd/system/snake-game.service
```

### 2. 添加服务配置

将以下内容粘贴到文件中：

```ini
[Unit]
Description=Snake Game Server
Documentation=https://github.com/your-repo
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/snake-game

# Node.js 启动命令
ExecStart=/usr/bin/node /opt/snake-game/server.js

# 自动重启配置
Restart=always
RestartSec=10

# 日志配置
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=snake-game

# 环境变量
Environment=NODE_ENV=production
Environment=PORT=8888

# 安全设置
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 3. 启动并配置服务

```bash
# 重新加载 systemd 配置
systemctl daemon-reload

# 启动服务
systemctl start snake-game

# 设置开机自启
systemctl enable snake-game

# 查看服务状态
systemctl status snake-game
```

**预期输出示例：**
```
● snake-game.service - Snake Game Server
   Loaded: loaded (/etc/systemd/system/snake-game.service; enabled; vendor preset: disabled)
   Active: active (running) since Wed 2026-01-08 10:00:00 CST; 5s ago
 Main PID: 12345 (node)
    Tasks: 6 (limit: 2345)
   Memory: 25.0M
   CGroup: /system.slice/snake-game.service
           └─12345 /usr/bin/node /opt/snake-game/server.js
```

### 4. 查看服务日志

```bash
# 实时查看日志
journalctl -u snake-game -f

# 查看最近 50 行日志
journalctl -u snake-game -n 50

# 查看今天的日志
journalctl -u snake-game --since today

# 查看指定时间段的日志
journalctl -u snake-game --since "2026-01-08 10:00:00" --until "2026-01-08 12:00:00"
```

---

## 安装和配置 Nginx

### 1. 安装 Nginx

**CentOS:**
```bash
yum install -y nginx
systemctl start nginx
systemctl enable nginx
```

**Ubuntu:**
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 2. 创建 Nginx 配置文件

```bash
# CentOS
vim /etc/nginx/conf.d/snake-game.conf

# Ubuntu
vim /etc/nginx/sites-available/snake-game
ln -s /etc/nginx/sites-available/snake-game /etc/nginx/sites-enabled/
```

### 3. 添加 Nginx 配置（初始 HTTP 版本）

```nginx
# HTTP 服务器 - 临时配置，后续会添加 SSL
server {
    # 监听 HTTP 80 端口
    listen 80;
    server_name your-domain.com;  # 修改为你的域名或服务器 IP

    # 日志文件
    access_log /var/log/nginx/snake-game-access.log;
    error_log /var/log/nginx/snake-game-error.log;

    # 最大上传大小
    client_max_body_size 10M;

    # 反向代理到 Node.js 后端
    location / {
        # 代理到本地 8888 端口（Node.js 服务器）
        proxy_pass http://127.0.0.1:8888;

        # 传递真实的客户端 IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 缓冲区设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 缓存 7 天
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API 请求
    location /api/ {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 禁用缓存
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 4. 测试并重启 Nginx

```bash
# 测试 Nginx 配置
nginx -t

# 重启 Nginx
systemctl restart nginx

# 查看 Nginx 状态
systemctl status nginx
```

### 5. 验证配置

```bash
# 测试 Node.js 直接访问（内部）
curl http://localhost:8888

# 测试 Nginx 代理访问
curl http://localhost

# 测试 API 接口
curl http://localhost/api/users
```

---

## 配置防火墙

### CentOS (使用 firewalld)

```bash
# 启动防火墙
systemctl start firewalld
systemctl enable firewalld

# 开放 HTTP 和 HTTPS 端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

# 重载防火墙规则
firewall-cmd --reload

# 查看防火墙状态
firewall-cmd --list-all

# 查看开放的端口
firewall-cmd --list-ports
```

### Ubuntu (使用 ufw)

```bash
# 允许 OpenSSH
ufw allow OpenSSH

# 允许 HTTP 和 HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 启用防火墙
ufw enable

# 查看防火墙状态
ufw status
```

### 关闭 SELinux（CentOS 可选）

如果遇到访问问题，可以临时关闭 SELinux：

```bash
# 查看 SELinux 状态
getenforce

# 临时关闭（重启后恢复）
setenforce 0

# 永久关闭（修改配置文件）
vim /etc/selinux/config
# 将 SELINUX=enforcing 改为 SELINUX=disabled
```

---

## 配置 SSL 证书

### 方式一：使用 Let's Encrypt 免费证书（推荐）

#### 1. 安装 Certbot

**CentOS:**
```bash
yum install -y certbot
```

**Ubuntu:**
```bash
apt install -y certbot
```

#### 2. 使用 DNS 验证方式申请证书

```bash
# 申请证书（手动 DNS 验证）
certbot certonly --manual --preferred-challenges dns -d your-domain.com
```

#### 3. 添加 DNS TXT 记录

执行后会显示：

```
Please deploy a DNS TXT record under the name:
_acme-challenge.your-domain.com
with the following value:

xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Before continuing, verify the record is deployed.
```

**添加 DNS TXT 记录：**

1. 登录你的域名管理平台（阿里云、腾讯云等）
2. 找到域名解析设置
3. 添加以下记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| TXT | `_acme-challenge` | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | 600 |

4. 等待 1-2 分钟让 DNS 生效
5. 验证 DNS 记录：

```bash
# 验证 TXT 记录是否生效
nslookup -type=TXT _acme-challenge.your-domain.com

# 或使用 dig
dig _acme-challenge.your-domain.com TXT
```

#### 4. 继续申请流程

确认 DNS 记录生效后，在服务器上按 **Enter** 键继续。

如果成功，会看到：

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/your-domain.com/fullchain.pem
Key is saved at: /etc/letsencrypt/live/your-domain.com/privkey.pem
```

#### 5. 更新 Nginx 配置启用 SSL

```bash
vim /etc/nginx/conf.d/snake-game.conf
```

修改为以下配置：

```nginx
# HTTP 服务器 - 自动跳转到 HTTPS
server {
    # 监听 HTTP 80 端口
    listen 80;
    server_name your-domain.com 8.138.27.63;  # 修改为你的域名和服务器 IP

    # HTTP 自动跳转到 HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS 服务器
server {
    # 监听 HTTPS 443 端口
    listen 443 ssl;
    http2 on;
    server_name your-domain.com 8.138.27.63;  # 修改为你的域名和服务器 IP

    # Let's Encrypt SSL 证书路径
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # SSL 会话缓存
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 日志文件
    access_log /var/log/nginx/snake-game-access.log;
    error_log /var/log/nginx/snake-game-error.log;

    # 最大上传大小
    client_max_body_size 10M;

    # 反向代理到 Node.js 后端
    location / {
        # 代理到本地 8888 端口（Node.js 服务器）
        proxy_pass http://127.0.0.1:8888;

        # 传递真实的客户端 IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 缓冲区设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 缓存 7 天
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API 请求
    location /api/ {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 禁用缓存
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**重要修改点：**
- 将 `your-domain.com` 替换为你的实际域名
- 将 `8.138.27.63` 替换为你的服务器公网 IP
- 将证书路径中的 `your-domain.com` 替换为你的实际域名

#### 6. 重新加载 Nginx

```bash
# 测试 Nginx 配置
nginx -t

# 重新加载 Nginx
nginx -s reload

# 或重启 Nginx
systemctl restart nginx
```

#### 7. 删除 DNS TXT 记录

证书申请成功后，可以删除之前添加的 `_acme-challenge` TXT 记录：

1. 登录域名管理平台
2. 找到 `_acme-challenge` TXT 记录
3. 删除该记录

#### 8. 设置证书自动续期

Let's Encrypt 证书有效期为 **90 天**，需要设置自动续期。

```bash
# 测试续期命令
certbot renew --dry-run

# 添加定时任务自动续期
crontab -e
```

在 crontab 文件末尾添加：

```cron
# 每天凌晨 2 点检查并续期证书
0 2 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

保存退出。

---

### 方式二：使用自有 SSL 证书

如果你已经购买或申请了 SSL 证书：

#### 1. 上传证书文件

将证书文件上传到服务器的 `/etc/nginx/ssl/` 目录：

```bash
# 创建 SSL 证书目录
mkdir -p /etc/nginx/ssl

# 上传证书文件（使用 SCP 或 SFTP）
# snake.crt - 证书文件
# snake.key - 私钥文件
```

#### 2. 设置证书文件权限

```bash
chmod 644 /etc/nginx/ssl/snake.crt
chmod 600 /etc/nginx/ssl/snake.key
chown root:root /etc/nginx/ssl/*
```

#### 3. 验证证书和密钥匹配

```bash
# 验证证书和密钥是否匹配
openssl x509 -noout -modulus -in /etc/nginx/ssl/snake.crt | openssl md5
openssl rsa -noout -modulus -in /etc/nginx/ssl/snake.key | openssl md5

# 两个 MD5 值应该相同
```

#### 4. 更新 Nginx 配置

```nginx
# Let's Encrypt 证书路径
ssl_certificate /etc/nginx/ssl/snake.crt;
ssl_certificate_key /etc/nginx/ssl/snake.key;
```

#### 5. 重新加载 Nginx

```bash
nginx -t
nginx -s reload
```

---

## 域名 DNS 配置

### 阿里云 DNS 配置

1. 登录 [阿里云 DNS 控制台](https://dns.console.aliyun.com/)
2. 找到你的域名
3. 点击 **解析设置**
4. 点击 **添加记录**

添加 A 记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | 你的服务器公网 IP | 600 |

等待 10-30 分钟让 DNS 生效。

### 验证 DNS 解析

```bash
# 查看域名解析
nslookup your-domain.com

# 或使用 dig
dig your-domain.com

# 应该看到解析到你的服务器 IP
```

### 腾讯云 DNS 配置

1. 登录 [腾讯云 DNS 控制台](https://console.cloud.tencent.com/cns)
2. 找到你的域名
3. 点击 **解析**
4. 点击 **添加记录**

添加 A 记录（同上）。

---

## 服务管理

### Node.js 服务管理

```bash
# 启动服务
systemctl start snake-game

# 停止服务
systemctl stop snake-game

# 重启服务
systemctl restart snake-game

# 查看服务状态
systemctl status snake-game

# 查看服务配置
systemctl cat snake-game

# 重新加载配置
systemctl daemon-reload

# 禁用开机自启
systemctl disable snake-game

# 启用开机自启
systemctl enable snake-game
```

### Nginx 服务管理

```bash
# 启动 Nginx
systemctl start nginx

# 停止 Nginx
systemctl stop nginx

# 重启 Nginx
systemctl restart nginx

# 重新加载配置（不中断服务）
systemctl reload nginx

# 查看 Nginx 状态
systemctl status nginx

# 测试配置文件
nginx -t
```

### 日志查看

```bash
# Node.js 服务日志（systemd journal）
journalctl -u snake-game -f

# 查看最近 100 行
journalctl -u snake-game -n 100

# 查看今天的日志
journalctl -u snake-game --since today

# Nginx 访问日志
tail -f /var/log/nginx/snake-game-access.log

# Nginx 错误日志
tail -f /var/log/nginx/snake-game-error.log
```

### 服务监控

```bash
# 查看 Node.js 进程
ps aux | grep node

# 查看 8888 端口监听
netstat -tlnp | grep 8888
# 或
ss -tlnp | grep 8888

# 查看 80 端口监听
netstat -tlnp | grep 80
# 或
ss -tlnp | grep 80

# 查看 443 端口监听
netstat -tlnp | grep 443
# 或
ss -tlnp | grep 443

# 查看资源使用
htop
# 或
top
```

---

## 常见问题排查

### 1. Node.js 服务无法启动

```bash
# 查看详细状态
systemctl status snake-game -l

# 查看详细日志
journalctl -u snake-game -n 100 --no-pager

# 检查 Node.js 是否安装
which node
node -v

# 检查服务文件语法
systemd-analyze verify /etc/systemd/system/snake-game.service

# 检查端口是否被占用
netstat -tlnp | grep 8888
```

### 2. Nginx 502 Bad Gateway

```bash
# 检查 Node.js 服务是否运行
systemctl status snake-game

# 检查 Node.js 进程
ps aux | grep node

# 检查 8888 端口
netstat -tlnp | grep 8888

# 测试 Node.js 直接访问
curl http://localhost:8888

# 查看 Nginx 错误日志
tail -f /var/log/nginx/snake-game-error.log
```

### 3. 无法访问网站

```bash
# 检查防火墙
# CentOS
firewall-cmd --list-all

# Ubuntu
ufw status

# 检查服务状态
systemctl status snake-game
systemctl status nginx

# 检查端口监听
netstat -tlnp | grep 80
netstat -tlnp | grep 443
netstat -tlnp | grep 8888

# 检查 SELinux（CentOS）
getenforce
# 如果是 Enforcing，临时关闭测试
setenforce 0
```

### 4. 云服务器无法访问

**云服务器需要在控制台开放安全组端口：**

**阿里云 ECS：**
1. 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 找到你的 ECS 实例
3. 点击 **安全组** → **配置规则**
4. 添加入站规则：

| 协议类型 | 端口范围 | 授权对象 | 优先级 |
|---------|---------|---------|--------|
| TCP | 80/80 | 0.0.0.0/0 | 1 |
| TCP | 443/443 | 0.0.0.0/0 | 1 |

**腾讯云：**
1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/cvm)
2. 找到你的云服务器
3. 点击 **安全组** → **修改规则**
4. 添加入站规则（同上）

### 5. 权限问题

```bash
# 检查文件权限
ls -la /opt/snake-game/

# 重新设置权限
cd /opt/snake-game
chmod -R 755 .
chmod -R 777 data/
chown -R root:root .

# 检查服务文件权限
ls -l /etc/systemd/system/snake-game.service
```

### 6. 端口被占用

```bash
# 查找占用 8888 端口的进程
lsof -i :8888
# 或
netstat -tlnp | grep 8888

# 查找占用 80 端口的进程
lsof -i :80
# 或
netstat -tlnp | grep 80

# 杀掉占用进程
kill -9 <PID>
```

### 7. 更新应用

```bash
# 1. 备份数据
cp -r /opt/snake-game/data /opt/snake-game/data.backup

# 2. 上传新文件（参考上面的上传方法）

# 3. 重新设置权限
cd /opt/snake-game
chmod -R 755 .
chmod -R 777 data/

# 4. 重启服务
systemctl restart snake-game

# 5. 查看服务状态
systemctl status snake-game

# 6. 查看日志确认
journalctl -u snake-game -n 50
```

### 8. 清理和重置

```bash
# 停止并禁用服务
systemctl stop snake-game
systemctl disable snake-game

# 删除服务文件
rm -f /etc/systemd/system/snake-game.service

# 重新加载 systemd
systemctl daemon-reload

# 重新创建服务（参考上面的步骤）
```

### 9. SSL 证书问题

#### 证书续期失败

```bash
# 查看续期日志
journalctl -u certbot -n 50

# 手动测试续期
certbot renew --force-renewal
```

#### 证书验证失败

检查 DNS TXT 记录是否正确配置：

```bash
# 查看 TXT 记录
nslookup -type=TXT _acme-challenge.your-domain.com
```

确保：
- 记录类型为 TXT
- 主机记录为 `_acme-challenge`
- 记录值与 certbot 显示的一致

---

## 📊 部署检查清单

### 基础部署
- [ ] 已连接到服务器并更新系统
- [ ] Node.js 18.x 已安装
- [ ] 项目文件已上传到 `/opt/snake-game/`
- [ ] 文件权限已正确设置（data 目录 777）
- [ ] systemd 服务文件已创建
- [ ] 服务已启动并设置为开机自启
- [ ] Node.js 服务已在 8888 端口运行

### Nginx 配置
- [ ] Nginx 已安装
- [ ] Nginx 反向代理已配置
- [ ] 防火墙已开放 80 端口（HTTP）
- [ ] 可以通过浏览器访问网站

### SSL 证书配置
- [ ] SSL 证书已申请（Let's Encrypt 或自有证书）
- [ ] Nginx 已配置 SSL
- [ ] 防火墙已开放 443 端口（HTTPS）
- [ ] HTTP 自动跳转到 HTTPS 已配置
- [ ] 证书自动续期已设置（Let's Encrypt）

### 域名配置
- [ ] 域名 DNS A 记录已配置
- [ ] DNS 解析已生效（nslookup 验证）
- [ ] 云服务器安全组已开放 80 和 443 端口
- [ ] 可以通过域名访问网站

### 最终验证
- [ ] 可以通过 IP 地址访问（HTTP 和 HTTPS）
- [ ] 可以通过域名访问（HTTP 自动跳转 HTTPS）
- [ ] 浏览器显示安全锁图标
- [ ] 所有功能正常（游戏、注册、登录等）
- [ ] 二维码显示正确的访问地址

---

## 🚀 部署验证

完成部署后，执行以下验证：

```bash
# 1. 检查服务状态
systemctl status snake-game
systemctl status nginx

# 2. 检查端口监听
netstat -tlnp | grep -E "80|443|8888"

# 3. 测试 Node.js 服务
curl http://localhost:8888

# 4. 测试 Nginx HTTP
curl -I http://localhost

# 5. 测试 Nginx HTTPS
curl -k https://localhost -I

# 6. 测试 API 接口
curl http://localhost/api/users

# 7. 验证 DNS 解析
nslookup your-domain.com

# 8. 测试外部访问
curl -I http://your-domain.com
curl -I https://your-domain.com

# 9. 查看日志确认无错误
journalctl -u snake-game -n 20
tail -n 20 /var/log/nginx/snake-game-error.log
```

### 浏览器访问测试

- **本地访问**: `http://localhost`
- **IP 访问**: `http://your-server-ip`
- **域名访问**: `http://your-domain.com`（自动跳转到 HTTPS）
- **HTTPS 访问**: `https://your-domain.com`

浏览器地址栏应显示安全锁 🔒 图标。

---

## 📝 部署总结

### 服务架构

```
用户浏览器 → Nginx (80/443) → Node.js (8888) → 数据文件 (data/)
```

### 服务说明

| 服务 | 端口 | 作用 | 管理方式 |
|------|------|------|---------|
| Node.js (snake-game) | 8888 | 处理游戏逻辑、API | systemd |
| Nginx | 80, 443 | 反向代理、SSL 终止、静态文件 | systemd |

### 重要文件路径

| 文件/目录 | 路径 |
|----------|------|
| 应用目录 | `/opt/snake-game` |
| 数据目录 | `/opt/snake-game/data` |
| systemd 服务文件 | `/etc/systemd/system/snake-game.service` |
| Nginx 配置文件 | `/etc/nginx/conf.d/snake-game.conf` |
| Let's Encrypt 证书 | `/etc/letsencrypt/live/your-domain.com/` |
| 自有 SSL 证书 | `/etc/nginx/ssl/` |

### 证书管理

**Let's Encrypt:**
- 有效期：90 天
- 自动续期：已配置（crontab）
- 续期检查：每天凌晨 2 点

**自有证书:**
- 有效期：根据证书购买时长
- 续期：手动更新证书文件并重新加载 Nginx

---

**文档版本**: v3.0
**更新日期**: 2026-01-08
**适用系统**: CentOS 7/8, Rocky Linux, AlmaLinux, Ubuntu 18.04/20.04/22.04

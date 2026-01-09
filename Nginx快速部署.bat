@echo off
chcp 65001 >nul
echo ========================================
echo 贪吃蛇游戏 - Nginx 快速部署脚本
echo ========================================
echo.

REM 检查 Nginx 是否安装
echo [1/4] 检查 Nginx...
where nginx >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Nginx，请先安装 Nginx
    echo.
    echo 安装方法：
    echo 1. 访问 http://nginx.org/en/download.html
    echo 2. 下载稳定版并解压到 C:\nginx
    echo 3. 将 C:\nginx 添加到系统 PATH 环境变量
    echo.
    pause
    exit /b 1
)
echo [√] Nginx 已安装

REM 检查 Node.js
echo [2/4] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)
echo [√] Node.js 已安装

REM 启动 Node.js 服务
echo [3/4] 启动 Node.js 后端服务...
start /B node server.js > server.log 2>&1
timeout /t 3 >nul
echo [√] Node.js 服务已在后台运行（8888端口）

REM 检查 Nginx 配置
echo [4/4] 检查 Nginx 配置...
nginx -t
if %errorlevel% neq 0 (
    echo [错误] Nginx 配置文件有误，请检查 nginx.conf
    pause
    exit /b 1
)

REM 启动 Nginx
echo [√] Nginx 配置验证通过
echo.
echo 正在启动 Nginx...
start nginx
if %errorlevel% neq 0 (
    echo [警告] Nginx 可能已在运行，尝试重新加载...
    nginx -s reload
)
echo [√] Nginx 已启动

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 访问地址：
echo - 本地访问: http://localhost
echo - 局域网访问: http://[你的IP]
echo.
echo 服务端口：
echo - Nginx: 80 (HTTP)
echo - Node.js: 8888 (内部)
echo.
echo 管理命令：
echo - 停止 Nginx: nginx -s stop
echo - 重新加载配置: nginx -s reload
echo - 查看 Node.js 日志: type server.log
echo.
pause

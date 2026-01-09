@echo off
chcp 65001 >nul
echo ========================================
echo    贪吃蛇游戏服务器
echo ========================================
echo.
echo 正在启动服务器...
echo.
echo 服务器默认端口: 8888
echo 如果端口冲突，请修改 server.js 中的 PORT 配置
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

cd /d "%~dp0"
node server.js

pause

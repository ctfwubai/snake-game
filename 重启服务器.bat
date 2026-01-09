@echo off
chcp 65001 >nul
echo ========================================
echo    贪吃蛇游戏服务器 - 重启模式
echo ========================================
echo.

:: 停止旧进程
echo [1/2] 正在停止旧的服务器进程...
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "node.exe"') do (
    taskkill /F /PID %%i 2>nul
)

:: 等待进程结束
timeout /t 2 /nobreak >nul

:: 启动新进程
echo [2/2] 正在启动服务器...
echo.
echo 服务器默认端口: 8888
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

cd /d "%~dp0"
node server.js

pause

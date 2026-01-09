@echo off
chcp 65001 >nul
echo ========================================
echo    停止贪吃蛇游戏服务器
echo ========================================
echo.

:: 查找并终止 node server.js 进程
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "node.exe"') do (
    taskkill /F /PID %%i 2>nul
)

:: 等待一下
timeout /t 1 /nobreak >nul

:: 再次检查是否还有 node 进程在运行
tasklist | findstr /i "node.exe" >nul
if %errorlevel% equ 0 (
    echo.
    echo 已尝试停止所有 node 进程，如果仍有进程运行，请手动检查。
) else (
    echo.
    echo ✅ 服务器已成功停止！
)

echo.
echo ========================================
pause

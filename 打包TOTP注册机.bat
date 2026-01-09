@echo off
chcp 65001 >nul
title TOTP 注册机 - 打包工具

echo.
echo ========================================
echo     TOTP 注册机 - 打包为 EXE
echo ========================================
echo.

echo [1/6] 检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Python 环境
    echo 请先安装 Python 3.7 或更高版本
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo ✓ Python 环境检测通过
echo.

echo [2/6] 检查图标文件...
if exist "icon.ico" (
    echo ✓ 找到图标文件: icon.ico
    set ICON_PARAM=--icon=icon.ico
) else if exist "ico.png" (
    echo ⚠️  发现 PNG 格式图标，正在转换为 ICO 格式...
    python -c "from PIL import Image; img = Image.open('ico.png'); sizes = [(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)]; images = [img.resize(size, Image.Resampling.LANCZOS) for size in sizes]; images[0].save('icon.ico', format='ICO', sizes=sizes)"
    if exist "icon.ico" (
        echo ✓ 图标转换成功
        set ICON_PARAM=--icon=icon.ico
    ) else (
        echo ⚠️  图标转换失败，使用默认图标
        set ICON_PARAM=
    )
) else (
    echo ⚠️  未找到图标文件，使用默认图标
    set ICON_PARAM=
)
echo.

echo [3/6] 安装/更新打包工具...
pip install pyinstaller --quiet --upgrade
if errorlevel 1 (
    echo ❌ 错误: PyInstaller 安装失败
    pause
    exit /b 1
)
echo ✓ PyInstaller 安装/更新完成
echo.

echo [4/6] 开始打包程序...
pyinstaller --onefile ^
    --windowed ^
    --name "TOTP注册机" ^
    --noconfirm ^
    %ICON_PARAM% ^
    totp_generator.py

if errorlevel 1 (
    echo ❌ 错误: 打包失败
    pause
    exit /b 1
)
echo ✓ 程序打包完成
echo.

echo [5/6] 清理临时文件...
if exist "build" rd /s /q "build"
if exist "TOTP注册机.spec" del /f "TOTP注册机.spec"
echo ✓ 临时文件清理完成
echo.

echo [6/6] 显示打包结果...
echo.
echo ========================================
echo ✅ 打包成功！
echo ========================================
echo.
echo 可执行文件位置:
echo   TOTP注册机.exe
echo.
if exist "TOTP注册机.exe" (
    for %%A in ("TOTP注册机.exe") do echo   文件大小: %%~zA 字节（约 %%~zzA MB）
)
echo.
echo 图标:
if exist "icon.ico" (
    echo   ✓ 已使用自定义图标 icon.ico
) else (
    echo   使用默认图标
)
echo.
echo 可以将 EXE 文件复制到任何位置使用
echo.
pause

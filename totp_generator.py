"""
TOTP 注册机 - 现代化设计版
基于RFC 6238标准的TOTP验证码生成器
"""

import tkinter as tk
from tkinter import ttk, messagebox, font
import hashlib
import hmac
import base64
import time
import math
from typing import Optional


class Base32:
    """Base32 编解码工具"""

    _ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    _LOOKUP = {char: index for index, char in enumerate(_ALPHABET)}

    @staticmethod
    def decode(encoded: str) -> bytes:
        """Base32 解码"""
        encoded = encoded.upper().replace(' ', '')
        padding = len(encoded) % 8
        if padding != 0:
            encoded += '=' * (8 - padding)

        bits = 0
        value = 0
        output = []

        for char in encoded:
            if char == '=':
                break
            if char not in Base32._LOOKUP:
                continue

            value = (value << 5) | Base32._LOOKUP[char]
            bits += 5

            if bits >= 8:
                output.append((value >> (bits - 8)) & 0xFF)
                bits -= 8

        return bytes(output)


class TOTPGenerator:
    """TOTP 验证码生成器"""

    def __init__(self):
        self.digits = 6
        self.period = 30
        self.algorithm = 'sha1'

    def generate(self, secret: str, timestamp: Optional[float] = None) -> str:
        """生成TOTP验证码"""
        if timestamp is None:
            timestamp = time.time()

        # 计算时间步数
        counter = int(timestamp / self.period)

        # 解码密钥
        try:
            key_bytes = Base32.decode(secret)
        except Exception as e:
            raise ValueError(f"密钥格式错误: {e}")

        # 将计数器转换为8字节大端序
        counter_bytes = counter.to_bytes(8, byteorder='big', signed=False)

        # 生成HMAC
        hmac_result = hmac.new(key_bytes, counter_bytes, hashlib.sha1).digest()

        # 动态截取
        offset = hmac_result[-1] & 0x0f
        code = int.from_bytes(hmac_result[offset:offset + 4], byteorder='big', signed=False) & 0x7fffffff

        # 提取指定位数
        otp = code % (10 ** self.digits)

        return str(otp).zfill(self.digits)


class TOTPApp:
    """TOTP注册机GUI应用 - 现代化设计"""

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("TOTP Authenticator")
        self.root.geometry("480x600")
        self.root.resizable(False, False)

        # 窗口居中
        self.center_window()

        # 配置主题和颜色
        self.setup_theme()

        # 初始化TOTP生成器
        self.generator = TOTPGenerator()

        # 状态变量
        self.current_secret = tk.StringVar()
        self.current_code = tk.StringVar(value="••• •••")
        self.time_remaining = tk.StringVar(value="30")
        self.update_timer = None
        self.countdown_timer = None
        self.is_generating = False

        # 创建UI
        self.setup_ui()

    def center_window(self):
        """将窗口居中显示"""
        self.root.update_idletasks()
        width = 480
        height = 600
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')

    def setup_theme(self):
        """设置主题和颜色"""
        style = ttk.Style()
        style.theme_use('alt')

        # 现代化配色方案
        self.colors = {
            'primary': '#7C3AED',      # 紫色
            'primary_light': '#A78BFA',
            'secondary': '#06B6D4',    # 青色
            'accent': '#F59E0B',       # 橙色
            'success': '#10B981',      # 绿色
            'dark': '#1F2937',         # 深灰
            'dark_lighter': '#374151',
            'bg_light': '#F3F4F6',
            'bg_white': '#FFFFFF',
            'text_main': '#111827',
            'text_secondary': '#6B7280',
            'border': '#E5E7EB'
        }

        # 配置进度条样式
        style.configure(
            'Custom.Horizontal.TProgressbar',
            troughcolor='#E5E7EB',
            background='#7C3AED',
            borderwidth=0,
            thickness=6,
            lightcolor='#7C3AED',
            darkcolor='#7C3AED'
        )

    def setup_ui(self):
        """创建用户界面 - 现代化设计"""

        # 主容器 - 浅灰背景
        main_container = tk.Frame(self.root, bg=self.colors['bg_light'])
        main_container.pack(fill=tk.BOTH, expand=True, padx=0, pady=0)

        # ============ 顶部区域 ============
        header = tk.Frame(
            main_container,
            bg=self.colors['primary'],
            height=120
        )
        header.pack(fill=tk.X)
        header.pack_propagate(False)

        # 应用标题
        tk.Label(
            header,
            text="TOTP 注册机",
            font=('Microsoft YaHei UI', 28, 'bold'),
            bg=self.colors['primary'],
            fg='white'
        ).pack(pady=(25, 10))

        tk.Label(
            header,
            text="双因素身份验证码生成器",
            font=('Microsoft YaHei UI', 9),
            bg=self.colors['primary'],
            fg=self.colors['primary_light']
        ).pack()

        # ============ 内容区域 ============
        content = tk.Frame(main_container, bg=self.colors['bg_light'])
        content.pack(fill=tk.BOTH, expand=True, padx=20, pady=25)

        # ============ 密钥输入区域 ============
        # 白色卡片
        secret_card = tk.Frame(content, bg=self.colors['bg_white'], highlightbackground=self.colors['border'], highlightthickness=1)
        secret_card.pack(fill=tk.X, pady=(0, 15))

        # 标题
        tk.Label(
            secret_card,
            text="🔑 密钥",
            font=('Microsoft YaHei UI', 10, 'bold'),
            bg=self.colors['bg_white'],
            fg=self.colors['dark']
        ).pack(anchor=tk.W, padx=15, pady=12)

        # 输入框
        secret_entry = tk.Entry(
            secret_card,
            textvariable=self.current_secret,
            font=('Consolas', 13),
            relief=tk.FLAT,
            bd=0,
            bg=self.colors['bg_light'],
            fg=self.colors['dark'],
            insertbackground=self.colors['primary']
        )
        secret_entry.pack(fill=tk.X, padx=15, pady=8, ipady=10)
        secret_entry.focus()

        # 提示
        tk.Label(
            secret_card,
            text="输入您的 Base32 格式密钥",
            font=('Microsoft YaHei UI', 8),
            bg=self.colors['bg_white'],
            fg=self.colors['text_secondary']
        ).pack(anchor=tk.W, padx=15, pady=(8, 15))

        # ============ 生成按钮 ============
        generate_btn = tk.Button(
            content,
            text="生成验证码",
            font=('Microsoft YaHei UI', 13, 'bold'),
            bg=self.colors['primary'],
            fg='white',
            relief=tk.FLAT,
            bd=0,
            cursor='hand2',
            activebackground=self.colors['dark'],
            activeforeground='white',
            command=self.generate_code,
            pady=14
        )
        generate_btn.pack(fill=tk.X, pady=(0, 20))

        # 按钮悬停效果
        def on_enter(event):
            event.widget.config(bg=self.colors['dark'])
        def on_leave(event):
            event.widget.config(bg=self.colors['primary'])
        generate_btn.bind('<Enter>', on_enter)
        generate_btn.bind('<Leave>', on_leave)

        # ============ 验证码显示区域 ============
        code_card = tk.Frame(content, bg=self.colors['primary'])
        code_card.pack(fill=tk.X, pady=(0, 20))

        # 卡片内容
        code_inner = tk.Frame(code_card, bg=self.colors['primary'])
        code_inner.pack(fill=tk.X, padx=20, pady=25)

        # 标签
        tk.Label(
            code_inner,
            text="验证码",
            font=('Microsoft YaHei UI', 11),
            bg=self.colors['primary'],
            fg=self.colors['primary_light']
        ).pack()

        # 大号验证码
        code_display = tk.Label(
            code_inner,
            textvariable=self.current_code,
            font=('Consolas', 52, 'bold'),
            bg=self.colors['primary'],
            fg='white',
            pady=15
        )
        code_display.pack()

        # ============ 倒计时区域 ============
        time_card = tk.Frame(content, bg=self.colors['bg_white'], highlightbackground=self.colors['border'], highlightthickness=1)
        time_card.pack(fill=tk.X, pady=(0, 20))

        time_inner = tk.Frame(time_card, bg=self.colors['bg_white'])
        time_inner.pack(fill=tk.BOTH, padx=20, pady=18)

        # 倒计时标题
        tk.Label(
            time_inner,
            text="⏰ 有效期倒计时",
            font=('Microsoft YaHei UI', 10, 'bold'),
            bg=self.colors['bg_white'],
            fg=self.colors['dark']
        ).pack(anchor=tk.W, pady=(10, 0))

        # 进度条
        self.progress = ttk.Progressbar(
            time_inner,
            style='Custom.Horizontal.TProgressbar',
            mode='determinate',
            maximum=30,
            value=30
        )
        self.progress.pack(fill=tk.X, pady=(10, 10))

        # 时间显示
        time_row = tk.Frame(time_inner, bg=self.colors['bg_white'])
        time_row.pack(fill=tk.X)

        tk.Label(
            time_row,
            text="剩余",
            font=('Microsoft YaHei UI', 9),
            bg=self.colors['bg_white'],
            fg=self.colors['text_secondary']
        ).pack(side=tk.LEFT)

        tk.Label(
            time_row,
            textvariable=self.time_remaining,
            font=('Microsoft YaHei UI', 20, 'bold'),
            bg=self.colors['bg_white'],
            fg=self.colors['primary'],
            padx=8
        ).pack(side=tk.LEFT)

        tk.Label(
            time_row,
            text="秒后更新",
            font=('Microsoft YaHei UI', 9),
            bg=self.colors['bg_white'],
            fg=self.colors['text_secondary']
        ).pack(side=tk.LEFT)

        # ============ 错误信息 ============
        self.error_label = tk.Label(
            content,
            text="",
            font=('Segoe UI', 9),
            bg=self.colors['bg_light'],
            fg='#EF4444',
            wraplength=440
        )
        self.error_label.pack()

        # 绑定回车键
        self.root.bind('<Return>', lambda e: self.generate_code())

    def show_error(self, message: str):
        """显示错误信息"""
        self.error_label.config(text=message)
        self.root.after(5000, lambda: self.error_label.config(text=""))

    def generate_code(self):
        """生成验证码"""
        secret = self.current_secret.get().strip().upper()

        if not secret:
            self.show_error("请输入密钥")
            return

        try:
            # 验证密钥格式
            if not all(c in Base32._ALPHABET or c == '=' for c in secret):
                self.show_error("密钥格式错误（仅支持 A-Z 和 2-7）")
                return

            # 生成验证码
            code = self.generator.generate(secret)
            self.current_code.set(f"{code[:3]} {code[3:]}")

            # 清除错误信息
            self.show_error("")

            # 启动定时器
            self.start_timers(secret)

        except Exception as e:
            self.show_error(f"生成验证码失败: {str(e)}")
            self.current_code.set("••• •••")
            self.stop_timers()

    def start_timers(self, secret: str):
        """启动定时器"""
        # 停止之前的定时器
        self.stop_timers()

        # 立即更新倒计时
        self.update_countdown()

        # 每秒更新倒计时 - 使用递归调用确保持续更新
        self.countdown_timer = self.root.after(1000, lambda: self.update_countdown_and_continue(secret))

        # 计算下次更新时间
        now = time.time()
        next_update = math.ceil(now / 30) * 30
        delay_ms = int((next_update - now) * 1000)

        # 设置30秒后生成新验证码
        self.update_timer = self.root.after(delay_ms, lambda: self.generate_code_if_secret(secret))

    def generate_code_if_secret(self, secret: str):
        """如果密钥未变化则生成新验证码"""
        if self.current_secret.get().strip().upper() == secret:
            self.generate_code()

    def update_countdown(self):
        """更新倒计时显示"""
        now = time.time()
        period = 30
        current_period = int(now / period)
        next_period = (current_period + 1) * period
        remaining = math.ceil((next_period - now))

        # 确保剩余时间在 1-30 之间
        if remaining > 30:
            remaining = 30
        if remaining < 1:
            remaining = 30

        self.time_remaining.set(str(remaining))
        self.progress['value'] = remaining

    def start_timers(self, secret: str):
        """启动定时器"""
        # 停止之前的定时器
        self.stop_timers()

        # 立即更新倒计时
        self.update_countdown()

        # 启动倒计时循环
        self.countdown_timer = self.root.after(1000, lambda: self.update_countdown_loop(secret))

        # 计算下次更新时间
        now = time.time()
        next_update = math.ceil(now / 30) * 30
        delay_ms = int((next_update - now) * 1000)

        # 设置30秒后生成新验证码
        self.update_timer = self.root.after(delay_ms, lambda: self.generate_code_if_secret(secret))

    def update_countdown_loop(self, secret: str):
        """倒计时循环更新"""
        # 检查密钥是否还在
        current_secret = self.current_secret.get().strip().upper()
        if current_secret != secret:
            return

        # 更新倒计时
        self.update_countdown()

        # 继续下一秒的更新
        self.countdown_timer = self.root.after(1000, lambda: self.update_countdown_loop(secret))

    def generate_code_if_secret(self, secret: str):
        """如果密钥未变化则生成新验证码"""
        if self.current_secret.get().strip().upper() == secret:
            self.generate_code()

    def update_countdown(self):
        """更新倒计时显示"""
        now = time.time()
        period = 30
        current_period = int(now / period)
        next_period = (current_period + 1) * period
        remaining = math.ceil((next_period - now))

        self.time_remaining.set(str(remaining))
        self.progress['value'] = remaining

    def stop_timers(self):
        """停止所有定时器"""
        if self.update_timer:
            self.root.after_cancel(self.update_timer)
            self.update_timer = None

        if self.countdown_timer:
            self.root.after_cancel(self.countdown_timer)
            self.countdown_timer = None

    def run(self):
        """运行应用"""
        try:
            self.root.mainloop()
        finally:
            self.stop_timers()


def main():
    """主函数"""
    try:
        app = TOTPApp()
        app.run()
    except Exception as e:
        messagebox.showerror("错误", f"程序启动失败: {str(e)}")


if __name__ == '__main__':
    main()

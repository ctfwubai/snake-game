// 路由和页面渲染系统
const Router = {
    currentPage: null,
    currentUser: null,
    adminLoginTime: null,  // 管理员登录时间
    adminSessionTimeout: 5 * 60 * 1000,  // 5分钟超时（毫秒）
    sessionCheckInterval: null,  // 会话检查定时器

    // 初始化路由
    async init() {
        console.log('=== Router.init() 开始 ===');
        console.log('当前URL:', window.location.href);

        // 检查所有localStorage和sessionStorage的值
        console.log('localStorage.getItem("isAdminLoggedIn"):', localStorage.getItem('isAdminLoggedIn'));
        console.log('localStorage.getItem("adminLoginTime"):', localStorage.getItem('adminLoginTime'));
        console.log('sessionStorage.getItem("isAdminLoggedIn"):', sessionStorage.getItem('isAdminLoggedIn'));
        console.log('sessionStorage.getItem("adminLoginTime"):', sessionStorage.getItem('adminLoginTime'));

        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');

        console.log('page参数:', page);

        if (page === 'login') {
            this.renderLoginPage();
        } else if (page === 'register') {
            this.renderRegisterPage();
        } else if (page === 'admin') {
            await this.renderAdminPage();
        } else if (page === 'forgot-password') {
            this.renderForgotPasswordPage();
        } else {
            await this.renderHomePage();
        }

        console.log('=== Router.init() 结束 ===');
    },

    // 渲染主页
    async renderHomePage() {
        const container = document.getElementById('page-container');
        const config = await DataManager.getAdminConfig();

        // 始终使用当前浏览器访问的实际地址作为扫码链接
        const scanLink = window.location.origin;

        // console.log('当前页面URL:', currentOrigin);  // 减少日志输出
        // console.log('配置的扫码链接:', config.scanLink);  // 隐藏敏感信息
        // console.log('实际使用的扫码链接:', scanLink);  // 减少日志输出

        container.innerHTML = `
            <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                    <!-- 扫码登录区域 -->
                    <div class="card">
                        <h2 style="text-align: center; margin-bottom: 20px; color: #667eea;">扫码登录游戏</h2>
                        <div class="qr-container">
                            <canvas id="login-qr"></canvas>
                            <p>扫描二维码登录游戏</p>
                            <p style="font-size: 12px; color: #999; margin-top: 10px;">链接: ${scanLink}</p>
                        </div>
                    </div>

                    <!-- 加入微信群区域 -->
                    ${config.wechatQR ? `
                        <div class="card">
                            <h2 style="text-align: center; margin-bottom: 20px; color: #10b981;">加入微信群</h2>
                            <div class="qr-container">
                                <img id="wechat-qr" src="${config.wechatQR}" alt="微信群二维码" style="max-width: 200px; border: 4px solid white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                <p>扫描二维码加入游戏群</p>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 管理员入口 -->
                    <div class="card">
                        <h2 style="text-align: center; margin-bottom: 20px; color: #f59e0b;">管理员后台</h2>
                        <div style="display: flex; flex-direction: column; gap: 16px; align-items: center;">
                            <button class="btn btn-primary" onclick="Router.renderAdminLogin().catch(console.error)">进入管理员后台</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 延迟生成登录二维码，确保DOM已更新
        setTimeout(() => {
            const canvas = document.getElementById('login-qr');
            if (canvas && typeof QRCode !== 'undefined') {
                // 使用当前浏览器访问的实际地址生成二维码
                const loginUrl = `${scanLink}${window.location.pathname}?page=login`;
                console.log('生成二维码链接:', loginUrl);
                QRCode.toCanvas(canvas, loginUrl, {
                    width: 200,
                    margin: 2
                }, (error) => {
                    if (error) {
                        console.error('二维码生成失败:', error);
                    }
                });
            } else if (canvas) {
                canvas.getContext('2d').fillStyle = '#f59e0b';
                canvas.getContext('2d').font = '14px sans-serif';
                canvas.getContext('2d').textAlign = 'center';
                canvas.getContext('2d').fillText('正在加载二维码库...', 100, 100);
            }
        }, 100);
    },

    // 渲染登录页面
    renderLoginPage() {
        const container = document.getElementById('page-container');

        container.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="card" style="max-width: 400px; width: 100%;">
                    <h2 style="text-align: center; margin-bottom: 30px; color: #667eea;">登录游戏</h2>
                    <div class="input-group">
                        <label>手机尾号（后4位）</label>
                        <input type="text" id="phone-tail" placeholder="请输入手机号后4位" maxlength="4" autocomplete="off">
                    </div>
                    <button class="btn btn-primary" style="width: 100%;" onclick="Router.handleLogin().catch(console.error)">登录</button>
                    <p style="text-align: center; margin-top: 20px; color: #718096;">
                        还没有账号？<a href="?page=register" style="color: #667eea;">立即注册</a>
                    </p>
                </div>
            </div>
        `;
    },

    // 处理登录
    async handleLogin() {
        const phoneTail = document.getElementById('phone-tail').value.trim();

        if (!phoneTail || phoneTail.length !== 4 || !/^\d+$/.test(phoneTail)) {
            this.showToast('请输入正确的手机尾号（4位数字）', 'error');
            return;
        }

        console.log('开始登录，手机尾号:', phoneTail);

        const result = await DataManager.loginUser(phoneTail);
        console.log('登录API返回结果:', result);

        if (!result.success) {
            this.showToast(result.message, 'error');
            return;
        }

        const user = result.user;
        console.log('登录成功，用户信息:', user);

        // 保存当前用户
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));

        this.showToast('登录成功！', 'success');
        setTimeout(() => {
            this.renderGamePage();
        }, 1000);
    },

    // 渲染注册页面
    renderRegisterPage() {
        const container = document.getElementById('page-container');

        container.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="card" style="max-width: 400px; width: 100%;">
                    <h2 style="text-align: center; margin-bottom: 30px; color: #667eea;">注册账号</h2>
                    <div class="input-group">
                        <label>姓名</label>
                        <input type="text" id="user-name" placeholder="请输入您的姓名" autocomplete="off">
                    </div>
                    <div class="input-group">
                        <label>手机尾号（后4位）</label>
                        <input type="text" id="phone-tail" placeholder="请输入手机号后4位" maxlength="4" autocomplete="off">
                    </div>
                    <div class="input-group">
                        <label>游戏邀请码 <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="invite-code" placeholder="请输入邀请码" autocomplete="off">
                    </div>
                    <button class="btn btn-primary" style="width: 100%;" onclick="Router.handleRegister().catch(console.error)">注册</button>
                    <p style="text-align: center; margin-top: 20px; color: #718096;">
                        已有账号？<a href="?page=login" style="color: #667eea;">立即登录</a>
                    </p>
                </div>
            </div>
        `;
    },

    // 处理注册
    async handleRegister() {
        console.log('=== 注册按钮被点击 ===');
        const name = document.getElementById('user-name').value.trim();
        const phoneTail = document.getElementById('phone-tail').value.trim();
        const inviteCode = document.getElementById('invite-code').value.trim();

        // console.log('表单数据:', { name, phoneTail, inviteCode });  // 隐藏用户数据

        if (!name) {
            this.showToast('请输入姓名', 'error');
            return;
        }

        if (!phoneTail || phoneTail.length !== 4 || !/^\d+$/.test(phoneTail)) {
            this.showToast('请输入正确的手机尾号（4位数字）', 'error');
            return;
        }

        if (!inviteCode) {
            this.showToast('请输入邀请码', 'error');
            return;
        }

        console.log('开始调用 registerUser...');
        const result = await DataManager.registerUser(name, phoneTail, inviteCode);
        console.log('registerUser 返回结果:', result);

        if (!result.success) {
            this.showToast(result.message, 'error');
            return;
        }

        this.showToast('注册成功！', 'success');
        setTimeout(() => {
            window.location.href = '?page=login';
        }, 1500);
    },

    // 渲染忘记密码页面
    renderForgotPasswordPage() {
        const container = document.getElementById('page-container');
        container.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="card" style="max-width: 500px; width: 100%;">
                    <h2 style="text-align: center; margin-bottom: 30px; color: #667eea;">忘记密码</h2>

                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #fbbf24; margin-bottom: 25px;">
                        <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0;">⚠️ 安全提示：</p>
                        <ul style="color: #92400e; font-size: 14px; margin: 0; padding-left: 20px;">
                            <li>如果您忘记了管理员密码</li>
                            <li>可以使用独立的 TOTP 注册机工具生成验证码</li>
                            <li>结合TOTP密钥重置系统密码</li>
                        </ul>
                    </div>

                    <div class="input-group">
                        <label>TOTP 密钥 (Secret Key)</label>
                        <input type="text" id="recovery-secret" placeholder="请输入您的TOTP密钥" autocomplete="off">
                    </div>

                    <div class="input-group">
                        <label>动态验证码</label>
                        <input type="text" id="recovery-code" placeholder="请输入从注册机获取的6位验证码" maxlength="6" autocomplete="off">
                    </div>

                    <div class="input-group" style="position: relative;">
                        <label>新密码</label>
                        <input type="password" id="new-password" placeholder="请输入新管理员密码" autocomplete="new-password">
                        <button type="button" onclick="Router.togglePasswordVisibility('new-password')" style="position: absolute; right: 10px; top: 42px; background: none; border: none; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>

                    <button class="btn btn-primary" style="width: 100%; margin-bottom: 15px;" onclick="Router.handlePasswordReset().catch(console.error)">重置密码</button>

                    <p style="text-align: center; margin-top: 20px;">
                        <a href="?page=admin" style="color: #667eea;">返回登录</a>
                    </p>
                </div>
            </div>
        `;
    },

    // 处理密码重置
    async handlePasswordReset() {
        const secret = document.getElementById('recovery-secret').value.trim();
        const code = document.getElementById('recovery-code').value.trim();
        const newPassword = document.getElementById('new-password').value.trim();

        if (!secret) {
            this.showToast('请输入TOTP密钥', 'error');
            return;
        }

        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            this.showToast('请输入正确的6位验证码', 'error');
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            this.showToast('新密码至少6个字符', 'error');
            return;
        }

        // 先获取系统配置的密钥
        const config = await DataManager.getAdminConfig();

        // 验证输入的密钥是否与系统配置的密钥一致
        if (!config.mfaSecret || secret !== config.mfaSecret) {
            this.showToast('TOTP密钥不正确，无法重置密码', 'error');
            return;
        }

        // 验证验证码 - 使用服务器端 API
        try {
            const response = await fetch(`${DataManager.apiBaseUrl}/api/verify-totp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret, code })
            });

            const result = await response.json();

            if (!result.success) {
                this.showToast('验证码验证失败，请检查密钥和验证码是否正确', 'error');
                return;
            }
        } catch (error) {
            console.error('TOTP验证失败:', error);
            this.showToast('验证码验证失败，请稍后重试', 'error');
            return;
        }

        // 验证成功，重置密码
        config.adminPassword = newPassword;

        const saveResult = await DataManager.saveAdminConfig(config);

        if (saveResult && saveResult.success) {
            this.showToast('密码重置成功！', 'success');
            setTimeout(() => {
                window.location.href = '?page=admin';
            }, 1500);
        } else {
            this.showToast('密码保存失败', 'error');
        }
    },

    // 渲染游戏页面
    async renderGamePage() {
        const container = document.getElementById('page-container');
        const user = this.currentUser || JSON.parse(localStorage.getItem('currentUser'));

        if (!user) {
            window.location.href = '?page=login';
            return;
        }

        // 获取用户历史记录
        const allRecords = await DataManager.getGameRecords();
        const records = allRecords.filter(r => r.userId === user.id);
        const bestScore = records.length > 0 ? Math.max(...records.map(r => r.score), 0) : 0;

        // 获取所有主题
        const themes = getAllThemes();

        container.innerHTML = `
            <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px;">
                <div style="color: white; text-align: center; margin-bottom: 30px;">
                    <h1>贪吃蛇游戏</h1>
                    <p style="margin-top: 10px;">欢迎，${user.name} | 最高分：${bestScore}</p>
                </div>

                <div class="game-container">
                    <div class="game-info">
                        <div>得分：<span id="score">0</span></div>
                        <div id="level-info" style="display: none;">第 <span id="level">1</span> 关</div>
                        <div>最高分：${bestScore}</div>
                    </div>

                    <canvas id="game-canvas"></canvas>

                    <div class="game-controls">
                        <button class="btn btn-success" id="start-btn" onclick="Router.startGame()">开始游戏</button>
                        <button class="btn btn-warning" onclick="Router.resetGame()">重新开始</button>
                        <button class="btn btn-danger" onclick="Router.logout()">退出登录</button>
                    </div>

                    <!-- 虚拟方向键 - 游戏手柄 -->
                    <div id="virtual-controls" style="background: rgba(255,255,255,0.1); padding: 30px 20px; border-radius: 12px; width: 100%; max-width: 400px;">
                        <h3 style="margin-bottom: 20px; color: white; text-align: center;">操作控制</h3>

                        <!-- 游戏手柄 -->
                        <div class="gamepad-container">
                            <div class="gamepad-base"></div>
                            <div class="gamepad-center"></div>
                            <button class="direction-btn" data-direction="up" onclick="Router.changeDirection('up')" aria-label="向上"></button>
                            <button class="direction-btn" data-direction="down" onclick="Router.changeDirection('down')" aria-label="向下"></button>
                            <button class="direction-btn" data-direction="left" onclick="Router.changeDirection('left')" aria-label="向左"></button>
                            <button class="direction-btn" data-direction="right" onclick="Router.changeDirection('right')" aria-label="向右"></button>
                        </div>

                        <p style="text-align: center; color: white; margin-top: 20px; font-size: 13px; opacity: 0.9;">
                            点击按钮控制方向<br>
                            或在画布上滑动
                        </p>
                    </div>

                    <!-- 游戏设置按钮（手机端） -->
                    <div class="settings-toggle-btn" onclick="Router.toggleSettings()">
                        <span class="settings-icon">⚙️</span>
                        <span class="settings-text">游戏设置</span>
                    </div>

                    <!-- 游戏设置卡片 -->
                    <div class="settings-card" id="settings-card" style="display: none;">
                        <div class="settings-header">
                            <div class="settings-title">
                                <span>⚙️ 游戏设置</span>
                                <button class="settings-close-btn" onclick="Router.toggleSettings()">✕</button>
                            </div>
                        </div>

                        <div class="settings-body">
                            <!-- 游戏模式 -->
                            <div class="setting-item">
                                <div class="setting-label">
                                    <span class="setting-icon">🎮</span>
                                    <span>游戏模式</span>
                                </div>
                                <div class="setting-control">
                                    <select id="game-mode" onchange="Router.handleGameModeChange()">
                                        <option value="casual">休闲模式</option>
                                        <option value="challenge">闯关模式</option>
                                    </select>
                                </div>
                            </div>

                            <!-- 主题选择 -->
                            <div class="setting-item">
                                <div class="setting-label">
                                    <span class="setting-icon">🎨</span>
                                    <span>主题风格</span>
                                </div>
                                <div class="setting-control">
                                    <select id="game-theme" onchange="Router.handleThemeChange()">
                                        ${themes.map(theme =>
                                            '<option value="' + theme.id + '">' + theme.name + '</option>'
                                        ).join('')}
                                    </select>
                                </div>
                            </div>

                            <!-- 速度设置（休闲模式） -->
                            <div class="setting-item" id="speed-setting">
                                <div class="setting-label">
                                    <span class="setting-icon">⚡</span>
                                    <span>游戏速度</span>
                                </div>
                                <div class="setting-control">
                                    <input type="range" id="game-speed" min="50" max="300" value="250" step="10" onchange="Router.handleSpeedChange(this.value)">
                                    <span id="speed-value" class="speed-display">250ms</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${records.length > 0 ? `
                        <div style="background: white; padding: 20px; border-radius: 12px; width: 100%; max-width: 400px; margin-top: 20px;">
                            <h3 style="margin-bottom: 15px;">历史记录</h3>
                            <div style="max-height: 200px; overflow-y: auto;">
                                ${records.slice(0, 10).map(r => {
                                    const date = r.timestamp ? new Date(r.timestamp) : new Date();
                                    const dateStr = isNaN(date.getTime()) ? '刚刚' : date.toLocaleString('zh-CN', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    return '<div style="padding: 10px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">' +
                                    '<span>得分：' + r.score + '</span>' +
                                    '<span style="font-size: 12px; color: #666;">' + dateStr + '</span>' +
                                    '</div>';
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // 初始化游戏
        this.game = new SnakeGame(
            document.getElementById('game-canvas'),
            this.handleGameOver.bind(this),
            (score) => {
                document.getElementById('score').textContent = score;
            },
            this.handleLevelUp.bind(this)
        );

        // 设置默认模式和主题
        this.game.setGameMode('casual');
        this.game.setTheme(getTheme('cute'));
        this.game.setBaseSpeed(250);

        this.game.init();
    },

    // 切换设置面板
    toggleSettings() {
        const settingsCard = document.getElementById('settings-card');
        const toggleBtn = document.querySelector('.settings-toggle-btn');
        const settingsIcon = toggleBtn.querySelector('.settings-icon');

        if (settingsCard.style.display === 'none' || settingsCard.style.display === '') {
            settingsCard.style.display = 'block';
            settingsIcon.style.transform = 'rotate(90deg)';
            settingsCard.style.animation = 'slideDown 0.3s ease';
        } else {
            settingsCard.style.display = 'none';
            settingsIcon.style.transform = 'rotate(0deg)';
        }
    },

    // 处理游戏模式变化
    handleGameModeChange() {
        const mode = document.getElementById('game-mode').value;
        const speedSetting = document.getElementById('speed-setting');
        const levelInfo = document.getElementById('level-info');

        this.game.setGameMode(mode);

        if (mode === 'challenge') {
            speedSetting.style.display = 'none';
            levelInfo.style.display = 'block';
        } else {
            speedSetting.style.display = 'block';
            levelInfo.style.display = 'none';
        }

        this.resetGame();
    },

    // 处理主题变化
    handleThemeChange() {
        const themeId = document.getElementById('game-theme').value;
        const theme = getTheme(themeId);
        this.game.setTheme(theme);
        this.game.draw();
    },

    // 处理速度变化
    handleSpeedChange(value) {
        document.getElementById('speed-value').textContent = value + 'ms';
        this.game.setBaseSpeed(parseInt(value));
        if (this.game.isPlaying) {
            this.game.gameSpeed = parseInt(value);
            clearInterval(this.game.gameLoop);
            this.game.gameLoop = setInterval(() => this.game.update(), this.game.gameSpeed);
        }
    },

    // 处理升级
    handleLevelUp(level) {
        document.getElementById('level').textContent = level;
        this.showToast(`恭喜通过第 ${level - 1} 关！`, 'success');
    },

    // 开始游戏
    startGame() {
        const btn = document.getElementById('start-btn');
        if (this.game.isPlaying) {
            this.game.pause();
            btn.textContent = '继续游戏';
        } else {
            this.game.start();
            btn.textContent = '暂停游戏';
        }
    },

    // 改变方向（虚拟按钮）
    changeDirection(direction) {
        if (!this.game) return;

        const currentDirection = this.game.direction;

        switch(direction) {
            case 'up':
                if (currentDirection !== 'down') {
                    this.game.nextDirection = 'up';
                }
                break;
            case 'down':
                if (currentDirection !== 'up') {
                    this.game.nextDirection = 'down';
                }
                break;
            case 'left':
                if (currentDirection !== 'right') {
                    this.game.nextDirection = 'left';
                }
                break;
            case 'right':
                if (currentDirection !== 'left') {
                    this.game.nextDirection = 'right';
                }
                break;
        }
    },

    // 重置游戏
    resetGame() {
        this.game.reset();
        const btn = document.getElementById('start-btn');
        if (btn) btn.textContent = '开始游戏';
    },

    // 游戏结束处理
    async handleGameOver(score, duration) {
        const user = this.currentUser || JSON.parse(localStorage.getItem('currentUser'));

        // 保存游戏记录
        await DataManager.addGameRecord({
            userId: user.id,
            score,
            duration
        });

        this.showToast(`游戏结束！得分：${score}`, 'warning');

        // 重新加载游戏页面以更新历史记录
        setTimeout(() => {
            this.renderGamePage();
        }, 1500);
    },

    // 退出登录
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        window.location.href = '?page=login';
    },

    // 渲染管理员登录页面
    async renderAdminLogin() {
        const container = document.getElementById('page-container');
        const config = await DataManager.getAdminConfig();

        // 如果启用了MFA，从服务器获取当前验证码供调试
        let debugInfo = '';
        if (config.mfaEnabled && config.mfaSecret) {
            try {
                const response = await fetch(`${DataManager.apiBaseUrl}/api/generate-totp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: config.mfaSecret })
                });
                const result = await response.json();
                const currentCode = result.success ? result.code : '获取失败';

                debugInfo = '';
            } catch (error) {
                console.error('获取服务器验证码失败:', error);
                debugInfo = `
                    <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border: 1px solid #ef4444; margin-bottom: 20px;">
                        <p style="color: #b91c1c; font-size: 14px; margin: 0;">
                            <strong>⚠️ 无法获取服务器验证码</strong><br>
                            请检查服务器连接或使用手机/注册机的验证码登录
                        </p>
                    </div>
                `;
            }
        }

        container.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="card" style="max-width: 400px; width: 100%;">
                    <h2 style="text-align: center; margin-bottom: 30px; color: #667eea;">管理员登录</h2>
                    ${config.mfaEnabled ? `
                        ${debugInfo}
                        <div class="input-group" style="position: relative;">
                            <label>管理员密码</label>
                            <input type="password" id="admin-password" placeholder="请输入管理员密码" autocomplete="new-password">
                            <button type="button" onclick="Router.togglePasswordVisibility('admin-password')" style="position: absolute; right: 10px; top: 42px; background: none; border: none; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                        <div class="input-group">
                            <label>双因子验证码</label>
                            <input type="text" id="mfa-code" placeholder="请输入6位动态验证码" maxlength="6" autocomplete="off">
                        </div>
                        <button class="btn btn-primary" style="width: 100%;" onclick="Router.handleAdminLogin().catch(console.error)">登录</button>
                        <div style="margin-top: 15px; text-align: center;">
                            <a href="?page=forgot-password" style="color: #667eea; font-size: 14px;">忘记密码？</a>
                        </div>
                    ` : `
                        <div class="input-group" style="position: relative;">
                            <label>管理员密码</label>
                            <input type="password" id="admin-password" placeholder="请输入管理员密码" autocomplete="new-password">
                            <button type="button" onclick="Router.togglePasswordVisibility('admin-password')" style="position: absolute; right: 10px; top: 42px; background: none; border: none; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                        <button class="btn btn-primary" style="width: 100%;" onclick="Router.handleAdminLogin().catch(console.error)">登录</button>
                        <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border: 1px solid #fbbf24;">
                            <p style="color: #92400e; font-size: 14px; margin: 0;">⚠️ 首次登录请启用双因子认证，提高安全性</p>
                            <button class="btn btn-warning" style="margin-top: 10px; font-size: 14px; padding: 8px 16px;" onclick="Router.enableMFA().catch(console.error)">启用双因子认证</button>
                        </div>
                        <div style="margin-top: 15px; text-align: center;">
                            <a href="?page=forgot-password" style="color: #667eea; font-size: 14px;">忘记密码？</a>
                        </div>
                    `}
                    <p style="text-align: center; margin-top: 20px;">
                        <a href="?" style="color: #667eea;">返回主页</a>
                    </p>
                </div>
            </div>
        `;

        // 不在这里生成二维码,只在已登录的管理员后台页面生成
    },

    // 切换密码显示/隐藏
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const button = event.target.closest('button');
        const svg = button.querySelector('svg');

        if (input.type === 'password') {
            input.type = 'text';
            // 显示密码 - 显示斜杠眼睛
            svg.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M1 1l22 22"></path>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
            `;
        } else {
            input.type = 'password';
            // 隐藏密码 - 显示正常眼睛
            svg.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    },

    // 显示手动添加密钥的弹窗
    showMFASecretManual(secret) {
        const formattedSecret = TOTP.formatSecret(secret);

        const modal = document.createElement('div');
        modal.id = 'mfa-secret-manual-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        modal.innerHTML = `
            <div class="card" style="max-width: 450px; padding: 30px;">
                <h2 style="color: #667eea; margin-bottom: 20px;">手动添加TOTP密钥</h2>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: #1e293b; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">在您的TOTP应用中手动添加账户:</p>

                    <div style="margin-bottom: 15px;">
                        <label style="color: #64748b; font-size: 13px; display: block; margin-bottom: 5px;">账户名称:</label>
                        <input type="text" value="贪吃蛇管理" readonly style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; font-size: 14px;">
                    </div>

                    <div>
                        <label style="color: #64748b; font-size: 13px; display: block; margin-bottom: 5px;">密钥 (Secret Key):</label>
                        <input type="text" value="${secret}" readonly style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; font-size: 14px; font-family: monospace; letter-spacing: 2px;">
                    </div>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn" onclick="document.getElementById('mfa-secret-manual-modal').remove()" style="background: #718096; color: white;">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // 显示TOTP密钥管理弹窗(仅在已登录的管理员后台显示)
    async showMFAManagement() {
        const config = await DataManager.getAdminConfig();

        if (!config.mfaSecret) {
            this.showToast('未启用双因子认证', 'error');
            return;
        }

        const formattedSecret = TOTP.formatSecret(config.mfaSecret);
        let currentCode = '获取中...';

        // 从服务器获取当前验证码
        try {
            const response = await fetch(`${DataManager.apiBaseUrl}/api/generate-totp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: config.mfaSecret })
            });
            const result = await response.json();
            if (result.success) {
                currentCode = result.code;
            }
        } catch (error) {
            console.error('获取服务器验证码失败:', error);
            currentCode = '获取失败';
        }

        const modal = document.createElement('div');
        modal.id = 'mfa-management-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        modal.innerHTML = `
            <div class="card" style="max-width: 500px; padding: 30px;">
                <h2 style="color: #667eea; margin-bottom: 20px;">TOTP密钥管理</h2>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="color: #1e293b; font-size: 14px; font-weight: bold; margin: 0 0 15px 0;">当前密钥信息:</p>

                    <div style="margin-bottom: 15px;">
                        <label style="color: #64748b; font-size: 13px; display: block; margin-bottom: 5px;">密钥:</label>
                        <input type="text" value="${config.mfaSecret}" readonly style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; font-size: 14px; font-family: monospace; letter-spacing: 2px;">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="color: #64748b; font-size: 13px; display: block; margin-bottom: 5px;">TOTP URL (备用):</label>
                        <input type="text" value="otpauth://totp/SnakeAdmin?secret=${config.mfaSecret}&issuer=SnakeGame&algorithm=SHA1&digits=6&period=30" readonly style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; font-size: 12px; font-family: monospace;">
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn btn-warning" onclick="Router.regenerateMFASecret().catch(console.error)">重新生成密钥</button>
                    <button class="btn" onclick="document.getElementById('mfa-management-modal').remove()" style="background: #718096; color: white;">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // 处理管理员登录
    async handleAdminLogin() {
        const password = document.getElementById('admin-password').value;
        const mfaCodeElement = document.getElementById('mfa-code');
        const config = await DataManager.getAdminConfig();

        // console.log('开始管理员登录验证');  // 减少日志输出

        // 验证密码
        if (password !== config.adminPassword) {
            this.showToast('密码错误！', 'error');
            return;
        }
        // console.log('密码验证通过');  // 减少日志输出

        // 如果启用了双因子，验证验证码
        if (config.mfaEnabled) {
            const mfaCode = mfaCodeElement ? mfaCodeElement.value.trim() : '';

            // console.log('输入的验证码:', mfaCode);  // 隐藏敏感信息
            // console.log('验证码长度:', mfaCode.length);  // 减少日志输出

            if (!mfaCode) {
                this.showToast('请输入动态验证码', 'error');
                return;
            }

            if (mfaCode.length !== 6) {
                this.showToast(`验证码必须是6位数字，当前是${mfaCode.length}位`, 'error');
                return;
            }

            // 验证 TOTP 验证码 - 使用服务器端 API
            // console.log('开始验证TOTP码...');  // 减少日志输出
            try {
                const response = await fetch(`${DataManager.apiBaseUrl}/api/verify-totp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: config.mfaSecret, code: mfaCode })
                });

                const result = await response.json();
                // console.log('TOTP验证结果:', result);  // 隐藏敏感信息

                if (!result.success) {
                    this.showToast('验证码错误或已过期！', 'error');
                    return;
                }

                // 登录成功
                localStorage.setItem('isAdminLoggedIn', 'true');
                localStorage.setItem('adminLoginTime', Date.now().toString());
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                sessionStorage.setItem('adminLoginTime', Date.now().toString());
                this.showToast('登录成功！', 'success');
                setTimeout(async () => {
                    await this.renderAdminPage();
                }, 500);
            } catch (error) {
                console.error('TOTP验证出错:', error);
                this.showToast('验证失败，请稍后重试', 'error');
                return;
            }
        }

        // MFA未启用，直接登录成功
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminLoginTime', Date.now().toString());
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        sessionStorage.setItem('adminLoginTime', Date.now().toString());
        this.showToast('登录成功！', 'success');
        setTimeout(async () => {
            await this.renderAdminPage();
        }, 500);
    },

    // 启用双因子认证
    async enableMFA() {
        const password = document.getElementById('admin-password').value;
        const config = await DataManager.getAdminConfig();

        // 验证密码
        if (password !== config.adminPassword) {
            this.showToast('密码错误！', 'error');
            return;
        }

        // 生成新的 TOTP 密钥
        const secret = TOTP.generateSecret(16);
        const formattedSecret = TOTP.formatSecret(secret);

        // 更新配置
        config.mfaEnabled = true;
        config.mfaSecret = secret;
        DataManager.updateAdminConfig(config);

        // 显示密钥信息
        this.showMFASetupModal(secret, formattedSecret);
    },

    // 显示双因子设置弹窗
    showMFASetupModal(secret, formattedSecret, testCode = null) {
        const modal = document.createElement('div');
        modal.id = 'mfa-setup-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        modal.innerHTML = `
            <div class="card" style="max-width: 450px; padding: 30px; text-align: center;">
                <h2 style="color: #667eea; margin-bottom: 20px;">绑定双因子认证</h2>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                    <p style="color: #1e293b; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">步骤1：在验证APP中手动添加账户</p>
                    <div style="margin-bottom: 15px;">
                        <label style="color: #64748b; font-size: 13px; display: block; margin-bottom: 5px;">账户名称：</label>
                        <input type="text" id="mfa-account" value="贪吃蛇管理" readonly style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; font-size: 14px;">
                    </div>
                    <div>
                        <label style="color: #64748b; font-size: 13px; display: block; margin-bottom: 5px;">密钥：</label>
                        <input type="text" id="mfa-secret-key" value="${secret}" readonly style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: white; font-size: 14px; font-family: monospace; letter-spacing: 2px;">
                    </div>
                </div>

                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                    <p style="color: #92400e; font-size: 13px; margin: 0 0 10px 0;">步骤2：验证绑定</p>
                    <div class="input-group" style="margin-bottom: 0;">
                        <label>输入APP显示的6位动态验证码</label>
                        <input type="text" id="setup-mfa-code" placeholder="123456" maxlength="6" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 20px; letter-spacing: 4px; text-align: center;">
                    </div>
                </div>

                <button class="btn btn-primary" onclick="Router.completeMFASetup('${secret}').catch(console.error)">验证并绑定</button>
            </div>
        `;

        document.body.appendChild(modal);
    },



    // 完成双因子绑定
    async completeMFASetup(secret) {
        const mfaCodeInput = document.getElementById('setup-mfa-code');
        const mfaCode = mfaCodeInput ? mfaCodeInput.value.trim() : '';

        // console.log('验证绑定验证码:', mfaCode);  // 隐藏敏感信息

        if (!mfaCode || mfaCode.length !== 6) {
            this.showToast('请输入6位动态验证码', 'error');
            return;
        }

        // 验证验证码是否正确 - 使用服务器端 API
        try {
            const response = await fetch(`${DataManager.apiBaseUrl}/api/verify-totp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret, code: mfaCode })
            });

            const result = await response.json();
            console.log('验证结果:', result);

            if (!result.success) {
                // 验证失败，提示用户
                this.showToast('验证码验证失败，请重新扫描二维码', 'error');
                return;
            }

            // 验证成功，关闭弹窗
            const modal = document.getElementById('mfa-setup-modal');
            if (modal) modal.remove();

            // 重新登录页面显示二维码
            this.showToast('双因子认证绑定成功！', 'success');
            await this.renderAdminLogin();
        } catch (error) {
            console.error('验证失败:', error);
            this.showToast('验证失败，请稍后重试', 'error');
        }
    },

    // 渲染管理员后台页面
    async renderAdminPage() {
        try {
            // 优先从sessionStorage获取（刷新后不会丢失），其次从localStorage获取
            const sessionLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
            const localLoggedIn = localStorage.getItem('isAdminLoggedIn');
            const isLoggedIn = sessionLoggedIn || localLoggedIn;

            console.log('=== 检查管理员登录状态 ===');
            console.log('sessionLoggedIn:', sessionLoggedIn);
            console.log('localLoggedIn:', localLoggedIn);
            console.log('isLoggedIn:', isLoggedIn);

            if (isLoggedIn !== 'true') {
                console.log('未登录，跳转到登录页');
                await this.renderAdminLogin();
                return;
            }

            // 检查登录是否超时
            const sessionLoginTime = sessionStorage.getItem('adminLoginTime');
            const localLoginTime = localStorage.getItem('adminLoginTime');
            const loginTime = sessionLoginTime || localLoginTime;

            console.log('sessionLoginTime:', sessionLoginTime);
            console.log('localLoginTime:', localLoginTime);
            console.log('loginTime:', loginTime);

            const currentTime = Date.now();

            if (loginTime) {
                const elapsedTime = currentTime - parseInt(loginTime);
                console.log('elapsedTime:', elapsedTime, 'ms');
                console.log('timeout:', this.adminSessionTimeout, 'ms');

                // 只有当确实超时（超过5分钟）时才退出
                if (elapsedTime > this.adminSessionTimeout) {
                    console.log('登录已超时，退出登录');
                    // 超时，清除登录状态
                    localStorage.removeItem('isAdminLoggedIn');
                    localStorage.removeItem('adminLoginTime');
                    sessionStorage.removeItem('isAdminLoggedIn');
                    sessionStorage.removeItem('adminLoginTime');
                    this.stopSessionCheck();
                    await this.renderAdminLogin();
                    return;
                }
                // 刷新页面时也更新登录时间,避免刷新后被踢出
                console.log('更新登录时间');
                localStorage.setItem('adminLoginTime', currentTime.toString());
                sessionStorage.setItem('adminLoginTime', currentTime.toString());
            }

            console.log('已登录，加载后台数据');
            // 启动会话检查
            this.startSessionCheck();

            // console.log('已登录，开始加载后台数据');  // 减少日志输出
            const container = document.getElementById('page-container');
            if (!container) {
                console.error('找不到 page-container 元素');
                return;
            }

            const config = await DataManager.getAdminConfig();
            const users = await DataManager.getUsers();
            const records = await DataManager.getGameRecords();
            const logs = await DataManager.getLoginLogs();
            // console.log('后台数据加载完成:', { users: users.length, records: records.length, logs: logs.length });  // 减少日志输出

            // 转换IP地址为IPv4格式
            const convertToIPv4 = (ip) => {
                if (!ip) return '未知';
                // 如果是IPv6映射的IPv4 (::ffff:x.x.x.x)
                if (ip.includes('::ffff:')) {
                    return ip.split(':').pop();
                }
                // 如果是IPv4,直接返回
                if (ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                    return ip;
                }
                // 其他情况返回原始IP
                return ip;
            };

        container.innerHTML = `
            <div style="min-height: 100vh; padding: 40px 20px;">
                <div style="max-width: 1200px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                        <h1 style="color: white;">管理员后台</h1>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" onclick="Router.renderUserManagement().catch(console.error)">用户管理</button>
                            <button class="btn btn-danger" onclick="Router.logoutAdmin()">退出登录</button>
                        </div>
                    </div>

                    <!-- 配置管理 -->
                    <div class="card" style="margin-bottom: 30px;">
                        <h2 style="margin-bottom: 20px; color: #667eea;">配置管理</h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                            <div class="input-group">
                                <label>扫码跳转链接</label>
                                <input type="text" id="scan-link" value="${config.scanLink}" placeholder="http://192.168.1.100:8888">
                            </div>
                            <div class="input-group">
                                <label>微信群二维码URL</label>
                                <input type="text" id="wechat-qr" value="${config.wechatQR}" placeholder="微信群二维码图片地址">
                            </div>
                            <div class="input-group">
                                <label>管理员密码</label>
                                <input type="text" id="admin-password" value="${config.adminPassword || ''}" placeholder="留空则不修改">
                                <p style="font-size: 12px; color: #718096; margin-top: 5px;">当前密码已显示，留空则不修改</p>
                            </div>
                            <div class="input-group">
                                <label>双因子认证</label>
                                <select id="mfa-enabled">
                                    <option value="true" ${config.mfaEnabled ? 'selected' : ''}>启用</option>
                                    <option value="false" ${!config.mfaEnabled ? 'selected' : ''}>禁用</option>
                                </select>
                                ${config.mfaEnabled ? `
                                    <p style="font-size: 12px; color: #10b981; margin-top: 5px;">已启用双因子认证，登录时需要验证码</p>
                                    <button class="btn btn-warning" style="margin-top: 10px; font-size: 12px; padding: 6px 12px;" onclick="Router.showMFAManagement().catch(console.error)">管理TOTP密钥</button>
                                ` : `
                                    <p style="font-size: 12px; color: #718096; margin-top: 5px;">禁用后仅使用密码登录</p>
                                `}
                            </div>
                        </div>

                        <!-- 闯关模式配置 -->
                        <h3 style="margin: 20px 0 15px; color: #667eea;">闯关模式配置</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                            <div class="input-group">
                                <label>初始速度（毫秒/格）</label>
                                <input type="number" id="challenge-base-speed" value="${config.challengeBaseSpeed || 250}" min="100" max="500" step="10">
                                <p style="font-size: 12px; color: #718096; margin-top: 5px;">第一关的速度（默认250毫秒），值越小越快，建议范围：100-500</p>
                            </div>
                            <div class="input-group">
                                <label>每关速度递增（毫秒）</label>
                                <input type="number" id="challenge-speed-increase" value="${config.challengeSpeedIncrease || 5}" min="1" max="50" step="1">
                                <p style="font-size: 12px; color: #718096; margin-top: 5px;">每过一关速度加快多少，设为0表示不加速</p>
                            </div>
                        </div>

                        <button class="btn btn-primary" onclick="Router.saveConfig().catch(console.error)">保存配置</button>
                    </div>

                    <!-- 邀请码管理 -->
                    <div class="card" style="margin-bottom: 30px;">
                        <h2 style="margin-bottom: 20px; color: #667eea;">邀请码管理</h2>
                        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                            <input type="text" id="new-invite-code" placeholder="输入新邀请码" style="flex: 1; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px;">
                            <button class="btn btn-success" onclick="Router.addInviteCode().catch(console.error)">添加邀请码</button>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${config.inviteCodes.map(code =>
                                '<div style="background: #f7fafc; padding: 8px 16px; border-radius: 20px; display: flex; align-items: center; gap: 10px;">' +
                                '<span>' + code + '</span>' +
                                '<button onclick="Router.deleteInviteCode(\'' + code + '\').catch(console.error)" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px;">×</button>' +
                                '</div>'
                            ).join('')}
                        </div>
                    </div>

                    <!-- 数据导出 -->
                    <div class="card" style="margin-bottom: 30px;">
                        <h2 style="margin-bottom: 20px; color: #667eea;">数据导出</h2>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-success" onclick="Router.exportData('users')">导出用户数据</button>
                            <button class="btn btn-success" onclick="Router.exportData('games')">导出游戏记录</button>
                            <button class="btn btn-success" onclick="Router.exportData('loginLogs')">导出登录记录</button>
                        </div>
                    </div>

                    <!-- 数据重置 -->
                    <div class="card" style="margin-bottom: 30px;">
                        <h2 style="margin-bottom: 20px; color: #ef4444;">数据重置</h2>
                        <p style="color: #718096; margin-bottom: 15px;">⚠️ 此操作不可恢复，请谨慎操作！</p>
                        <button class="btn btn-danger" onclick="Router.showResetDataModal().catch(console.error)">重置数据</button>
                    </div>

                    <!-- 用户数据 -->
                    <div class="card" style="margin-bottom: 30px;">
                        <h2 style="margin-bottom: 20px; color: #667eea;">用户数据 (${users.length}人)</h2>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>姓名</th>
                                        <th>手机尾号</th>
                                        <th>邀请码</th>
                                        <th>最高分</th>
                                        <th>游戏次数</th>
                                        <th>注册时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${users.length > 0 ? users.map(user =>
                                        '<tr>' +
                                        '<td>' + user.id + '</td>' +
                                        '<td>' + user.name + '</td>' +
                                        '<td>' + user.phoneSuffix + '</td>' +
                                        '<td>' + user.inviteCode + '</td>' +
                                        '<td>' + user.highScore + '</td>' +
                                        '<td>' + user.playCount + '</td>' +
                                        '<td>' + new Date(user.registerTime).toLocaleString() + '</td>' +
                                        '</tr>'
                                    ).join('') : '<tr><td colspan="7" style="text-align: center;">暂无用户数据</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 游戏记录 -->
                    <div class="card" style="margin-bottom: 30px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="color: #667eea; margin: 0;">游戏记录 (${records.length}条)</h2>
                            ${records.length > 20 ? `
                                <button class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;" onclick="Router.renderAllGameRecords().catch(console.error)">查看全部</button>
                            ` : ''}
                        </div>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>用户</th>
                                        <th>手机尾号</th>
                                        <th>得分</th>
                                        <th>游戏时长(秒)</th>
                                        <th>游戏时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${records.length > 0 ? records.slice(0, 20).map(record => {
                                        const user = users.find(u => u.id === record.userId);
                                        return '<tr>' +
                                            '<td>' + (user ? user.name : '未知') + '</td>' +
                                            '<td>' + (user ? user.phoneSuffix : '未知') + '</td>' +
                                            '<td>' + record.score + '</td>' +
                                            '<td>' + record.duration + '</td>' +
                                            '<td>' + new Date(record.timestamp).toLocaleString() + '</td>' +
                                            '</tr>';
                                    }).join('') : '<tr><td colspan="5" style="text-align: center;">暂无游戏记录</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 登录记录 -->
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="color: #667eea; margin: 0;">最近登录记录 (${logs.length}条)</h2>
                            ${logs.length > 20 ? `
                                <button class="btn btn-primary" style="padding: 8px 16px; font-size: 14px;" onclick="Router.renderAllLoginLogs().catch(console.error)">查看全部</button>
                            ` : ''}
                        </div>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>用户</th>
                                        <th>手机尾号</th>
                                        <th>登录时间</th>
                                        <th>设备信息</th>
                                        <th>IP地址</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logs.length > 0 ? logs.slice(0, 20).map(log => {
                                        const user = users.find(u => u.id === log.userId);
                                        return '<tr>' +
                                            '<td>' + (user ? user.name : '未知') + '</td>' +
                                            '<td>' + (user ? user.phoneSuffix : '未知') + '</td>' +
                                            '<td>' + new Date(log.timestamp).toLocaleString() + '</td>' +
                                            '<td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">' + (log.deviceId || '未知') + '</td>' +
                                            '<td>' + convertToIPv4(log.ipAddress) + '</td>' +
                                            '</tr>';
                                    }).join('') : '<tr><td colspan="5" style="text-align: center;">暂无登录记录</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        } catch (error) {
            console.error('renderAdminPage 执行出错:', error);
            this.showToast('加载后台页面失败: ' + error.message, 'error');
        }
    },

    // 保存配置
    async saveConfig() {
        const scanLink = document.getElementById('scan-link').value.trim();
        const wechatQR = document.getElementById('wechat-qr').value.trim();
        const adminPassword = document.getElementById('admin-password').value.trim();
        const mfaEnabled = document.getElementById('mfa-enabled').value === 'true';
        const challengeBaseSpeed = parseInt(document.getElementById('challenge-base-speed').value) || 250;
        const challengeSpeedIncrease = parseInt(document.getElementById('challenge-speed-increase').value) || 5;

        const config = await DataManager.getAdminConfig();
        config.scanLink = scanLink;
        config.wechatQR = wechatQR;

        // 只有当输入了新密码时才更新密码
        if (adminPassword) {
            config.adminPassword = adminPassword;
        }

        config.mfaEnabled = mfaEnabled;
        config.challengeBaseSpeed = challengeBaseSpeed;
        config.challengeSpeedIncrease = challengeSpeedIncrease;

        const result = await DataManager.saveAdminConfig(config);
        if (result.success) {
            this.showToast('配置已保存！', 'success');
            await this.renderAdminPage();
        } else {
            this.showToast('保存失败: ' + (result.message || '未知错误'), 'error');
        }
    },

    // 切换双因子认证
    async toggleMFA() {
        const config = await DataManager.getAdminConfig();
        const mfaEnabled = document.getElementById('mfa-enabled').value === 'true';

        if (mfaEnabled) {
            // 启用双因子
            if (!config.mfaSecret) {
                const secret = TOTP.generateSecret(16);
                config.mfaSecret = secret;
                const result = await DataManager.saveAdminConfig(config);
                if (result.success) {
                    this.showToast('双因子认证已启用，请使用验证器APP扫描二维码', 'success');
                } else {
                    this.showToast('启用双因子认证失败: ' + (result.message || '未知错误'), 'error');
                    await this.renderAdminPage();
                    return;
                }
            } else {
                const result = await DataManager.saveAdminConfig(config);
                if (result.success) {
                    this.showToast('双因子认证已启用', 'success');
                } else {
                    this.showToast('启用双因子认证失败', 'error');
                    await this.renderAdminPage();
                    return;
                }
            }
        } else {
            // 禁用双因子
            config.mfaEnabled = false;
            const result = await DataManager.saveAdminConfig(config);
            if (result.success) {
                this.showToast('双因子认证已禁用', 'success');
            } else {
                this.showToast('禁用双因子认证失败', 'error');
                await this.renderAdminPage();
                return;
            }
        }
        await this.renderAdminPage();
    },

    // 重新生成 MFA 密钥
    async regenerateMFASecret() {
        if (!confirm('重新生成密钥后，旧的密钥将失效，确定要继续吗？')) {
            return;
        }

        // 生成新的随机密钥
        const secret = TOTP.generateSecret(16);
        const formattedSecret = TOTP.formatSecret(secret);

        // console.log('生成的密钥:', secret);  // 隐藏敏感信息
        // console.log('格式化密钥:', formattedSecret);  // 隐藏敏感信息

        const config = await DataManager.getAdminConfig();
        config.mfaSecret = secret;

        const result = await DataManager.saveAdminConfig(config);
        if (result.success) {
            this.showToast('新密钥已生成，请扫描二维码重新绑定', 'success');
        } else {
            this.showToast('生成密钥失败: ' + (result.message || '未知错误'), 'error');
            await this.renderAdminPage();
            return;
        }

        // 从服务器生成测试验证码
        let testCode = '获取中...';
        try {
            const testResponse = await fetch(`${DataManager.apiBaseUrl}/api/generate-totp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret })
            });
            const testResult = await testResponse.json();
            if (testResult.success) {
                testCode = testResult.code;
            }
        } catch (error) {
            console.error('获取测试验证码失败:', error);
            testCode = '获取失败';
        }
        console.log('测试验证码:', testCode);

        // 显示新的设置弹窗
        this.showMFASetupModal(secret, formattedSecret, testCode);
    },

    // 添加邀请码
    async addInviteCode() {
        const code = document.getElementById('new-invite-code').value.trim();

        if (!code) {
            this.showToast('请输入邀请码', 'error');
            return;
        }

        const config = await DataManager.getAdminConfig();
        if (config.inviteCodes.includes(code)) {
            this.showToast('该邀请码已存在', 'error');
            return;
        }

        config.inviteCodes.push(code);
        DataManager.updateAdminConfig(config);
        this.showToast('邀请码添加成功！', 'success');
        await this.renderAdminPage();
    },

    // 删除邀请码
    async deleteInviteCode(code) {
        const config = await DataManager.getAdminConfig();
        config.inviteCodes = config.inviteCodes.filter(c => c !== code);
        DataManager.updateAdminConfig(config);
        this.showToast('邀请码已删除', 'success');
        await this.renderAdminPage();
    },

    // 导出数据
    exportData(type) {
        const result = DataManager.exportData(type);

        if (result.success) {
            this.showToast('数据导出成功！', 'success');
        } else {
            this.showToast(result.message, 'error');
        }
    },

    // 启动会话检查定时器
    startSessionCheck() {
        // 清除之前的定时器
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }

        // 每 30 秒检查一次会话状态
        this.sessionCheckInterval = setInterval(() => {
            const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn') || localStorage.getItem('isAdminLoggedIn');
            const loginTime = sessionStorage.getItem('adminLoginTime') || localStorage.getItem('adminLoginTime');

            if (isLoggedIn === 'true' && loginTime) {
                const currentTime = Date.now();
                const elapsedTime = currentTime - parseInt(loginTime);

                // 超时，自动退出
                if (elapsedTime > this.adminSessionTimeout) {
                    this.stopSessionCheck();
                    localStorage.removeItem('isAdminLoggedIn');
                    localStorage.removeItem('adminLoginTime');
                    sessionStorage.removeItem('isAdminLoggedIn');
                    sessionStorage.removeItem('adminLoginTime');
                    alert('登录已超时（5分钟未操作），请重新登录');
                    this.renderAdminLogin();
                }
            }
        }, 30000); // 30 秒检查一次
    },

    // 停止会话检查
    stopSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    },

    // 退出管理员登录
    logoutAdmin() {
        // 停止会话检查
        this.stopSessionCheck();

        // 清除登录状态
        localStorage.removeItem('isAdminLoggedIn');
        localStorage.removeItem('adminLoginTime');
        sessionStorage.removeItem('isAdminLoggedIn');
        sessionStorage.removeItem('adminLoginTime');

        // 返回主页
        window.location.href = '?';
    },

    // 渲染用户管理页面
    async renderUserManagement() {
        try {
            const container = document.getElementById('page-container');
            const users = await DataManager.getUsers();
            const logs = await DataManager.getLoginLogs();

            // 转换IP地址为IPv4格式
            const convertToIPv4 = (ip) => {
                if (!ip) return '未知';
                if (ip.includes('::ffff:')) {
                    return ip.split(':').pop();
                }
                if (ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                    return ip;
                }
                return ip;
            };

            container.innerHTML = `
                <div style="min-height: 100vh; padding: 40px 20px;">
                    <div style="max-width: 1400px; margin: 0 auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                            <div style="display: flex; align-items: center; gap: 20px;">
                                <h1 style="color: white; margin: 0;">用户管理</h1>
                                <span style="background: #667eea; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px;">
                                    共 ${users.length} 位用户
                                </span>
                            </div>
                            <button class="btn btn-primary" onclick="Router.renderAdminPage().catch(console.error)">
                                返回后台
                            </button>
                        </div>

                        <!-- 用户统计 -->
                        <div class="card" style="margin-bottom: 30px;">
                            <h2 style="margin-bottom: 20px; color: #667eea;">用户统计</h2>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white;">
                                    <div style="font-size: 14px; opacity: 0.9;">总用户数</div>
                                    <div style="font-size: 32px; font-weight: bold; margin-top: 10px;">${users.length}</div>
                                </div>
                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; color: white;">
                                    <div style="font-size: 14px; opacity: 0.9;">活跃用户（最近7天）</div>
                                    <div style="font-size: 32px; font-weight: bold; margin-top: 10px;">${logs.filter(l => {
                                        const loginTime = new Date(l.timestamp);
                                        const weekAgo = new Date();
                                        weekAgo.setDate(weekAgo.getDate() - 7);
                                        return loginTime > weekAgo;
                                    }).length}</div>
                                </div>
                                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; color: white;">
                                    <div style="font-size: 14px; opacity: 0.9;">总游戏次数</div>
                                    <div style="font-size: 32px; font-weight: bold; margin-top: 10px;">${users.reduce((sum, u) => sum + (u.playCount || 0), 0)}</div>
                                </div>
                                <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; border-radius: 12px; color: white;">
                                    <div style="font-size: 14px; opacity: 0.9;">最高分</div>
                                    <div style="font-size: 32px; font-weight: bold; margin-top: 10px;">${Math.max(...users.map(u => u.highScore || 0), 0)}</div>
                                </div>
                            </div>
                        </div>

                        <!-- 用户列表 -->
                        <div class="card">
                            <h2 style="margin-bottom: 20px; color: #667eea;">用户列表</h2>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>用户ID</th>
                                            <th>姓名</th>
                                            <th>手机尾号</th>
                                            <th>邀请码</th>
                                            <th>最高分</th>
                                            <th>游戏次数</th>
                                            <th>注册时间</th>
                                            <th>注册IP</th>
                                            <th>设备ID</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${users.length > 0 ? users.map(user =>
                                            '<tr>' +
                                            '<td>' + user.id + '</td>' +
                                            '<td>' + user.name + '</td>' +
                                            '<td>' + user.phoneSuffix + '</td>' +
                                            '<td>' + user.inviteCode + '</td>' +
                                            '<td>' + user.highScore + '</td>' +
                                            '<td>' + user.playCount + '</td>' +
                                            '<td>' + new Date(user.registerTime).toLocaleString() + '</td>' +
                                            '<td>' + convertToIPv4(user.registerIp) + '</td>' +
                                            '<td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; font-family: monospace; font-size: 12px;">' + (user.deviceId || '未知') + '</td>' +
                                            '<td>' +
                                                '<div style="display: flex; gap: 8px;">' +
                                                '<button class="btn btn-warning" style="padding: 6px 12px; font-size: 12px;" onclick="Router.disableUser(\'' + user.id + '\')">注销</button>' +
                                                '<button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="Router.deleteUser(\'' + user.id + '\')">删除</button>' +
                                                '</div>' +
                                            '</td>' +
                                            '</tr>'
                                        ).join('') : '<tr><td colspan="10" style="text-align: center;">暂无用户数据</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('renderUserManagement 执行出错:', error);
            this.showToast('加载用户管理页面失败: ' + error.message, 'error');
        }
    },

    // 注销用户
    async disableUser(userId) {
        if (!confirm('确定要注销该用户吗？注销后该用户将无法登录。')) {
            return;
        }

        try {
            const response = await fetch(`${window.location.origin}/api/disable-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const result = await response.json();
            if (result.success) {
                this.showToast('用户已注销', 'success');
                await this.renderUserManagement();
            } else {
                this.showToast(result.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('注销用户失败:', error);
            this.showToast('操作失败', 'error');
        }
    },

    // 删除用户
    async deleteUser(userId) {
        if (!confirm('确定要删除该用户吗？删除后将无法恢复！')) {
            return;
        }

        if (!confirm('再次确认：删除用户将永久删除其所有数据，包括游戏记录！')) {
            return;
        }

        try {
            const response = await fetch(`${window.location.origin}/api/delete-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const result = await response.json();
            if (result.success) {
                this.showToast('用户已删除', 'success');
                await this.renderUserManagement();
            } else {
                this.showToast(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除用户失败:', error);
            this.showToast('操作失败', 'error');
        }
    },

    // 渲染全部游戏记录页面
    async renderAllGameRecords() {
        try {
            const container = document.getElementById('page-container');
            const records = await DataManager.getGameRecords();
            const users = await DataManager.getUsers();

            container.innerHTML = `
                <div style="min-height: 100vh; padding: 40px 20px;">
                    <div style="max-width: 1400px; margin: 0 auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                            <div style="display: flex; align-items: center; gap: 20px;">
                                <h1 style="color: white; margin: 0;">全部游戏记录</h1>
                                <span style="background: #667eea; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px;">
                                    共 ${records.length} 条记录
                                </span>
                            </div>
                            <button class="btn btn-primary" onclick="Router.renderAdminPage().catch(console.error)">
                                返回后台
                            </button>
                        </div>

                        <div class="card">
                            <h2 style="margin-bottom: 20px; color: #667eea;">游戏记录列表</h2>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>序号</th>
                                            <th>用户</th>
                                            <th>手机尾号</th>
                                            <th>得分</th>
                                            <th>游戏时长(秒)</th>
                                            <th>游戏时间</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${records.length > 0 ? records.map((record, index) => {
                                            const user = users.find(u => u.id === record.userId);
                                            return '<tr>' +
                                                '<td>' + (index + 1) + '</td>' +
                                                '<td>' + (user ? user.name : '未知') + '</td>' +
                                                '<td>' + (user ? user.phoneSuffix : '未知') + '</td>' +
                                                '<td style="font-weight: bold; color: #667eea;">' + record.score + '</td>' +
                                                '<td>' + record.duration + '</td>' +
                                                '<td>' + new Date(record.timestamp).toLocaleString('zh-CN') + '</td>' +
                                                '</tr>';
                                        }).join('') : '<tr><td colspan="6" style="text-align: center;">暂无游戏记录</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('renderAllGameRecords 执行出错:', error);
            this.showToast('加载游戏记录页面失败: ' + error.message, 'error');
        }
    },

    // 渲染全部登录记录页面
    async renderAllLoginLogs() {
        try {
            const container = document.getElementById('page-container');
            const logs = await DataManager.getLoginLogs();
            const users = await DataManager.getUsers();

            // 转换IP地址为IPv4格式
            const convertToIPv4 = (ip) => {
                if (!ip) return '未知';
                if (ip.includes('::ffff:')) {
                    return ip.split(':').pop();
                }
                if (ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                    return ip;
                }
                return ip;
            };

            container.innerHTML = `
                <div style="min-height: 100vh; padding: 40px 20px;">
                    <div style="max-width: 1400px; margin: 0 auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                            <div style="display: flex; align-items: center; gap: 20px;">
                                <h1 style="color: white; margin: 0;">全部登录记录</h1>
                                <span style="background: #667eea; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px;">
                                    共 ${logs.length} 条记录
                                </span>
                            </div>
                            <button class="btn btn-primary" onclick="Router.renderAdminPage().catch(console.error)">
                                返回后台
                            </button>
                        </div>

                        <div class="card">
                            <h2 style="margin-bottom: 20px; color: #667eea;">登录记录列表</h2>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>序号</th>
                                            <th>用户</th>
                                            <th>手机尾号</th>
                                            <th>登录时间</th>
                                            <th>设备信息</th>
                                            <th>IP地址</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${logs.length > 0 ? logs.map((log, index) => {
                                            const user = users.find(u => u.id === log.userId);
                                            return '<tr>' +
                                                '<td>' + (index + 1) + '</td>' +
                                                '<td>' + (user ? user.name : '未知') + '</td>' +
                                                '<td>' + (user ? user.phoneSuffix : '未知') + '</td>' +
                                                '<td>' + new Date(log.timestamp).toLocaleString('zh-CN') + '</td>' +
                                                '<td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; font-family: monospace; font-size: 12px;">' + (log.deviceId || '未知') + '</td>' +
                                                '<td>' + convertToIPv4(log.ipAddress) + '</td>' +
                                                '</tr>';
                                        }).join('') : '<tr><td colspan="6" style="text-align: center;">暂无登录记录</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('renderAllLoginLogs 执行出错:', error);
            this.showToast('加载登录记录页面失败: ' + error.message, 'error');
        }
    },

    // 显示重置数据模态框
    showResetDataModal() {
        const modal = document.createElement('div');
        modal.id = 'reset-data-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        modal.innerHTML = `
            <div class="card" style="max-width: 500px; padding: 30px;">
                <h2 style="color: #ef4444; margin-bottom: 20px;">⚠️ 重置数据</h2>

                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #fbbf24;">
                    <p style="color: #92400e; font-size: 14px; margin: 0;">
                        此操作将<strong>永久删除</strong>选中的数据，无法恢复！
                    </p>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="font-weight: bold; margin-bottom: 15px; display: block;">请选择要重置的数据类型：</label>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <input type="checkbox" id="reset-games" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1;">
                                <strong>游戏记录</strong>
                                <div style="font-size: 12px; color: #718096; margin-top: 2px;">删除所有游戏得分记录</div>
                            </span>
                        </label>

                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <input type="checkbox" id="reset-logs" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="flex: 1;">
                                <strong>登录记录</strong>
                                <div style="font-size: 12px; color: #718096; margin-top: 2px;">删除所有用户登录日志</div>
                            </span>
                        </label>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn" onclick="document.getElementById('reset-data-modal').remove()" style="background: #718096; color: white;">取消</button>
                    <button class="btn btn-danger" onclick="Router.executeResetData().catch(console.error)">确认重置</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // 执行数据重置
    async executeResetData() {
        const resetGames = document.getElementById('reset-games').checked;
        const resetLogs = document.getElementById('reset-logs').checked;

        if (!resetGames && !resetLogs) {
            this.showToast('请至少选择一种数据类型', 'error');
            return;
        }

        let confirmMsg = '确认要重置以下数据吗？\n\n';
        if (resetGames) confirmMsg += '✓ 游戏记录\n';
        if (resetLogs) confirmMsg += '✓ 登录记录\n';
        confirmMsg += '\n此操作不可恢复！';

        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            const response = await fetch(`${window.location.origin}/api/reset-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetGames, resetLogs })
            });

            const result = await response.json();

            // 关闭模态框
            const modal = document.getElementById('reset-data-modal');
            if (modal) modal.remove();

            if (result.success) {
                let msg = '数据重置成功！';
                if (resetGames) msg += ' 已删除游戏记录';
                if (resetLogs) msg += ' 已删除登录记录';
                this.showToast(msg, 'success');
                DataManager.clearCache();
                await this.renderAdminPage();
            } else {
                this.showToast(result.message || '重置失败', 'error');
            }
        } catch (error) {
            console.error('重置数据失败:', error);
            this.showToast('操作失败: ' + error.message, 'error');
        }
    },

    // 显示提示
    showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);


        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

// 页面加载完成后初始化路由
window.addEventListener('DOMContentLoaded', () => {
    Router.init().catch(console.error);
});

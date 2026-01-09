// 数据管理器 - 使用 API 服务器
const DataManager = {
    // API 基础URL
    apiBaseUrl: window.location.origin,

    // 缓存
    cache: {
        users: null,
        games: null,
        logs: null,
        config: null,
        lastUpdate: 0
    },

    // 设备ID
    deviceId: null,

    // 初始化
    init() {
        this.deviceId = this.getDeviceId();

        // 初始化配置（如果不存在）
        if (!localStorage.getItem('snake_admin_config')) {
            const defaultConfig = this.getDefaultConfig();
            localStorage.setItem('snake_admin_config', JSON.stringify(defaultConfig));
            // console.log('初始化默认配置:', defaultConfig);  // 隐藏敏感信息
        }

        // console.log('DataManager初始化完成');  // 减少日志输出
    },

    // 获取设备唯一ID
    getDeviceId() {
        const STORAGE_KEY = 'snake-device-id';
        let deviceId = localStorage.getItem(STORAGE_KEY);

        if (!deviceId) {
            deviceId = this.generateDeviceId();
            localStorage.setItem(STORAGE_KEY, deviceId);
        }

        return deviceId;
    },

    // 生成设备ID
    generateDeviceId() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device Fingerprint', 2, 2);
        const canvasFingerprint = canvas.toDataURL().slice(-50);

        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            navigator.platform,
            canvasFingerprint,
            Math.random().toString(36).substring(2, 15)
        ];

        const hash = components.join('|').split('').reduce((acc, char) => {
            acc = ((acc << 5) - acc) + char.charCodeAt(0);
            return acc & acc;
        }, 0);

        return Math.abs(hash).toString(16).padStart(16, '0');
    },

    // 清除缓存
    clearCache() {
        this.cache = {
            users: null,
            games: null,
            logs: null,
            config: null,
            lastUpdate: 0
        };
    },

    // 获取管理员配置（从LocalStorage）
    getAdminConfigSync() {
        try {
            const configData = localStorage.getItem('snake_admin_config');
            if (configData) {
                const config = JSON.parse(configData);
                // console.log('从LocalStorage读取配置:', config);  // 隐藏敏感信息
                return config;
            }
            // console.log('配置不存在，使用默认配置');  // 减少日志输出
            return this.getDefaultConfig();
        } catch (error) {
            console.error('读取配置失败，使用默认配置:', error);
            return this.getDefaultConfig();
        }
    },

    // 获取管理员配置（API版本，异步）
    async getAdminConfig() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/admin/config`);
            if (response.ok) {
                const config = await response.json();
                this.cache.config = config;
                // console.log('从API读取配置:', config);  // 隐藏敏感信息
                return config;
            }
            return this.getAdminConfigSync();
        } catch (error) {
            console.error('获取配置失败:', error);
            return this.getAdminConfigSync();
        }
    },

    // 默认配置
    getDefaultConfig() {
        return {
            scanLink: window.location.origin,
            wechatQR: '',
            inviteCodes: ['VIP2024', 'SNAKE001', 'GAME2024'],
            adminPassword: 'admin123',
            challengeSpeedIncrease: 5,
            challengeBaseSpeed: 250,
            mfaEnabled: false,
            mfaSecret: '',
            gameMode: 'classic',
            speed: 5,
            theme: 'classic',
            requireInviteCode: true
        };
    },

    // 保存管理员配置
    async saveAdminConfig(config) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/admin/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (response.ok) {
                this.cache.config = config;
                localStorage.setItem('snake_admin_config', JSON.stringify(config));
                // console.log('配置已保存到API和LocalStorage:', config);  // 隐藏敏感信息
                return { success: true };
            }
            return { success: false, message: '保存失败' };
        } catch (error) {
            console.error('保存配置失败:', error);
            return { success: false, message: error.message };
        }
    },

    // 获取所有用户
    async getUsers() {
        try {
            // 缓存1分钟
            if (this.cache.users && Date.now() - this.cache.lastUpdate < 60000) {
                return this.cache.users;
            }

            const response = await fetch(`${this.apiBaseUrl}/api/users`);
            if (response.ok) {
                const users = await response.json();
                this.cache.users = users;
                this.cache.lastUpdate = Date.now();
                return users;
            }
            return [];
        } catch (error) {
            console.error('获取用户失败:', error);
            return this.cache.users || [];
        }
    },

    // 获取所有用户（LocalStorage版本，同步）
    getAllUsers() {
        try {
            const usersData = localStorage.getItem('snake_users');
            console.log('LocalStorage当前用户数据:', usersData);
            const users = usersData ? JSON.parse(usersData) : [];
            console.log('解析后的用户列表:', users);
            return users;
        } catch (error) {
            console.error('获取用户列表失败:', error);
            return [];
        }
    },

    // 获取所有用户（API版本，异步）
    async getUsers() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/users`);
            if (response.ok) {
                const users = await response.json();
                this.cache.users = users;
                this.cache.lastUpdate = Date.now();
                return users;
            }
            return [];
        } catch (error) {
            console.error('获取用户失败:', error);
            return this.cache.users || [];
        }
    },

    // 获取邀请码列表
    async getInviteCodes() {
        try {
            const config = await this.getAdminConfig();
            return config.inviteCodes || ['VIP2024', 'SNAKE001', 'GAME2024'];
        } catch (error) {
            console.error('获取邀请码失败:', error);
            return ['VIP2024', 'SNAKE001', 'GAME2024'];
        }
    },

    // 根据手机尾号查找用户
    async getUserByPhoneTail(phoneTail) {
        const users = await this.getUsers();
        return users.find(user => user.phoneSuffix === phoneTail);
    },

    // 注册新用户（使用API）
    async registerUser(name, phoneTail, inviteCode) {
        try {
            console.log('=== 开始注册流程 ===');
            // console.log('输入参数:', { name, phoneTail, inviteCode });  // 隐藏用户数据

            const response = await fetch(`${this.apiBaseUrl}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    phoneTail: phoneTail,
                    inviteCode: inviteCode,
                    deviceId: this.deviceId
                })
            });

            const result = await response.json();
            console.log('注册API返回结果:', result);
            return result;
        } catch (error) {
            console.error('注册失败:', error);
            return { success: false, message: '网络错误: ' + error.message };
        }
    },

    // 登录用户（使用API）
    async loginUser(phoneTail) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneTail: phoneTail,
                    deviceId: this.deviceId
                })
            });

            const result = await response.json();
            console.log('登录API返回结果:', result);
            return result;
        } catch (error) {
            console.error('登录失败:', error);
            return { success: false, message: '网络错误: ' + error.message };
        }
    },

    // 添加登录日志（API已自动记录）
    async addLoginLog(userId) {
        // API登录时已自动添加日志，这里不需要额外操作
        return { success: true };
    },

    // 保存游戏记录
    async addGameRecord(record) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });

            if (response.ok) {
                this.clearCache();
                return { success: true };
            }
            return { success: false, message: '保存失败' };
        } catch (error) {
            console.error('保存游戏记录失败:', error);
            return { success: false, message: error.message };
        }
    },

    // 获取游戏记录
    async getGameRecords() {
        try {
            if (this.cache.games && Date.now() - this.cache.lastUpdate < 60000) {
                return this.cache.games;
            }

            const response = await fetch(`${this.apiBaseUrl}/api/games`);
            if (response.ok) {
                const games = await response.json();
                this.cache.games = games;
                this.cache.lastUpdate = Date.now();
                return games;
            }
            return [];
        } catch (error) {
            console.error('获取游戏记录失败:', error);
            return this.cache.games || [];
        }
    },

    // 获取登录日志（LocalStorage版本，同步）
    getLoginLogsSync() {
        try {
            const logsData = localStorage.getItem('snake_logs');
            return logsData ? JSON.parse(logsData) : [];
        } catch (error) {
            console.error('获取登录日志失败:', error);
            return [];
        }
    },

    // 获取登录日志（API版本，异步）
    async getLoginLogs() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/login-logs`);
            if (response.ok) {
                const logs = await response.json();
                this.cache.logs = logs;
                this.cache.lastUpdate = Date.now();
                return logs;
            }
            return [];
        } catch (error) {
            console.error('获取登录日志失败:', error);
            return this.cache.logs || [];
        }
    },

    // 导出数据
    exportData(type) {
        // 导出功能保持不变，使用缓存数据
        let data = [];
        let filename = '';

        if (type === 'users') {
            data = this.cache.users || [];
            filename = 'users.json';
        } else if (type === 'games') {
            data = this.cache.games || [];
            filename = 'game-records.json';
        } else if (type === 'loginLogs') {
            data = this.cache.logs || [];
            filename = 'login-logs.json';
        }

        if (data.length === 0) {
            return { success: false, message: '没有数据可导出' };
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        return { success: true };
    },

    // 清空所有数据
    async clearAllData() {
        try {
            // 清空所有缓存
            this.clearCache();

            // 通过API清空数据（需要后端支持）
            alert('请直接在服务器 data 目录下删除 JSON 文件来清空数据');
            return { success: false };
        } catch (error) {
            console.error('清空数据失败:', error);
            return { success: false, message: error.message };
        }
    },

    // 管理员登录验证（客户端验证）
    async adminLogin(password, mfaCode) {
        const config = await this.getAdminConfig();
        if (password !== config.adminPassword) {
            return { success: false, message: '密码错误' };
        }

        // MFA 验证
        if (config.mfaEnabled && config.mfaSecret) {
            if (!mfaCode) {
                return { success: false, message: '请输入验证码' };
            }
            if (typeof verifyMFACode === 'function' && !verifyMFACode(config.mfaSecret, mfaCode)) {
                return { success: false, message: '验证码错误' };
            }
        }

        return { success: true, admin: { username: 'admin' } };
    }
};

// 初始化
DataManager.init();

// 更新管理员配置
async function updateAdminConfig(config) {
    try {
        const response = await fetch(`${DataManager.apiBaseUrl}/api/admin/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        if (response.ok) {
            DataManager.cache.config = config;
            localStorage.setItem('snake_admin_config', JSON.stringify(config));
            // console.log('配置已更新:', config);  // 隐藏敏感信息
            return { success: true };
        }
        return { success: false, message: '更新失败' };
    } catch (error) {
        console.error('更新配置失败:', error);
        return { success: false, message: error.message };
    }
}

// 添加到 DataManager 对象
DataManager.updateAdminConfig = updateAdminConfig;

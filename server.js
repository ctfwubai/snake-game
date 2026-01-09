// 简单的 API 服务器 - 使用文件存储数据
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const crypto = require('crypto');

// TOTP 实现 - 与 Python 完全一致
const TOTP = {
    // Base32 字符集
    BASE32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',

    // Base32 解码
    base32Decode(encoded) {
        encoded = encoded.toUpperCase().replace(/\s+/g, '');
        const padding = encoded.length % 8;
        if (padding !== 0) {
            encoded += '='.repeat(8 - padding);
        }

        let bits = 0;
        let value = 0;
        const output = [];

        for (let i = 0; i < encoded.length; i++) {
            const char = encoded[i];
            if (char === '=') break;

            const val = this.BASE32.indexOf(char);
            if (val === -1) continue;

            value = (value << 5) | val;
            bits += 5;

            if (bits >= 8) {
                output.push((value >> (bits - 8)) & 0xFF);
                bits -= 8;
            }
        }

        return Buffer.from(output);
    },

    // 生成 TOTP 验证码
    generate(secret, timestamp = Date.now()) {
        const keyBytes = this.base32Decode(secret);
        const counter = Math.floor(timestamp / 1000 / 30);

        // 调试日志（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
            console.log('=== Node.js TOTP 生成调试 ===');
            console.log('密钥:', secret);
            console.log('密钥字节:', keyBytes.toString('hex'));
            console.log('密钥长度:', keyBytes.length);
            console.log('计数器:', counter);
        }

        // 构建8字节大端序
        let counterBytes;
        try {
            // 优先使用 writeBigUInt64BE
            counterBytes = Buffer.alloc(8);
            counterBytes.writeBigUInt64BE(BigInt(counter));
        } catch(e) {
            // 回退到手动构建
            counterBytes = Buffer.alloc(8);
            counterBytes[0] = (counter >>> 56) & 0xff;
            counterBytes[1] = (counter >>> 48) & 0xff;
            counterBytes[2] = (counter >>> 40) & 0xff;
            counterBytes[3] = (counter >>> 32) & 0xff;
            counterBytes[4] = (counter >>> 24) & 0xff;
            counterBytes[5] = (counter >>> 16) & 0xff;
            counterBytes[6] = (counter >>> 8) & 0xff;
            counterBytes[7] = counter & 0xff;
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('计数器字节:', counterBytes.toString('hex'));
        }

        const hmac = crypto.createHmac('sha1', keyBytes).update(counterBytes).digest();

        if (process.env.NODE_ENV === 'development') {
            console.log('HMAC-SHA1:', hmac.toString('hex'));
        }

        const offset = hmac[19] & 0x0f;
        if (process.env.NODE_ENV === 'development') {
            console.log('Offset:', offset);
        }

        const codeBytes = hmac.slice(offset, offset + 4);
        if (process.env.NODE_ENV === 'development') {
            console.log('代码字节:', codeBytes.toString('hex'));
        }

        const code = codeBytes.readUInt32BE(0) & 0x7fffffff;
        if (process.env.NODE_ENV === 'development') {
            console.log('截取后:', code);
        }

        const otp = code % 1000000;
        if (process.env.NODE_ENV === 'development') {
            console.log('最终OTP:', String(otp).padStart(6, '0'));
            console.log('========================\n');
        }

        return String(otp).padStart(6, '0');
    },

    // 验证 TOTP 验证码
    verify(secret, token, window = 3) {
        const keyBytes = this.base32Decode(secret);
        const currentCounter = Math.floor(Date.now() / 1000 / 30);

        for (let i = -window; i <= window; i++) {
            const counter = currentCounter + i;

            // 构建8字节大端序
            let counterBytes;
            try {
                // 优先使用 writeBigUInt64BE
                counterBytes = Buffer.alloc(8);
                counterBytes.writeBigUInt64BE(BigInt(counter));
            } catch(e) {
                // 回退到手动构建
                counterBytes = Buffer.alloc(8);
                counterBytes[0] = (counter >>> 56) & 0xff;
                counterBytes[1] = (counter >>> 48) & 0xff;
                counterBytes[2] = (counter >>> 40) & 0xff;
                counterBytes[3] = (counter >>> 32) & 0xff;
                counterBytes[4] = (counter >>> 24) & 0xff;
                counterBytes[5] = (counter >>> 16) & 0xff;
                counterBytes[6] = (counter >>> 8) & 0xff;
                counterBytes[7] = counter & 0xff;
            }

            const hmac = crypto.createHmac('sha1', keyBytes).update(counterBytes).digest();
            const offset = hmac[19] & 0x0f;
            const codeBytes = hmac.slice(offset, offset + 4);
            const code = codeBytes.readUInt32BE(0) & 0x7fffffff;
            const otp = code % 1000000;

            const generatedCode = String(otp).padStart(6, '0');
            if (generatedCode === token) {
                return true;
            }
        }

        return false;
    }
};

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const LOGS_FILE = path.join(DATA_DIR, 'login-logs.json');

// 确保数据目录和文件存在
function initDataFiles() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, '[]');
    }
    if (!fs.existsSync(GAMES_FILE)) {
        fs.writeFileSync(GAMES_FILE, '[]');
    }
    if (!fs.existsSync(LOGS_FILE)) {
        fs.writeFileSync(LOGS_FILE, '[]');
    }
}

// 读取数据文件
function readFile(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`读取文件失败 ${filename}:`, error);
        return [];
    }
}

// 写入数据文件
function writeFile(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`写入文件失败 ${filename}:`, error);
        return false;
    }
}

// 添加文件锁,防止并发写入
const fileLocks = {};
function writeFileSafe(filename, data) {
    return new Promise((resolve, reject) => {
        if (fileLocks[filename]) {
            console.warn(`文件 ${filename} 正在被写入,等待...`);
            setTimeout(() => writeFileSafe(filename, data).then(resolve).catch(reject), 100);
            return;
        }

        fileLocks[filename] = true;
        try {
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            delete fileLocks[filename];
            resolve(true);
        } catch (error) {
            delete fileLocks[filename];
            console.error(`写入文件失败 ${filename}:`, error);
            reject(error);
        }
    });
}

// 获取客户端真实IP
function getClientIP(req) {
    // 优先检查代理头部 (Nginx 反向代理时使用)
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];

    // X-Forwarded-For 是 Nginx 代理时设置的,优先使用
    if (forwarded) {
        // X-Forwarded-For 可能包含多个IP，取第一个
        const clientIP = forwarded.split(',')[0].trim();
        // 去除 IPv6 映射前缀 (::ffff:)
        if (clientIP.includes('::ffff:')) {
            return clientIP.split(':').pop();
        }
        return clientIP;
    }

    // 其次检查 X-Real-IP
    if (realIP) {
        if (realIP.includes('::ffff:')) {
            return realIP.split(':').pop();
        }
        return realIP;
    }

    // 直连情况
    const socket = req.socket;
    const remoteAddress = socket.remoteAddress || '127.0.0.1';
    if (remoteAddress.includes('::ffff:')) {
        return remoteAddress.split(':').pop();
    }
    return remoteAddress;
}

// CORS 处理
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// 创建服务器
const server = http.createServer((req, res) => {
    setCorsHeaders(res);

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    console.log(`${req.method} ${pathname}`);

    // 路由处理
    if (pathname === '/api/users') {
        if (req.method === 'GET') {
            const users = readFile(USERS_FILE);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(users));
        }
    } else if (pathname === '/api/register') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { name, phoneTail, inviteCode, deviceId } = JSON.parse(body);

                    // 验证输入
                    if (!name || name.length < 2) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '姓名至少2个字符' }));
                        return;
                    }

                    if (!phoneTail || phoneTail.length !== 4 || !/^\d{4}$/.test(phoneTail)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '请输入正确的4位手机尾号' }));
                        return;
                    }

                    const users = readFile(USERS_FILE);
                    const config = readFile(path.join(DATA_DIR, 'admin-config.json'));

                    // 验证邀请码
                    if (!config.inviteCodes || !config.inviteCodes.includes(inviteCode)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '无效的邀请码' }));
                        return;
                    }

                    // 检查用户是否已存在
                    if (users.find(u => u.phoneTail === phoneTail)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '该手机尾号已被注册' }));
                        return;
                    }

                    // 创建新用户
                    const newUser = {
                        id: Date.now().toString(),
                        name: name,
                        phoneSuffix: phoneTail,
                        inviteCode: inviteCode,
                        registerTime: new Date().toISOString(),
                        registerIp: getClientIP(req),
                        deviceId: deviceId || null,
                        highScore: 0,
                        playCount: 0
                    };

                    users.push(newUser);
                    writeFileSafe(USERS_FILE, users);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, user: newUser }));
                } catch (error) {
                    console.error('注册失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '注册失败' }));
                }
            });
        }
    } else if (pathname === '/api/login') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { phoneTail, deviceId } = JSON.parse(body);
                    const users = readFile(USERS_FILE);
                    const user = users.find(u => u.phoneSuffix === phoneTail);

                    if (!user) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '用户不存在' }));
                        return;
                    }

                    // 检查用户是否被注销
                    if (user.disabled === true) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '该账号已被管理员注销' }));
                        return;
                    }

                    // 添加登录日志
                    const logs = readFile(LOGS_FILE);
                    const log = {
                        id: Date.now().toString(),
                        userId: user.id,
                        userName: user.name,
                        timestamp: new Date().toISOString(),
                        ipAddress: getClientIP(req),
                        deviceId: deviceId || null
                    };
                    logs.unshift(log);
                    writeFileSafe(LOGS_FILE, logs).then(success => {
                        if (!success) {
                            console.error('登录日志保存失败');
                        }
                    }).catch(err => {
                        console.error('登录日志保存异常:', err);
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, user: user }));
                } catch (error) {
                    console.error('登录失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '登录失败' }));
                }
            });
        }
    } else if (pathname === '/api/games') {
        if (req.method === 'GET') {
            const records = readFile(GAMES_FILE);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(records));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const record = JSON.parse(body);
                    record.id = Date.now().toString();
                    record.timestamp = new Date().toISOString();

                    const records = readFile(GAMES_FILE);
                    records.unshift(record);
                    writeFileSafe(GAMES_FILE, records).then(success => {
                        if (!success) {
                            console.error('游戏记录保存失败');
                        }
                    }).catch(err => {
                        console.error('游戏记录保存异常:', err);
                    });

                    // 更新用户统计
                    const users = readFile(USERS_FILE);
                    const userIndex = users.findIndex(u => u.id === record.userId);
                    if (userIndex !== -1) {
                        users[userIndex].playCount++;
                        if (record.score > (users[userIndex].highScore || 0)) {
                            users[userIndex].highScore = record.score;
                        }
                        writeFileSafe(USERS_FILE, users);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('保存游戏记录失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '保存失败' }));
                }
            });
        }
    } else if (pathname === '/api/login-logs') {
        if (req.method === 'GET') {
            const logs = readFile(LOGS_FILE);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(logs));
        }
    } else if (pathname === '/api/verify-totp') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { secret, code } = JSON.parse(body);

                    if (process.env.NODE_ENV === 'development') {
                        console.log('TOTP验证请求:', { secret: '***', code: '***' });
                    }

                    // 使用服务器端 TOTP 实现
                    const isValid = TOTP.verify(secret, code);

                    if (process.env.NODE_ENV === 'development') {
                        console.log('TOTP验证结果:', isValid);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: isValid }));
                } catch (error) {
                    console.error('TOTP验证失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '验证失败' }));
                }
            });
        }
    } else if (pathname === '/api/generate-totp') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { secret } = JSON.parse(body);

                    if (process.env.NODE_ENV === 'development') {
                        console.log('TOTP生成请求:', { secret: '***' });
                    }

                    // 使用服务器端 TOTP 实现
                    const currentCode = TOTP.generate(secret);

                    if (process.env.NODE_ENV === 'development') {
                        console.log('服务器生成的验证码:', currentCode);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, code: currentCode }));
                } catch (error) {
                    console.error('TOTP生成失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '生成失败' }));
                }
            });
        }
    } else if (pathname === '/api/admin/config') {
        if (req.method === 'GET') {
            const config = readFile(path.join(DATA_DIR, 'admin-config.json'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(config));
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const config = JSON.parse(body);
                    writeFileSafe(path.join(DATA_DIR, 'admin-config.json'), config);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('保存配置失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '保存失败' }));
                }
            });
        }
    } else if (pathname === '/api/delete-user') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { userId } = JSON.parse(body);
                    let users = readFile(USERS_FILE);
                    users = users.filter(u => u.id !== userId);
                    writeFileSafe(USERS_FILE, users);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('删除用户失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '删除失败' }));
                }
            });
        }
    } else if (pathname === '/api/disable-user') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { userId } = JSON.parse(body);
                    let users = readFile(USERS_FILE);
                    const userIndex = users.findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        users[userIndex].disabled = true;
                        writeFileSafe(USERS_FILE, users);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('注销用户失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '操作失败' }));
                }
            });
        }
    } else if (pathname === '/api/reset-data') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { resetGames, resetLogs } = JSON.parse(body);
                    let resetCount = 0;

                    if (resetGames) {
                        writeFile(GAMES_FILE, []);
                        resetCount++;
                        console.log('游戏记录已重置');
                    }

                    if (resetLogs) {
                        writeFile(LOGS_FILE, []);
                        resetCount++;
                        console.log('登录记录已重置');
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, resetCount }));
                } catch (error) {
                    console.error('重置数据失败:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '重置失败' }));
                }
            });
        }
    } else {
        // 静态文件服务
        const filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentType = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml'
            }[ext] || 'application/octet-stream';

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not Found');
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(data);
                }
            });
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }
});

// 初始化数据文件
initDataFiles();

// 初始化默认管理员配置
const CONFIG_FILE = path.join(DATA_DIR, 'admin-config.json');
if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = {
        scanLink: 'http://localhost:8888',
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
    writeFile(CONFIG_FILE, defaultConfig);
}

// 启动服务器
// 注意：生产环境建议使用 Nginx 反向代理，监听 80/443 端口
// Node.js 服务器在内部 8888 端口运行，由 Nginx 代理访问
const PORT = process.env.PORT || 8888;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    console.log(`数据目录: ${DATA_DIR}`);
    console.log(`局域网访问: http://[本机IP]:${PORT}`);
    console.log('========================================');
    console.log('按 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

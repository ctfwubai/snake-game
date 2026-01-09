// TOTP - 使用标准RFC 6238实现
// 基于otplib-core的精简版本，确保与标准TOTP应用兼容

(function(window) {
    'use strict';

    const TOTP = (function() {
        // Base32 字符集
        const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

        // Base32 解码
        function base32Decode(str) {
            str = str.toUpperCase().replace(/\s+/g, '');
            // 添加填充
            const padding = str.length % 8;
            if (padding !== 0) {
                str += '='.repeat(8 - padding);
            }

            let bits = 0;
            let value = 0;
            const output = [];

            for (let i = 0; i < str.length; i++) {
                const char = str.charAt(i);
                if (char === '=') break;

                const val = BASE32.indexOf(char);
                if (val === -1) continue;

                value = (value << 5) | val;
                bits += 5;

                if (bits >= 8) {
                    output.push((value >> (bits - 8)) & 0xFF);
                    bits -= 8;
                }
            }

            return new Uint8Array(output);
        }

        // HMAC-SHA1 实现 (使用Web Crypto API)
        async function hmacSha1(key, message) {
            const crypto = window.crypto || window.msCrypto;
            if (!crypto || !crypto.subtle) {
                throw new Error('Web Crypto API不可用');
            }

            // 导入密钥
            const keyData = await crypto.subtle.importKey(
                'raw',
                key,
                { name: 'HMAC', hash: 'SHA-1' },
                false,
                ['sign']
            );

            // 签名
            const signature = await crypto.subtle.sign(
                'HMAC',
                keyData,
                message
            );

            return new Uint8Array(signature);
        }

        // SHA-1 实现 (用于Web Crypto API不支持SHA-1的情况)
        function sha1(message) {
            const ml = message.length * 8;
            let l = (ml + 65) >> 9 << 6;
            const words = new Uint32Array((l + 56) >> 2);

            for (let i = 0; i < words.length; i++) words[i] = 0;

            for (let i = 0; i < message.length; i++) {
                words[i >> 2] |= message[i] << (24 - (i & 3) * 8);
            }

            words[message.length >> 2] |= 0x80 << (24 - (message.length & 3) * 8);

            words[words.length - 2] = (ml / 0x100000000) | 0;
            words[words.length - 1] = ml & 0xffffffff;

            let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
            const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];

            for (let i = 0; i < words.length; i += 16) {
                const W = new Uint32Array(80);

                for (let j = 0; j < 16; j++) W[j] = words[i + j];
                for (let j = 16; j < 80; j++) W[j] = rotl(W[j - 3] ^ W[j - 8] ^ W[j - 14] ^ W[j - 16], 1);

                let a = h0, b = h1, c = h2, d = h3, e = h4;

                for (let j = 0; j < 80; j++) {
                    let f, k;
                    if (j < 20) { f = (b & c) | ((~b) & d); k = K[0]; }
                    else if (j < 40) { f = b ^ c ^ d; k = K[1]; }
                    else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = K[2]; }
                    else { f = b ^ c ^ d; k = K[3]; }

                    const temp = (rotl(a, 5) + f + e + k + W[j]) | 0;
                    e = d; d = c; c = rotl(b, 30); b = a; a = temp;
                }

                h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
            }

            return new Uint8Array([
                (h0 >>> 24) & 0xff, (h0 >>> 16) & 0xff, (h0 >>> 8) & 0xff, h0 & 0xff,
                (h1 >>> 24) & 0xff, (h1 >>> 16) & 0xff, (h1 >>> 8) & 0xff, h1 & 0xff,
                (h2 >>> 24) & 0xff, (h2 >>> 16) & 0xff, (h2 >>> 8) & 0xff, h2 & 0xff,
                (h3 >>> 24) & 0xff, (h3 >>> 16) & 0xff, (h3 >>> 8) & 0xff, h3 & 0xff,
                (h4 >>> 24) & 0xff, (h4 >>> 16) & 0xff, (h4 >>> 8) & 0xff, h4 & 0xff
            ]);
        }

        // HMAC-SHA1 纯JS实现 - 修复版
        function hmacSha1Fallback(key, message) {
            const BLOCK_SIZE = 64;
            const HASH_SIZE = 20;

            // 如果密钥长度超过块大小，先哈希
            let hashKey;
            if (key.length > BLOCK_SIZE) {
                hashKey = sha1(key);
            } else {
                hashKey = key;
            }

            // 填充密钥到块大小
            const paddedKey = new Uint8Array(BLOCK_SIZE);
            for (let i = 0; i < BLOCK_SIZE; i++) {
                paddedKey[i] = i < hashKey.length ? hashKey[i] : 0;
            }

            // 创建 ipad 和 opad
            const ipad = new Uint8Array(BLOCK_SIZE);
            const opad = new Uint8Array(BLOCK_SIZE);

            for (let i = 0; i < BLOCK_SIZE; i++) {
                ipad[i] = paddedKey[i] ^ 0x36;
                opad[i] = paddedKey[i] ^ 0x5c;
            }

            // 内层哈希: H(K XOR ipad || message)
            const inner = new Uint8Array(BLOCK_SIZE + message.length);
            inner.set(ipad, 0);
            inner.set(message, BLOCK_SIZE);
            const innerHash = sha1(inner);

            // 外层哈希: H(K XOR opad || inner_hash)
            const outer = new Uint8Array(BLOCK_SIZE + HASH_SIZE);
            outer.set(opad, 0);
            outer.set(innerHash, BLOCK_SIZE);

            return sha1(outer);
        }

        function rotl(num, cnt) {
            return ((num << cnt) | (num >>> (32 - cnt))) | 0;
        }

        function intToBytes(num, len) {
            // 大端序：高位在前
            const bytes = new Uint8Array(len);
            for (let i = len - 1; i >= 0; i--) {
                bytes[i] = num & 0xff;
                num >>>= 8;
            }
            return bytes;
        }

        function bytesToInt(bytes, offset) {
            // 大端序转换
            let result = 0;
            for (let i = 0; i < 4; i++) {
                result = (result << 8) | bytes[offset + i];
            }
            return result;
        }

        // 从HMAC结果提取TOTP码
        function extractOTP(hmac, digits) {
            const offset = hmac[19] & 0x0f;
            // 使用大端序读取4字节
            const binary = bytesToInt(hmac, offset) & 0x7fffffff;

            const code = binary % Math.pow(10, digits);
            return code.toString().padStart(digits, '0');
        }

        // 计算当前时间窗口
        function getCurrentCounter(timeStep) {
            timeStep = timeStep || 30;
            return Math.floor(Date.now() / 1000 / timeStep);
        }

        // 生成TOTP码
        async function generate(secret, timeStep, digits) {
            timeStep = timeStep || 30;
            digits = digits || 6;

            try {
                const key = base32Decode(secret);
                const counter = getCurrentCounter(timeStep);
                const counterBytes = intToBytes(counter, 8);

                let hmac;
                try {
                    hmac = await hmacSha1(key, counterBytes);
                } catch (e) {
                    console.log('Web Crypto API失败，使用fallback实现');
                    hmac = hmacSha1Fallback(key, counterBytes);
                }

                return extractOTP(hmac, digits);
            } catch (e) {
                console.error('TOTP生成错误:', e);
                return null;
            }
        }

        // 验证TOTP码
        async function verify(secret, token, timeStep, digits, window) {
            timeStep = timeStep || 30;
            digits = digits || 6;
            window = window || 3; // 扩大时间窗口到±3

            if (!secret || !token) return false;

            // console.log('=== TOTP验证开始 ===');  // 减少日志输出
            // console.log('验证密钥:', secret);  // 隐藏敏感信息
            // console.log('验证码:', token);  // 隐藏敏感信息
            // console.log('时间步长:', timeStep, '秒');  // 减少日志输出
            // console.log('验证码位数:', digits);  // 减少日志输出
            // console.log('时间窗口:', window);  // 减少日志输出

            const key = base32Decode(secret);
            console.log('密钥长度:', key.length, '字节');
            console.log('密钥Hex:', Array.from(key).map(b => b.toString(16).padStart(2, '0')).join(''));

            const currentTime = Date.now();
            const currentCounter = Math.floor(currentTime / 1000 / timeStep);
            console.log('当前时间戳:', currentTime);
            console.log('当前时间计数器:', currentCounter);

            for (let i = -window; i <= window; i++) {
                const counter = currentCounter + i;
                const counterBytes = intToBytes(counter, 8);
                const windowTime = counter * timeStep * 1000;
                console.log(`\n窗口${i}: counter=${counter}, 时间=${new Date(windowTime).toLocaleTimeString()}`);
                console.log(`计数器Hex: ${Array.from(counterBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`);

                let hmac;
                try {
                    hmac = await hmacSha1(key, counterBytes);
                } catch (e) {
                    console.log('使用fallback HMAC实现');
                    hmac = hmacSha1Fallback(key, counterBytes);
                }

                // console.log(`HMAC结果: ${Array.from(hmac).map(b => b.toString(16).padStart(2, '0')).join('')}`);  // 隐藏调试信息

                const offset = hmac[19] & 0x0f;
                // console.log(`Offset: ${offset}`);  // 隐藏调试信息

                const generatedCode = extractOTP(hmac, digits);
                // console.log(`生成验证码: ${generatedCode}, 匹配=${generatedCode === token}`);  // 隐藏敏感信息

                if (generatedCode === token) {
                    // console.log('\n=== 验证成功! ===');  // 隐藏调试信息
                    return true;
                }
            }

            // console.log('\n=== 验证失败: 在所有时间窗口内未找到匹配的验证码 ===');  // 隐藏调试信息
            return false;
        }

        function generateSecret(length) {
            length = length || 16;
            const bytes = new Uint8Array(length);

            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(bytes);
            } else {
                for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
            }

            let secret = '';
            for (let i = 0; i < length; i++) secret += BASE32[bytes[i] % BASE32.length];
            return secret;
        }

        function formatSecret(secret) {
            return secret.replace(/(.{4})/g, '$1 ').trim();
        }

        return {
            generateSecret: generateSecret,
            generate: generate,
            verify: verify,
            formatSecret: formatSecret
        };
    })();

    window.TOTP = TOTP;
})(typeof window !== 'undefined' ? window : global);

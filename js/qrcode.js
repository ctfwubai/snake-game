// 简单的二维码生成器（使用在线API）
const QRCode = {
    toCanvas(canvas, text, options = {}, callback) {
        const width = options.width || 200;

        // 尝试使用公开的二维码API生成图片
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${width}&data=${encodeURIComponent(text)}`;
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        // 设置超时时间
        const timeout = setTimeout(() => {
            if (img.src && !img.complete) {
                img.onerror();
            }
        }, 5000);

        img.onload = function() {
            clearTimeout(timeout);
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = width;
            ctx.clearRect(0, 0, width, width);
            ctx.drawImage(img, 0, 0, width, width);
            if (callback) callback(null);
        };

        img.onerror = function() {
            clearTimeout(timeout);
            // 如果API失败，绘制一个带有登录链接的占位符
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = width;

            // 绘制渐变背景
            const gradient = ctx.createLinearGradient(0, 0, width, width);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, width);

            // 绘制白色中心区域
            ctx.fillStyle = '#ffffff';
            const padding = 15;
            ctx.fillRect(padding, padding, width - padding * 2, width - padding * 2);

            // 绘制图标/标识
            ctx.fillStyle = '#667eea';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('📱', width / 2, width / 2 - 35);

            // 绘制标题文字
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('扫码登录', width / 2, width / 2 - 5);

            // 绘制链接文字
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#666666';
            const maxCharsPerLine = 28;
            let displayText = text;
            if (displayText.length > maxCharsPerLine) {
                displayText = displayText.substring(0, maxCharsPerLine - 3) + '...';
            }
            ctx.fillText(displayText, width / 2, width / 2 + 20);

            // 绘制底部提示
            ctx.fillStyle = '#999999';
            ctx.font = '11px sans-serif';
            ctx.fillText('或直接访问链接登录', width / 2, width / 2 + 45);

            if (callback) callback(new Error('Failed to load QR code'));
        };

        img.src = qrUrl;
    }
};

// 也添加一个简单的toDataURL方法
QRCode.toDataURL = function(text, options = {}, callback) {
    const canvas = document.createElement('canvas');
    this.toCanvas(canvas, text, options, function(error) {
        if (error) {
            if (callback) callback(error, null);
        } else {
            if (callback) callback(null, canvas.toDataURL());
        }
    });
};

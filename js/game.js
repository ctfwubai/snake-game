// 贪吃蛇游戏类
class SnakeGame {
    constructor(canvas, onGameOver, onScoreUpdate, onLevelUp) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;
        this.onLevelUp = onLevelUp;

        // 游戏配置
        this.gridSize = 20;
        this.canvas.width = 400;
        this.canvas.height = 400;

        // 游戏模式：'casual' (休闲) 或 'challenge' (闯关)
        this.gameMode = 'casual';
        this.currentLevel = 1;

        // 外观主题
        this.theme = null;

        // 游戏状态
        this.snake = [];
        this.food = {};
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.gameLoop = null;
        this.gameSpeed = 250;
        this.baseSpeed = 250;
        this.isPlaying = false;
        this.startTime = null;
        this.levelTargets = { casual: 50, challenge: 50 }; // 每关目标分数

        // 事件处理器绑定（用于正确移除监听器）
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    }

    // 设置游戏模式
    setGameMode(mode) {
        this.gameMode = mode;
        this.currentLevel = 1;
    }

    // 设置主题
    setTheme(theme) {
        this.theme = theme;
    }

    // 设置基础速度（休闲模式）
    setBaseSpeed(speed) {
        this.baseSpeed = speed;
        this.gameSpeed = speed;
    }

    // 初始化游戏
    init() {
        this.snake = [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.gameSpeed = this.baseSpeed;
        this.isPlaying = false;
        this.startTime = null;
        this.generateFood();
        this.onScoreUpdate(this.score);
        this.draw();
    }

    // 生成食物
    generateFood() {
        const maxX = this.canvas.width / this.gridSize;
        const maxY = this.canvas.height / this.gridSize;

        do {
            this.food = {
                x: Math.floor(Math.random() * maxX),
                y: Math.floor(Math.random() * maxY)
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
    }

    // 开始游戏
    start() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.startTime = Date.now();

        // 绑定键盘事件
        document.addEventListener('keydown', this.boundHandleKeyDown);

        // 绑定触摸事件（移动端）
        this.setupTouchControls();

        // 开始游戏循环
        this.gameLoop = setInterval(() => this.update(), this.gameSpeed);
    }

    // 暂停游戏
    pause() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        clearInterval(this.gameLoop);
        document.removeEventListener('keydown', this.boundHandleKeyDown);
    }

    // 游戏更新
    update() {
        this.direction = this.nextDirection;

        // 计算新的头部位置
        const head = { ...this.snake[0] };

        switch (this.direction) {
            case 'up':
                head.y--;
                break;
            case 'down':
                head.y++;
                break;
            case 'left':
                head.x--;
                break;
            case 'right':
                head.x++;
                break;
        }

        // 检查碰撞
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }

        // 移动蛇
        this.snake.unshift(head);

        // 检查是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.onScoreUpdate(this.score);
            this.generateFood();

            // 闯关模式：检查是否过关
            if (this.gameMode === 'challenge') {
                const targetScore = this.currentLevel * this.levelTargets.challenge;
                if (this.score >= targetScore) {
                    this.levelUp();
                    return;
                }
            }
        } else {
            this.snake.pop();
        }

        this.draw();
    }

    // 升级（闯关模式）
    levelUp() {
        this.currentLevel++;

        // 每10关放烟花
        if (this.currentLevel % 10 === 0) {
            this.showFireworks();
        }

        // 更新速度
        const config = DataManager.getAdminConfig();
        const speedIncrease = config.challengeSpeedIncrease || 5;
        this.gameSpeed = Math.max(50, this.baseSpeed - (this.currentLevel - 1) * speedIncrease);

        // 通知升级
        if (this.onLevelUp) {
            this.onLevelUp(this.currentLevel);
        }

        // 暂停游戏等待玩家继续
        this.pause();
        clearInterval(this.gameLoop);

        // 3秒后自动继续
        setTimeout(() => {
            if (this.isPlaying) {
                this.gameLoop = setInterval(() => this.update(), this.gameSpeed);
            }
        }, 3000);
    }

    // 烟花特效
    showFireworks() {
        const ctx = this.ctx;
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const particles = [];

        // 创建粒子
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 60,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        // 动画
        let frame = 0;
        const animate = () => {
            if (frame > 60) return;

            // 保存当前画面
            ctx.save();
            ctx.globalAlpha = 0.3;

            particles.forEach(p => {
                if (p.life > 0) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.2;
                    p.life--;

                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life / 60;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.restore();
            frame++;
            requestAnimationFrame(animate);
        };

        animate();
    }

    // 检查碰撞
    checkCollision(head) {
        // 撞墙检测
        const maxX = this.canvas.width / this.gridSize;
        const maxY = this.canvas.height / this.gridSize;

        if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
            return true;
        }

        // 撞自身检测
        return this.snake.some(segment => segment.x === head.x && segment.y === head.y);
    }

    // 绘制游戏
    draw() {
        // 使用主题颜色，如果没有主题则使用默认
        const theme = this.theme || SnakeThemes.cute;

        // 清空画布
        this.ctx.fillStyle = theme.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格
        this.ctx.strokeStyle = theme.gridColor;
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.canvas.width; i += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i <= this.canvas.height; i += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }

        // 绘制食物
        if (theme.foodEmoji) {
            // 使用Emoji作为食物
            this.ctx.font = `${this.gridSize - 2}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                theme.foodEmoji,
                this.food.x * this.gridSize + this.gridSize / 2,
                this.food.y * this.gridSize + this.gridSize / 2
            );
        } else {
            // 使用圆形
            this.ctx.fillStyle = theme.foodColor;
            this.ctx.beginPath();
            this.ctx.arc(
                this.food.x * this.gridSize + this.gridSize / 2,
                this.food.y * this.gridSize + this.gridSize / 2,
                this.gridSize / 2 - 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }

        // 绘制蛇
        this.snake.forEach((segment, index) => {
            if (index === 0) {
                // 蛇头
                if (theme.snakeHeadEmoji) {
                    // 使用Emoji
                    this.ctx.font = `${this.gridSize - 2}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(
                        theme.snakeHeadEmoji,
                        segment.x * this.gridSize + this.gridSize / 2,
                        segment.y * this.gridSize + this.gridSize / 2
                    );
                } else {
                    // 使用颜色
                    this.ctx.fillStyle = theme.snakeHeadColor;
                    this.ctx.fillRect(
                        segment.x * this.gridSize + 1,
                        segment.y * this.gridSize + 1,
                        this.gridSize - 2,
                        this.gridSize - 2
                    );
                }
            } else {
                // 蛇身 - 根据主题样式绘制
                const bodyStyle = theme.snakeBodyStyle || 'gradient';

                if (bodyStyle === 'gradient') {
                    // 渐变色蛇身
                    const progress = index / this.snake.length; // 0到1之间的进度
                    const r = this.interpolateColor(
                        theme.snakeBodyStartColor,
                        theme.snakeBodyEndColor,
                        progress
                    );
                    this.ctx.fillStyle = r;

                    this.ctx.fillRect(
                        segment.x * this.gridSize + 1,
                        segment.y * this.gridSize + 1,
                        this.gridSize - 2,
                        this.gridSize - 2
                    );
                } else if (bodyStyle === 'emoji' && theme.snakeBodyEmoji) {
                    // Emoji蛇身
                    this.ctx.font = `${this.gridSize - 4}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(
                        theme.snakeBodyEmoji,
                        segment.x * this.gridSize + this.gridSize / 2,
                        segment.y * this.gridSize + this.gridSize / 2
                    );
                } else {
                    // 纯色蛇身
                    this.ctx.fillStyle = theme.snakeBodyEndColor;
                    this.ctx.fillRect(
                        segment.x * this.gridSize + 1,
                        segment.y * this.gridSize + 1,
                        this.gridSize - 2,
                        this.gridSize - 2
                    );
                }
            }

            // 蛇头眼睛（如果不是Emoji）
            if (index === 0 && !theme.snakeHeadEmoji) {
                this.ctx.fillStyle = theme.eyeColor;
                const eyeOffset = this.gridSize / 4;
                const eyeSize = this.gridSize / 6;

                let eye1X, eye1Y, eye2X, eye2Y;

                switch (this.direction) {
                    case 'up':
                        eye1X = segment.x * this.gridSize + eyeOffset;
                        eye1Y = segment.y * this.gridSize + eyeOffset;
                        eye2X = segment.x * this.gridSize + this.gridSize - eyeOffset - eyeSize;
                        eye2Y = segment.y * this.gridSize + eyeOffset;
                        break;
                    case 'down':
                        eye1X = segment.x * this.gridSize + eyeOffset;
                        eye1Y = segment.y * this.gridSize + this.gridSize - eyeOffset - eyeSize;
                        eye2X = segment.x * this.gridSize + this.gridSize - eyeOffset - eyeSize;
                        eye2Y = segment.y * this.gridSize + this.gridSize - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        eye1X = segment.x * this.gridSize + eyeOffset;
                        eye1Y = segment.y * this.gridSize + eyeOffset;
                        eye2X = segment.x * this.gridSize + eyeOffset;
                        eye2Y = segment.y * this.gridSize + this.gridSize - eyeOffset - eyeSize;
                        break;
                    case 'right':
                        eye1X = segment.x * this.gridSize + this.gridSize - eyeOffset - eyeSize;
                        eye1Y = segment.y * this.gridSize + eyeOffset;
                        eye2X = segment.x * this.gridSize + this.gridSize - eyeOffset - eyeSize;
                        eye2Y = segment.y * this.gridSize + this.gridSize - eyeOffset - eyeSize;
                        break;
                }

                this.ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
                this.ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);

                // 瞳孔
                this.ctx.fillStyle = theme.eyePupilColor;
                const pupilSize = eyeSize / 2;
                this.ctx.fillRect(eye1X + pupilSize/2, eye1Y + pupilSize/2, pupilSize, pupilSize);
                this.ctx.fillRect(eye2X + pupilSize/2, eye2Y + pupilSize/2, pupilSize, pupilSize);
            }
        });

        // 显示关卡（闯关模式）
        if (this.gameMode === 'challenge') {
            this.ctx.fillStyle = theme.foodColor;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`第 ${this.currentLevel} 关`, 10, 25);
        }
    }

    // 处理键盘输入
    handleKeyDown(e) {
        const key = e.key;

        if ((key === 'ArrowUp' || key === 'w' || key === 'W') && this.direction !== 'down') {
            this.nextDirection = 'up';
        } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && this.direction !== 'up') {
            this.nextDirection = 'down';
        } else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && this.direction !== 'right') {
            this.nextDirection = 'left';
        } else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && this.direction !== 'left') {
            this.nextDirection = 'right';
        }
    }

    // 设置触摸控制
    setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        const touchThreshold = 15; // 降低最小滑动距离，提高灵敏度
        let lastTouchTime = 0;
        const touchDebounce = 50; // 触摸防抖时间（毫秒）

        this.touchStartHandler = (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        };

        this.touchMoveHandler = (e) => {
            e.preventDefault(); // 防止页面滚动
        };

        this.touchEndHandler = (e) => {
            const currentTime = Date.now();
            if (currentTime - lastTouchTime < touchDebounce) {
                return; // 防抖，避免过于灵敏
            }
            lastTouchTime = currentTime;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            // 判断滑动方向
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // 水平滑动
                if (Math.abs(deltaX) > touchThreshold) {
                    if (deltaX > 0 && this.direction !== 'left') {
                        this.nextDirection = 'right';
                    } else if (deltaX < 0 && this.direction !== 'right') {
                        this.nextDirection = 'left';
                    }
                }
            } else {
                // 垂直滑动
                if (Math.abs(deltaY) > touchThreshold) {
                    if (deltaY > 0 && this.direction !== 'up') {
                        this.nextDirection = 'down';
                    } else if (deltaY < 0 && this.direction !== 'down') {
                        this.nextDirection = 'up';
                    }
                }
            }
        };

        this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: true });
        this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
        this.canvas.addEventListener('touchend', this.touchEndHandler);
    }

    // 移除触摸控制
    removeTouchControls() {
        if (this.touchStartHandler) {
            this.canvas.removeEventListener('touchstart', this.touchStartHandler);
            this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
            this.canvas.removeEventListener('touchend', this.touchEndHandler);
            this.touchStartHandler = null;
        }
    }

    // 颜色插值函数（用于渐变）
    interpolateColor(color1, color2, factor) {
        const hex2rgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };

        const rgb1 = hex2rgb(color1);
        const rgb2 = hex2rgb(color2);

        if (!rgb1 || !rgb2) return color1;

        const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
        const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
        const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));

        return `rgb(${r}, ${g}, ${b})`;
    }

    // 游戏结束
    gameOver() {
        this.isPlaying = false;
        clearInterval(this.gameLoop);
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        this.removeTouchControls();

        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        this.onGameOver(this.score, duration);
    }

    // 重置游戏
    reset() {
        this.pause();
        this.init();
    }
}

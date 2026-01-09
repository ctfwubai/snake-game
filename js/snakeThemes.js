// 贪吃蛇外观主题系统
const SnakeThemes = {
    // 1. 可爱卡哇伊风格
    cute: {
        name: '可爱卡哇伊',
        backgroundColor: '#FFF0F5',
        gridColor: '#FFB6C1',
        snakeHeadColor: '#FF69B4',
        snakeBodyStartColor: '#FFB6C1', // 蛇身起始颜色
        snakeBodyEndColor: '#FF1493',   // 蛇身结束颜色
        snakeBodyStyle: 'gradient',      // 蛇身样式: gradient, solid, emoji
        snakeBodyEmoji: '🌸',         // 蛇身Emoji（如果使用emoji风格）
        foodColor: '#FFD700',
        foodEmoji: '🌸',
        eyeColor: '#FFFFFF',
        eyePupilColor: '#FF1493',
        snakeHeadEmoji: '😊',
        description: '粉嫩可爱的日系风格'
    },

    // 2. 动漫风格
    anime: {
        name: '动漫风',
        backgroundColor: '#1a1a2e',
        gridColor: '#16213e',
        snakeHeadColor: '#e94560',
        snakeBodyStartColor: '#00ffff',
        snakeBodyEndColor: '#e94560',
        snakeBodyStyle: 'gradient',
        snakeBodyEmoji: '⭐',
        foodColor: '#00fff5',
        foodEmoji: '⭐',
        eyeColor: '#FFFFFF',
        eyePupilColor: '#e94560',
        snakeHeadEmoji: '😎',
        description: '赛博朋克霓虹风格'
    },

    // 3. 恐怖风格
    horror: {
        name: '恐怖风格',
        backgroundColor: '#0d0d0d',
        gridColor: '#1a1a1a',
        snakeHeadColor: '#8B0000',
        snakeBodyStartColor: '#4a0a0a',
        snakeBodyEndColor: '#2a0a0a',
        snakeBodyStyle: 'gradient',
        snakeBodyEmoji: '💀',
        foodColor: '#DC143C',
        foodEmoji: '💀',
        eyeColor: '#FF0000',
        eyePupilColor: '#000000',
        snakeHeadEmoji: '👻',
        description: '暗黑恐怖风格'
    },

    // 4. 夸张风格
    cartoon: {
        name: '夸张风格',
        backgroundColor: '#FFA500',
        gridColor: '#FF8C00',
        snakeHeadColor: '#FF4500',
        snakeBodyStartColor: '#FFFF00',
        snakeBodyEndColor: '#FF6600',
        snakeBodyStyle: 'gradient',
        snakeBodyEmoji: '😜',
        foodColor: '#00FF00',
        foodEmoji: '🍔',
        eyeColor: '#FFFFFF',
        eyePupilColor: '#000000',
        snakeHeadEmoji: '😜',
        description: '夸张卡通风格'
    },

    // 5. 古风
    ancient: {
        name: '古风',
        backgroundColor: '#F5DEB3',
        gridColor: '#DEB887',
        snakeHeadColor: '#8B4513',
        snakeBodyStartColor: '#CD853F',
        snakeBodyEndColor: '#A0522D',
        snakeBodyStyle: 'gradient',
        snakeBodyEmoji: '🎋',
        foodColor: '#FF0000',
        foodEmoji: '🏮',
        eyeColor: '#FFFFFF',
        eyePupilColor: '#000000',
        snakeHeadEmoji: '🐉',
        description: '中国古典风格'
    },

    // 6. 赛博朋克
    cyberpunk: {
        name: '赛博朋克',
        backgroundColor: '#0a0a0a',
        gridColor: '#1a1a2e',
        snakeHeadColor: '#00ff00',
        snakeBodyStartColor: '#ff00ff',
        snakeBodyEndColor: '#00ffff',
        snakeBodyStyle: 'gradient',
        snakeBodyEmoji: '💊',
        foodColor: '#ff00ff',
        foodEmoji: '💊',
        eyeColor: '#00ffff',
        eyePupilColor: '#000000',
        snakeHeadEmoji: '🤖',
        description: '未来科技风格'
    },

    // 7. 海洋风格
    ocean: {
        name: '海洋风格',
        backgroundColor: '#E0F7FA',
        gridColor: '#B2EBF2',
        snakeHeadColor: '#00BCD4',
        snakeBodyStartColor: '#00E5FF',
        snakeBodyEndColor: '#006064',
        snakeBodyStyle: 'gradient',
        snakeBodyEmoji: '🐟',
        foodColor: '#FF6F00',
        foodEmoji: '🐟',
        eyeColor: '#FFFFFF',
        eyePupilColor: '#0277BD',
        snakeHeadEmoji: '🐬',
        description: '清新的海洋风格'
    },

    // 8. 森林风格
    forest: {
        name: '森林风格',
        backgroundColor: '#E8F5E9',
        gridColor: '#C8E6C9',
        snakeHeadColor: '#4CAF50',
        snakeBodyStartColor: '#8BC34A',
        snakeBodyEndColor: '#2E7D32',
        snakeBodyStyle: 'gradient',
        snakeBodyEmoji: '🐛',
        foodColor: '#8BC34A',
        foodEmoji: '🍎',
        eyeColor: '#FFFFFF',
        eyePupilColor: '#1B5E20',
        snakeHeadEmoji: '🐛',
        description: '自然森林风格'
    }
};

// 根据主题ID获取主题
function getTheme(themeId) {
    return SnakeThemes[themeId] || SnakeThemes.cute;
}

// 获取所有主题列表
function getAllThemes() {
    return Object.keys(SnakeThemes).map(key => ({
        id: key,
        ...SnakeThemes[key]
    }));
}

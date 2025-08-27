/*
 * @Author: Sirius 540363975@qq.com
 * @Date: 2025-07-17 22:54:38
 * @LastEditors: Sirius 540363975@qq.com
 * @LastEditTime: 2025-08-28 03:39:51
 */
export const POSTNAME = {
    1: "搅拌",
    2: "丹麦",
    3: "整形",
    4: "烤炉",
    5: "冷加工",
    6: "收银打包",
    7: '水吧',
    8: "馅料",
    9: "小库房",
    10: "收货入库"
};

// 时区配置
export const TIMEZONE_CONFIG = {
    // 默认时区 (中国标准时间)
    DEFAULT_TIMEZONE: 'Asia/Shanghai',
    
    // 支持的时区列表
    SUPPORTED_TIMEZONES: [
        { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' },
        { value: 'UTC', label: '协调世界时 (UTC+0)' },
        { value: 'America/New_York', label: '美国东部时间' },
        { value: 'Europe/London', label: '英国时间' },
        { value: 'Asia/Tokyo', label: '日本标准时间' }
    ],
    
    // 时区偏移量 (小时)
    TIMEZONE_OFFSETS: {
        'Asia/Shanghai': 8,
        'UTC': 0,
        'America/New_York': -5, // 标准时间，夏令时为-4
        'Europe/London': 0, // 标准时间，夏令时为+1
        'Asia/Tokyo': 9
    },
    
    // 是否自动检测用户时区
    AUTO_DETECT_TIMEZONE: false,
    
    // 时区显示格式配置
    TIMEZONE_DISPLAY_FORMAT: {
        SHOW_TIMEZONE_SUFFIX: true,
        TIMEZONE_SUFFIX_FORMAT: 'short' // 'short' | 'long' | 'offset'
    }
};

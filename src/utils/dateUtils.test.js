/**
 * 前端时区处理单元测试
 * 测试 dateUtils.js 中的时区转换功能
 */

import {
  utcToLocalTime,
  localTimeToUTC,
  localDateToUTC,
  formatUTCToLocal,
  getDefaultTimezone,
  detectUserTimezone,
  getActiveTimezone,
  formatDate,
  DATE_FORMATS
} from './dateUtils.js';

// Mock 时区配置
jest.mock('../config/constants.js', () => ({
  TIMEZONE_CONFIG: {
    DEFAULT_TIMEZONE: 'Asia/Shanghai',
    AUTO_DETECT_TIMEZONE: false,
    TIMEZONE_DISPLAY_FORMAT: {
      SHOW_TIMEZONE_SUFFIX: true,
      TIMEZONE_SUFFIX_FORMAT: 'short'
    }
  }
}));

// Mock Intl.DateTimeFormat
const mockIntl = {
  DateTimeFormat: jest.fn(() => ({
    resolvedOptions: () => ({ timeZone: 'Asia/Shanghai' })
  }))
};
global.Intl = mockIntl;

describe('dateUtils 时区处理测试', () => {
  const testDate = new Date('2024-01-01T12:00:00Z'); // UTC时间
  const testDateString = '2024-01-01T12:00:00Z';
  const shanghaiTimezone = 'Asia/Shanghai';
  const utcTimezone = 'UTC';

  describe('时区配置功能', () => {
    test('getDefaultTimezone 应该返回默认时区', () => {
      expect(getDefaultTimezone()).toBe('Asia/Shanghai');
    });

    test('detectUserTimezone 应该检测用户时区', () => {
      expect(detectUserTimezone()).toBe('Asia/Shanghai');
    });

    test('getActiveTimezone 应该返回活动时区', () => {
      expect(getActiveTimezone()).toBe('Asia/Shanghai');
    });

    test('detectUserTimezone 在错误时应该返回默认时区', () => {
      // Mock Intl 抛出错误
      const originalIntl = global.Intl;
      global.Intl = {
        DateTimeFormat: () => {
          throw new Error('Not supported');
        }
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      expect(detectUserTimezone()).toBe('Asia/Shanghai');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      global.Intl = originalIntl;
    });
  });

  describe('UTC 转换功能', () => {
    test('utcToLocalTime 应该正确转换UTC到本地时间', () => {
      const result = utcToLocalTime(testDate, shanghaiTimezone);
      expect(result).toBeInstanceOf(Date);
      // 上海时间应该比UTC时间晚8小时
      expect(result.getHours()).toBe(20); // 12 + 8 = 20
    });

    test('utcToLocalTime 应该处理字符串输入', () => {
      const result = utcToLocalTime(testDateString, shanghaiTimezone);
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(20);
    });

    test('localTimeToUTC 应该正确转换本地时间到UTC', () => {
      const localDate = new Date('2024-01-01T20:00:00'); // 假设这是上海时间
      const result = localTimeToUTC(localDate, shanghaiTimezone);
      expect(result).toBeInstanceOf(Date);
      // 转换后应该是UTC 12:00
      expect(result.getUTCHours()).toBe(12);
    });

    test('localDateToUTC 应该正确转换日期字符串到UTC', () => {
      const result = localDateToUTC('2024-01-01', shanghaiTimezone);
      expect(result).toBeInstanceOf(Date);
      // 上海时间2024-01-01 00:00:00应该转换为UTC 2023-12-31 16:00:00
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(11); // 12月 (0-based)
      expect(result.getUTCDate()).toBe(31);
      expect(result.getUTCHours()).toBe(16);
    });
  });

  describe('日期格式化功能', () => {
    test('formatUTCToLocal 应该正确格式化UTC时间到本地时间', () => {
      const result = formatUTCToLocal(testDate, DATE_FORMATS.DATETIME, shanghaiTimezone);
      expect(result).toBe('2024-01-01 20:00:00');
    });

    test('formatUTCToLocal 应该处理字符串输入', () => {
      const result = formatUTCToLocal(testDateString, DATE_FORMATS.DATE, shanghaiTimezone);
      expect(result).toBe('2024-01-01');
    });

    test('formatUTCToLocal 应该处理null输入', () => {
      const result = formatUTCToLocal(null, DATE_FORMATS.DATETIME, shanghaiTimezone);
      expect(result).toBe('-');
    });

    test('formatUTCToLocal 应该处理undefined输入', () => {
      const result = formatUTCToLocal(undefined, DATE_FORMATS.DATETIME, shanghaiTimezone);
      expect(result).toBe('-');
    });

    test('formatDate 应该正确格式化日期', () => {
      const result = formatDate(testDate, DATE_FORMATS.DATE);
      expect(result).toBe('2024-01-01');
    });
  });

  describe('不同时区测试', () => {
    test('应该正确处理UTC时区', () => {
      const result = utcToLocalTime(testDate, utcTimezone);
      expect(result.getHours()).toBe(12); // UTC时间不变
    });

    test('应该正确处理东京时区', () => {
      const tokyoTimezone = 'Asia/Tokyo';
      const result = utcToLocalTime(testDate, tokyoTimezone);
      expect(result.getHours()).toBe(21); // 12 + 9 = 21 (东京UTC+9)
    });

    test('应该正确处理纽约时区', () => {
      const nyTimezone = 'America/New_York';
      const result = utcToLocalTime(testDate, nyTimezone);
      // 纽约时间取决于是否夏令时，这里测试冬季时间UTC-5
      expect(result.getHours()).toBe(7); // 12 - 5 = 7
    });
  });

  describe('边界情况测试', () => {
    test('应该处理无效日期', () => {
      const invalidDate = new Date('invalid');
      const result = formatUTCToLocal(invalidDate, DATE_FORMATS.DATETIME, shanghaiTimezone);
      expect(result).toBe('-');
    });

    test('应该处理空字符串', () => {
      const result = formatUTCToLocal('', DATE_FORMATS.DATETIME, shanghaiTimezone);
      expect(result).toBe('-');
    });

    test('localDateToUTC 应该处理不同的日期格式', () => {
      const result1 = localDateToUTC('2024-01-01', shanghaiTimezone);
      const result2 = localDateToUTC('2024/01/01', shanghaiTimezone);
      
      expect(result1).toBeInstanceOf(Date);
      expect(result2).toBeInstanceOf(Date);
      // 两个结果应该相同
      expect(result1.getTime()).toBe(result2.getTime());
    });
  });

  describe('DATE_FORMATS 常量测试', () => {
    test('DATE_FORMATS 应该包含所有必要的格式', () => {
      expect(DATE_FORMATS.DATE).toBe('yyyy-MM-dd');
      expect(DATE_FORMATS.DATETIME).toBe('yyyy-MM-dd HH:mm:ss');
      expect(DATE_FORMATS.TIME).toBe('HH:mm:ss');
      expect(DATE_FORMATS.MONTH_DAY).toBe('MM-dd');
      expect(DATE_FORMATS.YEAR_MONTH).toBe('yyyy-MM');
      expect(DATE_FORMATS.FILE_TIMESTAMP).toBe('yyyyMMdd_HHmmss');
    });

    test('应该使用不同的格式正确格式化', () => {
      const testDate = new Date('2024-01-01T12:30:45Z');
      
      expect(formatDate(testDate, DATE_FORMATS.DATE)).toBe('2024-01-01');
      expect(formatDate(testDate, DATE_FORMATS.TIME)).toBe('12:30:45');
      expect(formatDate(testDate, DATE_FORMATS.MONTH_DAY)).toBe('01-01');
      expect(formatDate(testDate, DATE_FORMATS.YEAR_MONTH)).toBe('2024-01');
      expect(formatDate(testDate, DATE_FORMATS.FILE_TIMESTAMP)).toBe('20240101_123045');
    });
  });

  describe('性能测试', () => {
    test('UTC转换应该在合理时间内完成', () => {
      const iterations = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        utcToLocalTime(testDate, shanghaiTimezone);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1000次转换应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });

    test('格式化应该在合理时间内完成', () => {
      const iterations = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        formatUTCToLocal(testDate, DATE_FORMATS.DATETIME, shanghaiTimezone);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1000次格式化应该在200ms内完成
      expect(duration).toBeLessThan(200);
    });
  });

  describe('集成测试', () => {
    test('完整的UTC转换和格式化流程', () => {
      // 模拟从后端获取UTC时间，转换为本地时间并格式化显示
      const utcFromBackend = '2024-01-01T04:00:00Z';
      
      // 转换为本地时间
      const localTime = utcToLocalTime(utcFromBackend, shanghaiTimezone);
      
      // 格式化显示
      const formatted = formatDate(localTime, DATE_FORMATS.DATETIME);
      
      // 上海时间应该是12:00:00
      expect(formatted).toBe('2024-01-01 12:00:00');
    });

    test('完整的本地时间转UTC提交流程', () => {
      // 模拟用户选择日期，转换为UTC时间提交给后端
      const userSelectedDate = '2024-01-01';
      
      // 转换为UTC时间
      const utcForSubmit = localDateToUTC(userSelectedDate, shanghaiTimezone);
      
      // 格式化为ISO字符串提交
      const isoString = utcForSubmit.toISOString();
      
      // 应该是前一天的16:00:00Z
      expect(isoString).toBe('2023-12-31T16:00:00.000Z');
    });
  });
});
const moment = require('moment-timezone');

/**
 * 统一时区处理工具类
 * 提供UTC时间转换和时区处理方法
 */
class TimezoneUtils {
  /**
   * 默认时区设置
   */
  static DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Shanghai';

  /**
   * 将本地日期字符串转换为UTC Date对象
   * @param {string} dateString - 日期字符串 (YYYY-MM-DD)
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @returns {Date} UTC Date对象
   */
  static localDateToUTC(dateString, timezone = this.DEFAULT_TIMEZONE) {
    if (!dateString) return null;
    
    // 创建指定时区的日期对象
    const localMoment = moment.tz(dateString, 'YYYY-MM-DD', timezone);
    return localMoment.utc().toDate();
  }

  /**
   * 将本地日期时间字符串转换为UTC Date对象
   * @param {string} dateTimeString - 日期时间字符串
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @returns {Date} UTC Date对象
   */
  static localDateTimeToUTC(dateTimeString, timezone = this.DEFAULT_TIMEZONE) {
    if (!dateTimeString) return null;
    
    const localMoment = moment.tz(dateTimeString, timezone);
    return localMoment.utc().toDate();
  }

  /**
   * 将UTC Date对象转换为指定时区的日期字符串
   * @param {Date} utcDate - UTC Date对象
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @param {string} format - 格式，默认为YYYY-MM-DD
   * @returns {string} 本地时区日期字符串
   */
  static utcToLocalDate(utcDate, timezone = this.DEFAULT_TIMEZONE, format = 'YYYY-MM-DD') {
    if (!utcDate) return null;
    
    return moment.utc(utcDate).tz(timezone).format(format);
  }

  /**
   * 将UTC Date对象转换为指定时区的日期时间字符串
   * @param {Date} utcDate - UTC Date对象
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @param {string} format - 格式，默认为YYYY-MM-DD HH:mm:ss
   * @returns {string} 本地时区日期时间字符串
   */
  static utcToLocalDateTime(utcDate, timezone = this.DEFAULT_TIMEZONE, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!utcDate) return null;
    
    return moment.utc(utcDate).tz(timezone).format(format);
  }

  /**
   * 获取指定时区的日期范围（一天的开始和结束）
   * @param {string} dateString - 日期字符串 (YYYY-MM-DD)
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @returns {Object} {startUTC: Date, endUTC: Date}
   */
  static getDayRangeUTC(dateString, timezone = this.DEFAULT_TIMEZONE) {
    if (!dateString) return null;
    
    const startOfDay = moment.tz(dateString, 'YYYY-MM-DD', timezone).startOf('day');
    const endOfDay = moment.tz(dateString, 'YYYY-MM-DD', timezone).endOf('day');
    
    return {
      startUTC: startOfDay.utc().toDate(),
      endUTC: endOfDay.utc().toDate()
    };
  }

  /**
   * 获取指定时区的日期范围（多天）
   * @param {string} startDateString - 开始日期字符串 (YYYY-MM-DD)
   * @param {string} endDateString - 结束日期字符串 (YYYY-MM-DD)
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @returns {Object} {startUTC: Date, endUTC: Date}
   */
  static getDateRangeUTC(startDateString, endDateString, timezone = this.DEFAULT_TIMEZONE) {
    if (!startDateString || !endDateString) return null;
    
    const startOfRange = moment.tz(startDateString, 'YYYY-MM-DD', timezone).startOf('day');
    const endOfRange = moment.tz(endDateString, 'YYYY-MM-DD', timezone).endOf('day');
    
    return {
      startUTC: startOfRange.utc().toDate(),
      endUTC: endOfRange.utc().toDate()
    };
  }

  /**
   * 根据周期获取日期范围（UTC）
   * @param {string} period - 周期 (today, yesterday, week, lastWeek, month, lastMonth)
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @returns {Object} {startUTC: Date, endUTC: Date}
   */
  static getPeriodRangeUTC(period, timezone = this.DEFAULT_TIMEZONE) {
    const now = moment.tz(timezone);
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = now.clone().startOf('day');
        endDate = now.clone().endOf('day');
        break;
      case 'yesterday':
        startDate = now.clone().subtract(1, 'day').startOf('day');
        endDate = now.clone().subtract(1, 'day').endOf('day');
        break;
      case 'week':
        startDate = now.clone().startOf('week');
        endDate = now.clone().endOf('week');
        break;
      case 'lastWeek':
        startDate = now.clone().subtract(1, 'week').startOf('week');
        endDate = now.clone().subtract(1, 'week').endOf('week');
        break;
      case 'month':
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
        break;
      case 'lastMonth':
        startDate = now.clone().subtract(1, 'month').startOf('month');
        endDate = now.clone().subtract(1, 'month').endOf('month');
        break;
      default:
        throw new Error(`不支持的周期类型: ${period}`);
    }

    return {
      startUTC: startDate.utc().toDate(),
      endUTC: endDate.utc().toDate()
    };
  }

  /**
   * 获取当前UTC时间
   * @returns {Date} UTC Date对象
   */
  static nowUTC() {
    return moment.utc().toDate();
  }

  /**
   * 获取指定时区的当前时间
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @returns {Date} 本地时区Date对象
   */
  static nowLocal(timezone = this.DEFAULT_TIMEZONE) {
    return moment.tz(timezone).toDate();
  }

  /**
   * 验证时区是否有效
   * @param {string} timezone - 时区字符串
   * @returns {boolean} 是否有效
   */
  static isValidTimezone(timezone) {
    return moment.tz.zone(timezone) !== null;
  }

  /**
   * 获取时区偏移量（小时）
   * @param {string} timezone - 时区，默认为Asia/Shanghai
   * @returns {number} 偏移量（小时）
   */
  static getTimezoneOffset(timezone = this.DEFAULT_TIMEZONE) {
    return moment.tz(timezone).utcOffset() / 60;
  }
}

module.exports = TimezoneUtils;
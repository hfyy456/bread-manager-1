/**
 * 统一的日期工具函数
 * 使用 date-fns 作为统一的日期处理库
 */
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isValid,
  getYear,
  getWeek,
} from "date-fns";
import * as dateFnsTz from "date-fns-tz";
import { zhCN } from "date-fns/locale";
import { TIMEZONE_CONFIG } from '../config/constants.js';

// Re-export date-fns functions that are used elsewhere in the application
export {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isValid,
  getYear,
  getWeek,
};

// 默认时区配置
const DEFAULT_TIMEZONE = TIMEZONE_CONFIG.DEFAULT_TIMEZONE;
const BEIJING_TIMEZONE = "Asia/Shanghai";

/**
 * 获取当前配置的默认时区
 * @returns {string} 时区标识符
 */
export const getDefaultTimezone = () => {
  return DEFAULT_TIMEZONE;
};

/**
 * 检测用户当前时区
 * @returns {string} 用户当前时区标识符
 */
export const detectUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('无法检测用户时区，使用默认时区:', DEFAULT_TIMEZONE);
    return DEFAULT_TIMEZONE;
  }
};

/**
 * 获取实际使用的时区
 * @returns {string} 时区标识符
 */
export const getActiveTimezone = () => {
  if (TIMEZONE_CONFIG.AUTO_DETECT_TIMEZONE) {
    return detectUserTimezone();
  }
  return DEFAULT_TIMEZONE;
};

/**
 * 格式化日期为指定格式
 * @param {Date|string} date - 日期
 * @param {string} formatStr - 格式字符串，默认 'yyyy-MM-dd HH:mm:ss'
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (date, formatStr = "yyyy-MM-dd HH:mm:ss") => {
  if (!date) return "-";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(dateObj)) return "-";
  return format(dateObj, formatStr, { locale: zhCN });
};

/**
 * 格式化日期为北京时间
 * @param {Date|string} date - 日期
 * @param {string} formatStr - 格式字符串
 * @returns {string} 格式化后的日期字符串
 */
export const formatDateInBJT = (date, formatStr = "yyyy-MM-dd HH:mm:ss") => {
  if (!date) return "-";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(dateObj)) return "-";
  const bjTime = dateFnsTz.toZonedTime(dateObj, BEIJING_TIMEZONE);
  return format(bjTime, formatStr, { locale: zhCN });
};

/**
 * 获取当前北京时间
 * @returns {Date} 北京时间的Date对象
 */
export const getCurrentBJTime = () => {
  return dateFnsTz.toZonedTime(new Date(), BEIJING_TIMEZONE);
};

/**
 * 将日期转换为北京时间
 * @param {Date|string} date - 日期
 * @returns {Date} 北京时间的Date对象
 */
export const toBJTime = (date) => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return dateFnsTz.toZonedTime(dateObj, BEIJING_TIMEZONE);
};

/**
 * 将UTC时间转换为本地时区时间
 * @param {Date|string} utcDate - UTC时间
 * @param {string} timezone - 目标时区，默认为北京时间
 * @returns {Date} 本地时区的Date对象
 */
export const utcToLocalTime = (utcDate, timezone = getActiveTimezone()) => {
  const dateObj = typeof utcDate === "string" ? parseISO(utcDate) : utcDate;
  return dateFnsTz.toZonedTime(dateObj, timezone);
};

/**
 * 将本地时间转换为UTC时间
 * @param {Date|string} localDate - 本地时间
 * @param {string} timezone - 源时区，默认为北京时间
 * @returns {Date} UTC时间的Date对象
 */
export const localTimeToUTC = (localDate, timezone = getActiveTimezone()) => {
  const dateObj = typeof localDate === "string" ? parseISO(localDate) : localDate;
  return dateFnsTz.fromZonedTime(dateObj, timezone);
};

/**
 * 将本地日期字符串转换为UTC时间（用于与后端API交互）
 * @param {string} localDateStr - 本地日期字符串 (YYYY-MM-DD)
 * @param {string} timezone - 源时区，默认为北京时间
 * @returns {Date} UTC时间的Date对象
 */
export const localDateToUTC = (localDateStr, timezone = getActiveTimezone()) => {
  // 直接使用UTC日期，不进行时区转换
  // 这样可以确保日期在数据库中保存为正确的日期
  return new Date(localDateStr + 'T00:00:00.000Z');
};

/**
 * 格式化UTC时间为本地时区显示
 * @param {Date|string} utcDate - UTC时间
 * @param {string} formatStr - 格式字符串，默认 'yyyy-MM-dd HH:mm:ss'
 * @param {string} timezone - 目标时区，默认为北京时间
 * @returns {string} 格式化后的本地时间字符串
 */
export const formatUTCToLocal = (utcDate, formatStr = "yyyy-MM-dd HH:mm:ss", timezone = getActiveTimezone()) => {
  if (!utcDate) return "-";
  const localTime = utcToLocalTime(utcDate, timezone);
  return format(localTime, formatStr, { locale: zhCN });
};

/**
 * 获取日期范围（考虑北京时间）
 * @param {string} period - 周期类型：'daily', 'weekly', 'monthly'
 * @param {string|Date} targetDate - 目标日期
 * @returns {Object} 包含 startDate 和 endDate 的对象
 */
export const getDateRange = (period, targetDate) => {
  const targetDateInBJT = toBJTime(targetDate);
  let startDate, endDate;

  switch (period) {
    case "daily":
      startDate = startOfDay(targetDateInBJT);
      endDate = endOfDay(targetDateInBJT);
      break;
    case "weekly":
      startDate = startOfWeek(targetDateInBJT, { weekStartsOn: 1 }); // 周一开始
      endDate = endOfWeek(targetDateInBJT, { weekStartsOn: 1 });
      break;
    case "monthly":
      startDate = startOfMonth(targetDateInBJT);
      endDate = endOfMonth(targetDateInBJT);
      break;
    default:
      throw new Error("Invalid period type");
  }

  return { startDate, endDate };
};

/**
 * 获取年份和周数
 * @param {Date|string} date - 日期，默认为当前时间
 * @returns {Object} 包含 year 和 week 的对象
 */
export const getYearAndWeek = (date = new Date()) => {
  const bjTime = toBJTime(date);
  return {
    year: getYear(bjTime),
    week: getWeek(bjTime, { weekStartsOn: 1 }),
  };
};

/**
 * 验证日期格式
 * @param {string} dateStr - 日期字符串
 * @param {string} formatStr - 期望的格式
 * @returns {boolean} 是否有效
 */
export const isValidDateFormat = (dateStr, formatStr = "yyyy-MM-dd") => {
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) && formatDate(parsed, formatStr) === dateStr;
  } catch {
    return false;
  }
};

// 导出常用的格式字符串
export const DATE_FORMATS = {
  DATE: "yyyy-MM-dd",
  DATETIME: "yyyy-MM-dd HH:mm:ss",
  TIME: "HH:mm:ss",
  MONTH_DAY: "MM-dd",
  YEAR_MONTH: "yyyy-MM",
  FILE_TIMESTAMP: "yyyyMMdd_HHmmss",
};

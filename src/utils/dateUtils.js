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

// 北京时区偏移
const BEIJING_TIMEZONE = "Asia/Shanghai";

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

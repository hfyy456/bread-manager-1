/**
 * 输入清理和验证工具
 * 防止XSS攻击和数据注入
 */

/**
 * HTML转义
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return str.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

/**
 * 清理用户输入
 * @param {string} input - 用户输入
 * @returns {string} 清理后的输入
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // 移除潜在的脚本标签
  let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除事件处理器
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // 移除javascript:协议
  cleaned = cleaned.replace(/javascript:/gi, '');
  
  // 移除data:协议
  cleaned = cleaned.replace(/data:/gi, '');
  
  // 移除vbscript:协议
  cleaned = cleaned.replace(/vbscript:/gi, '');
  
  return cleaned.trim();
};

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证手机号格式
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证数字范围
 * @param {number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} 是否在范围内
 */
export const isInRange = (value, min, max) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * 清理对象中的所有字符串字段
 * @param {Object} obj - 需要清理的对象
 * @returns {Object} 清理后的对象
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      cleaned[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeObject(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {Array} allowedTypes - 允许的文件类型
 * @returns {boolean} 是否允许
 */
export const isValidFileType = (file, allowedTypes = []) => {
  if (!file || !file.type) return false;
  return allowedTypes.includes(file.type);
};

/**
 * 验证文件大小
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大大小（字节）
 * @returns {boolean} 是否符合大小限制
 */
export const isValidFileSize = (file, maxSize) => {
  if (!file || !file.size) return false;
  return file.size <= maxSize;
};

/**
 * 生成安全的随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
export const generateSecureToken = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

export default {
  escapeHtml,
  sanitizeInput,
  sanitizeObject,
  isValidEmail,
  isValidPhone,
  isInRange,
  isValidFileType,
  isValidFileSize,
  generateSecureToken
};
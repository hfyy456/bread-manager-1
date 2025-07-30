const ResponseHelper = require('../utils/responseHelper');

/**
 * 请求验证中间件
 * 提供常用的验证功能
 */

/**
 * 验证必需字段
 * @param {Array} requiredFields - 必需字段数组
 */
const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    requiredFields.forEach(field => {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return ResponseHelper.validationError(res, {
        missingFields,
        message: `缺少必需字段: ${missingFields.join(', ')}`
      });
    }

    next();
  };
};

/**
 * 验证数组字段
 * @param {string} fieldName - 字段名
 * @param {number} minLength - 最小长度
 */
const validateArrayField = (fieldName, minLength = 1) => {
  return (req, res, next) => {
    const field = req.body[fieldName];
    
    if (!Array.isArray(field)) {
      return ResponseHelper.validationError(res, {
        [fieldName]: `${fieldName} 必须是数组`
      });
    }

    if (field.length < minLength) {
      return ResponseHelper.validationError(res, {
        [fieldName]: `${fieldName} 至少需要 ${minLength} 个元素`
      });
    }

    next();
  };
};

/**
 * 验证门店ID
 */
const validateStoreId = (req, res, next) => {
  const storeId = req.currentStoreId || req.headers['x-current-store-id'];
  
  if (!storeId) {
    return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
  }

  req.currentStoreId = storeId;
  next();
};

/**
 * 验证ObjectId格式
 * @param {string} paramName - 参数名
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    if (!objectIdRegex.test(id)) {
      return ResponseHelper.validationError(res, {
        [paramName]: `无效的${paramName}格式`
      });
    }

    next();
  };
};

/**
 * 验证日期范围
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return ResponseHelper.validationError(res, {
        dateRange: '无效的日期格式'
      });
    }
    
    if (start > end) {
      return ResponseHelper.validationError(res, {
        dateRange: '开始日期不能晚于结束日期'
      });
    }
  }
  
  next();
};

/**
 * 验证分页参数
 */
const validatePagination = (req, res, next) => {
  let { page = 1, limit = 10 } = req.query;
  
  page = parseInt(page);
  limit = parseInt(limit);
  
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  
  if (isNaN(limit) || limit < 1 || limit > 100) {
    limit = 10;
  }
  
  req.pagination = { page, limit };
  next();
};

module.exports = {
  validateRequiredFields,
  validateArrayField,
  validateStoreId,
  validateObjectId,
  validateDateRange,
  validatePagination
};
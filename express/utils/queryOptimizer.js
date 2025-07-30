/**
 * 数据库查询优化工具
 * 提供常用的查询优化方法
 */

/**
 * 构建分页查询
 * @param {Object} query - Mongoose查询对象
 * @param {Object} pagination - 分页参数
 * @returns {Object} 优化后的查询
 */
const buildPaginatedQuery = (query, pagination = {}) => {
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;
  
  return query
    .skip(skip)
    .limit(limit)
    .lean(); // 使用lean()提高性能
};

/**
 * 构建日期范围查询
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @param {string} field - 日期字段名
 * @returns {Object} 日期查询条件
 */
const buildDateRangeQuery = (startDate, endDate, field = 'createdAt') => {
  const query = {};
  
  if (startDate || endDate) {
    query[field] = {};
    
    if (startDate) {
      query[field].$gte = new Date(startDate);
    }
    
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query[field].$lte = endOfDay;
    }
  }
  
  return query;
};

/**
 * 构建文本搜索查询
 * @param {string} searchText - 搜索文本
 * @param {Array} fields - 搜索字段
 * @returns {Object} 搜索查询条件
 */
const buildTextSearchQuery = (searchText, fields = []) => {
  if (!searchText || !searchText.trim()) {
    return {};
  }
  
  const searchRegex = new RegExp(searchText.trim(), 'i');
  
  if (fields.length === 0) {
    return { $text: { $search: searchText } };
  }
  
  return {
    $or: fields.map(field => ({
      [field]: searchRegex
    }))
  };
};

/**
 * 构建状态过滤查询
 * @param {string|Array} status - 状态值
 * @returns {Object} 状态查询条件
 */
const buildStatusQuery = (status) => {
  if (!status || status === 'all') {
    return {};
  }
  
  if (Array.isArray(status)) {
    return { status: { $in: status } };
  }
  
  return { status };
};

/**
 * 优化聚合管道
 * @param {Array} pipeline - 聚合管道
 * @param {Object} options - 优化选项
 * @returns {Array} 优化后的管道
 */
const optimizeAggregationPipeline = (pipeline, options = {}) => {
  const { 
    addIndexHints = true, 
    allowDiskUse = false,
    maxTimeMS = 30000 
  } = options;
  
  // 在管道开始添加$match阶段以减少处理的文档数量
  const optimizedPipeline = [...pipeline];
  
  // 如果需要，添加索引提示
  if (addIndexHints && options.indexHint) {
    optimizedPipeline.unshift({ $hint: options.indexHint });
  }
  
  return optimizedPipeline;
};

/**
 * 构建复合查询
 * @param {Object} filters - 过滤条件
 * @returns {Object} 复合查询条件
 */
const buildComplexQuery = (filters = {}) => {
  const query = {};
  
  // 处理各种过滤条件
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    
    switch (key) {
      case 'dateRange':
        if (value.start || value.end) {
          Object.assign(query, buildDateRangeQuery(
            value.start, 
            value.end, 
            value.field || 'createdAt'
          ));
        }
        break;
        
      case 'search':
        if (value.text && value.fields) {
          Object.assign(query, buildTextSearchQuery(value.text, value.fields));
        }
        break;
        
      case 'status':
        Object.assign(query, buildStatusQuery(value));
        break;
        
      case 'ids':
        if (Array.isArray(value) && value.length > 0) {
          query._id = { $in: value };
        }
        break;
        
      default:
        // 直接赋值其他条件
        query[key] = value;
    }
  });
  
  return query;
};

/**
 * 执行优化的查询
 * @param {Object} Model - Mongoose模型
 * @param {Object} filters - 过滤条件
 * @param {Object} options - 查询选项
 * @returns {Promise} 查询结果
 */
const executeOptimizedQuery = async (Model, filters = {}, options = {}) => {
  const {
    pagination,
    populate,
    sort = { createdAt: -1 },
    select,
    lean = true
  } = options;
  
  // 构建查询条件
  const query = buildComplexQuery(filters);
  
  // 构建基础查询
  let mongoQuery = Model.find(query);
  
  // 添加排序
  if (sort) {
    mongoQuery = mongoQuery.sort(sort);
  }
  
  // 添加字段选择
  if (select) {
    mongoQuery = mongoQuery.select(select);
  }
  
  // 添加关联查询
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(pop => {
        mongoQuery = mongoQuery.populate(pop);
      });
    } else {
      mongoQuery = mongoQuery.populate(populate);
    }
  }
  
  // 添加分页
  if (pagination) {
    mongoQuery = buildPaginatedQuery(mongoQuery, pagination);
  } else if (lean) {
    mongoQuery = mongoQuery.lean();
  }
  
  return mongoQuery.exec();
};

/**
 * 获取查询统计信息
 * @param {Object} Model - Mongoose模型
 * @param {Object} filters - 过滤条件
 * @returns {Promise} 统计结果
 */
const getQueryStats = async (Model, filters = {}) => {
  const query = buildComplexQuery(filters);
  
  const [count, distinctCount] = await Promise.all([
    Model.countDocuments(query),
    Model.distinct('_id', query).then(ids => ids.length)
  ]);
  
  return {
    totalCount: count,
    distinctCount,
    hasData: count > 0
  };
};

module.exports = {
  buildPaginatedQuery,
  buildDateRangeQuery,
  buildTextSearchQuery,
  buildStatusQuery,
  buildComplexQuery,
  optimizeAggregationPipeline,
  executeOptimizedQuery,
  getQueryStats
};
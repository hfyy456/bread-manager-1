const logger = require('../utils/logger');

/**
 * API性能监控中间件
 * 记录请求响应时间和性能指标
 */
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求开始
  req.startTime = startTime;
  
  // 监听响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 记录API请求日志
    logger.apiRequest(req, res, duration);
    
    // 如果响应时间过长，记录性能警告
    if (duration > 2000) {
      logger.performance('Slow API Response', duration, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

/**
 * 数据库查询性能监控
 * @param {string} operation - 操作类型
 * @param {string} collection - 集合名称
 * @param {Function} queryFn - 查询函数
 * @returns {Promise} 查询结果
 */
const monitorDbQuery = async (operation, collection, queryFn) => {
  const startTime = Date.now();
  let error = null;
  let result = null;
  
  try {
    result = await queryFn();
    return result;
  } catch (err) {
    error = err;
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    logger.dbOperation(operation, collection, {}, duration, error);
  }
};

/**
 * 内存使用监控
 */
const monitorMemoryUsage = () => {
  const usage = process.memoryUsage();
  const formatBytes = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
  
  const memoryInfo = {
    rss: `${formatBytes(usage.rss)} MB`,
    heapTotal: `${formatBytes(usage.heapTotal)} MB`,
    heapUsed: `${formatBytes(usage.heapUsed)} MB`,
    external: `${formatBytes(usage.external)} MB`
  };
  
  // 如果内存使用过高，记录警告
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn('High memory usage detected', memoryInfo);
  }
  
  return memoryInfo;
};

/**
 * CPU使用监控
 */
const monitorCpuUsage = () => {
  const usage = process.cpuUsage();
  const formatMicroseconds = (microseconds) => Math.round(microseconds / 1000);
  
  return {
    user: `${formatMicroseconds(usage.user)} ms`,
    system: `${formatMicroseconds(usage.system)} ms`
  };
};

/**
 * 系统健康检查
 */
const healthCheck = () => {
  const memoryUsage = monitorMemoryUsage();
  const cpuUsage = monitorCpuUsage();
  const uptime = process.uptime();
  
  const healthInfo = {
    status: 'healthy',
    uptime: `${Math.floor(uptime / 60)} minutes`,
    memory: memoryUsage,
    cpu: cpuUsage,
    timestamp: new Date().toISOString()
  };
  
  // 检查是否有性能问题
  const heapUsedMB = parseInt(memoryUsage.heapUsed);
  if (heapUsedMB > 500) {
    healthInfo.status = 'warning';
    healthInfo.warnings = ['High memory usage'];
  }
  
  return healthInfo;
};

/**
 * 定期性能报告
 */
const startPerformanceReporting = (intervalMinutes = 30) => {
  setInterval(() => {
    const health = healthCheck();
    logger.performance('System Health Check', 0, health);
  }, intervalMinutes * 60 * 1000);
};

module.exports = {
  performanceMiddleware,
  monitorDbQuery,
  monitorMemoryUsage,
  monitorCpuUsage,
  healthCheck,
  startPerformanceReporting
};
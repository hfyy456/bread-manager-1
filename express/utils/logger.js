/**
 * 日志管理工具
 * 提供统一的日志记录功能
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
  }

  // 确保日志目录存在
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // 格式化日志消息
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    return JSON.stringify(logEntry) + '\n';
  }

  // 写入日志文件
  writeToFile(filename, content) {
    const filePath = path.join(this.logDir, filename);
    fs.appendFileSync(filePath, content);
  }

  // 获取日志文件名
  getLogFileName(type = 'app') {
    const date = new Date().toISOString().split('T')[0];
    return `${type}-${date}.log`;
  }

  // 信息日志
  info(message, meta = {}) {
    const logMessage = this.formatMessage('info', message, meta);
    console.log(`ℹ️ ${message}`, meta);
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(this.getLogFileName('info'), logMessage);
    }
  }

  // 错误日志
  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    };

    const logMessage = this.formatMessage('error', message, errorMeta);
    console.error(`❌ ${message}`, errorMeta);
    
    this.writeToFile(this.getLogFileName('error'), logMessage);
  }

  // 警告日志
  warn(message, meta = {}) {
    const logMessage = this.formatMessage('warn', message, meta);
    console.warn(`⚠️ ${message}`, meta);
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(this.getLogFileName('warn'), logMessage);
    }
  }

  // 调试日志
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('debug', message, meta);
      console.debug(`🐛 ${message}`, meta);
      this.writeToFile(this.getLogFileName('debug'), logMessage);
    }
  }

  // API请求日志
  apiRequest(req, res, duration) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      storeId: req.currentStoreId
    };

    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 400) {
      this.error(message, null, logData);
    } else {
      this.info(message, logData);
    }

    this.writeToFile(this.getLogFileName('api'), this.formatMessage('api', message, logData));
  }

  // 数据库操作日志
  dbOperation(operation, collection, query = {}, duration = 0, error = null) {
    const logData = {
      operation,
      collection,
      query: JSON.stringify(query),
      duration: `${duration}ms`,
      success: !error
    };

    const message = `DB ${operation} on ${collection} - ${duration}ms`;

    if (error) {
      this.error(message, error, logData);
    } else {
      this.debug(message, logData);
    }
  }

  // 性能日志
  performance(operation, duration, metadata = {}) {
    const logData = {
      operation,
      duration: `${duration}ms`,
      ...metadata
    };

    const message = `Performance: ${operation} took ${duration}ms`;

    if (duration > 1000) {
      this.warn(message, logData);
    } else {
      this.debug(message, logData);
    }

    this.writeToFile(this.getLogFileName('performance'), this.formatMessage('performance', message, logData));
  }

  // 安全日志
  security(event, details = {}) {
    const logData = {
      event,
      timestamp: new Date().toISOString(),
      ...details
    };

    const message = `Security Event: ${event}`;
    this.warn(message, logData);
    this.writeToFile(this.getLogFileName('security'), this.formatMessage('security', message, logData));
  }

  // 清理旧日志文件
  cleanupOldLogs(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`Cleaned up old log file: ${file}`);
        }
      });
    } catch (error) {
      this.error('Failed to cleanup old logs', error);
    }
  }
}

// 创建全局日志实例
const logger = new Logger();

// 定期清理日志（每天运行一次）
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    logger.cleanupOldLogs();
  }, 24 * 60 * 60 * 1000); // 24小时
}

module.exports = logger;
/**
 * 性能监控工具
 * 用于监控主仓库存等关键功能的加载性能
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.enabled = process.env.NODE_ENV === 'development';
  }

  // 开始计时
  start(key) {
    if (!this.enabled) return;
    
    this.metrics.set(key, {
      startTime: performance.now(),
      endTime: null,
      duration: null,
      metadata: {}
    });
  }

  // 结束计时
  end(key, metadata = {}) {
    if (!this.enabled) return;
    
    const metric = this.metrics.get(key);
    if (!metric) {
      console.warn(`Performance metric '${key}' not found`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.metadata = { ...metric.metadata, ...metadata };

    // 输出性能日志
    this.logMetric(key, metric);
    
    return metric.duration;
  }

  // 记录性能指标
  logMetric(key, metric) {
    const duration = metric.duration.toFixed(2);
    const color = this.getColorByDuration(metric.duration);
    
    console.log(
      `%c[Performance] ${key}: ${duration}ms`,
      `color: ${color}; font-weight: bold;`,
      metric.metadata
    );

    // 如果耗时过长，发出警告
    if (metric.duration > 2000) {
      console.warn(`⚠️ Slow operation detected: ${key} took ${duration}ms`);
    }
  }

  // 根据耗时获取颜色
  getColorByDuration(duration) {
    if (duration < 100) return '#4CAF50'; // 绿色 - 快
    if (duration < 500) return '#FF9800'; // 橙色 - 中等
    if (duration < 1000) return '#F44336'; // 红色 - 慢
    return '#9C27B0'; // 紫色 - 很慢
  }

  // 获取指标
  getMetric(key) {
    return this.metrics.get(key);
  }

  // 获取所有指标
  getAllMetrics() {
    return Array.from(this.metrics.entries()).map(([key, metric]) => ({
      key,
      ...metric
    }));
  }

  // 清除指标
  clear(key) {
    if (key) {
      this.metrics.delete(key);
    } else {
      this.metrics.clear();
    }
  }

  // 生成性能报告
  generateReport() {
    if (!this.enabled) return null;

    const metrics = this.getAllMetrics();
    const report = {
      totalMetrics: metrics.length,
      averageDuration: metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length,
      slowOperations: metrics.filter(m => (m.duration || 0) > 1000),
      fastOperations: metrics.filter(m => (m.duration || 0) < 100),
      metrics: metrics.sort((a, b) => (b.duration || 0) - (a.duration || 0))
    };

    console.group('📊 Performance Report');
    console.log('Total operations:', report.totalMetrics);
    console.log('Average duration:', report.averageDuration.toFixed(2) + 'ms');
    console.log('Slow operations (>1s):', report.slowOperations.length);
    console.log('Fast operations (<100ms):', report.fastOperations.length);
    
    if (report.slowOperations.length > 0) {
      console.group('🐌 Slow Operations');
      report.slowOperations.forEach(op => {
        console.log(`${op.key}: ${op.duration.toFixed(2)}ms`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();

    return report;
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

// 导出便捷函数
export const startTimer = (key) => performanceMonitor.start(key);
export const endTimer = (key, metadata) => performanceMonitor.end(key, metadata);
export const getMetric = (key) => performanceMonitor.getMetric(key);
export const generateReport = () => performanceMonitor.generateReport();
export const clearMetrics = (key) => performanceMonitor.clear(key);

// 主仓库存专用的性能监控函数
export const warehousePerformance = {
  startFetch: () => startTimer('warehouse-fetch'),
  endFetch: (itemCount) => endTimer('warehouse-fetch', { itemCount }),
  
  startRender: () => startTimer('warehouse-render'),
  endRender: (itemCount) => endTimer('warehouse-render', { itemCount }),
  
  startCache: () => startTimer('warehouse-cache'),
  endCache: (operation) => endTimer('warehouse-cache', { operation })
};

export default performanceMonitor;
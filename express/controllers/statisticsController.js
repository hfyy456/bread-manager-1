const mongoose = require('mongoose');
const Revenue = require('../models/Revenue');
const ProductionLoss = require('../models/ProductionLoss');
const StoreInventory = require('../models/StoreInventory');
const Store = require('../models/Store');
const Ingredient = require('../models/Ingredient');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * 获取日期范围的开始和结束时间
 * @param {string} period - 时间周期：'today', 'yesterday', 'week', 'lastWeek', 'month', 'lastMonth'
 * @param {string} timezone - 时区，默认为 'Asia/Shanghai'
 * @returns {Object} 包含startDate和endDate的对象
 */
const getDateRange = (period, timezone = 'Asia/Shanghai') => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      // 当天：从00:00:00到23:59:59
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'yesterday':
      // 昨日：从昨天00:00:00到昨天23:59:59
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      
      startDate = new Date(yesterday);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'week':
      // 本周：从周一00:00:00到当前时间
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周日为0，需要特殊处理
      
      startDate = new Date(now);
      startDate.setDate(now.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(now);
      break;
    
    case 'lastWeek':
      // 上周：从上周一00:00:00到上周日23:59:59
      const currentDayOfWeek = now.getDay();
      const daysToLastMonday = currentDayOfWeek === 0 ? 13 : currentDayOfWeek + 6; // 周日为0，需要特殊处理
      
      startDate = new Date(now);
      startDate.setDate(now.getDate() - daysToLastMonday);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'month':
      // 本月：从1号00:00:00到当前时间
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(now);
      break;
    
    case 'lastMonth':
      // 上月：从上月1号00:00:00到上月最后一天23:59:59
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = new Date(lastMonth);
      startDate.setHours(0, 0, 0, 0);
      
      // 上月最后一天
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    default:
      throw new Error('无效的时间周期参数');
  }

  return { startDate, endDate };
};

/**
 * 获取营业数据统计
 * @param {string} storeId - 门店ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Object} 营业数据统计结果
 */
const getRevenueStats = async (storeId, startDate, endDate) => {
  try {
    // 确保storeId是ObjectId类型
    const objectIdStoreId = mongoose.Types.ObjectId.isValid(storeId) 
      ? new mongoose.Types.ObjectId(storeId) 
      : storeId;
    
    const pipeline = [
      {
        $match: {
          storeId: objectIdStoreId,
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalActualRevenue: { $sum: '$actualRevenue' },
          totalRevenue: { $sum: '$totalRevenue' },
          totalOrderCount: { $sum: '$orderCount' },
          avgOrderValue: { $avg: '$avgOrderValue' },
          totalMeituanRevenue: { $sum: '$meituanRevenue' },
          totalDouyinRevenue: { $sum: '$douyinRevenue' },
          totalCashRevenue: { $sum: '$cashRevenue' },
          totalCardRevenue: { $sum: '$cardRevenue' },
          totalWechatRevenue: { $sum: '$wechatRevenue' },
          totalAlipayRevenue: { $sum: '$alipayRevenue' },
          recordCount: { $sum: 1 }
        }
      }
    ];

    const result = await Revenue.aggregate(pipeline);
    
    if (result.length === 0) {
      return {
        totalActualRevenue: 0,
        totalRevenue: 0,
        totalOrderCount: 0,
        avgOrderValue: 0,
        totalMeituanRevenue: 0,
        totalDouyinRevenue: 0,
        totalCashRevenue: 0,
        totalCardRevenue: 0,
        totalWechatRevenue: 0,
        totalAlipayRevenue: 0,
        recordCount: 0
      };
    }

    return result[0];
  } catch (error) {
    logger.error('获取营业数据统计失败:', error);
    throw error;
  }
};

/**
 * 获取生产报损数据统计
 * @param {string} storeId - 门店ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Object} 生产报损数据统计结果
 */
const getProductionLossStats = async (storeId, startDate, endDate) => {
  try {
    // ProductionLoss模型中storeId是String类型，不需要转换为ObjectId
    const stringStoreId = storeId.toString();
    
    const pipeline = [
      {
        $match: {
          storeId: stringStoreId,
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$type',
          totalQuantity: { $sum: '$totalQuantity' },
          totalValue: { $sum: '$totalValue' },
          recordCount: { $sum: 1 }
        }
      }
    ];

    const result = await ProductionLoss.aggregate(pipeline);
    
    // 按报损类型组织数据
    const stats = {
      production: { totalQuantity: 0, totalValue: 0, recordCount: 0 },
      tasting: { totalQuantity: 0, totalValue: 0, recordCount: 0 },
      closing: { totalQuantity: 0, totalValue: 0, recordCount: 0 },
      other: { totalQuantity: 0, totalValue: 0, recordCount: 0 },
      shipment: { totalQuantity: 0, totalValue: 0, recordCount: 0 }
    };

    result.forEach(item => {
      if (stats[item._id]) {
        stats[item._id] = {
          totalQuantity: item.totalQuantity,
          totalValue: item.totalValue,
          recordCount: item.recordCount
        };
      }
    });

    // 计算总计
    const totalStats = {
      totalQuantity: Object.values(stats).reduce((sum, item) => sum + item.totalQuantity, 0),
      totalValue: Object.values(stats).reduce((sum, item) => sum + item.totalValue, 0),
      recordCount: Object.values(stats).reduce((sum, item) => sum + item.recordCount, 0)
    };

    return {
      byType: stats,
      total: totalStats
    };
  } catch (error) {
    logger.error('获取生产报损数据统计失败:', error);
    throw error;
  }
};

/**
 * 获取库存数据统计
 * @param {string} storeId - 门店ID
 * @returns {Object} 库存数据统计结果
 */
const getInventoryStats = async (storeId) => {
  try {
    // 确保storeId是ObjectId类型
    const objectIdStoreId = mongoose.Types.ObjectId.isValid(storeId) 
      ? new mongoose.Types.ObjectId(storeId) 
      : storeId;
    
    const pipeline = [
      {
        $match: {
          storeId: objectIdStoreId
        }
      },
      {
        $lookup: {
          from: 'ingredients',
          localField: 'ingredientId',
          foreignField: '_id',
          as: 'ingredient'
        }
      },
      {
        $unwind: '$ingredient'
      },
      {
        $addFields: {
          // 计算主仓库存价值
          mainWarehouseValue: {
            $multiply: [
              { $ifNull: ['$mainWarehouseStock.quantity', 0] },
              { $ifNull: ['$ingredient.price', 0] }
            ]
          },
          // 计算岗位库存总量和价值
          postStockValue: {
            $reduce: {
              input: { $objectToArray: { $ifNull: ['$stockByPost', {}] } },
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $multiply: [
                      { $ifNull: ['$$this.v.quantity', 0] },
                      { $ifNull: ['$ingredient.price', 0] }
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $add: ['$mainWarehouseValue', '$postStockValue']
            }
          }
        }
      }
    ];

    const result = await StoreInventory.aggregate(pipeline);
    
    // 返回库存总价值
    const totalValue = result.length > 0 ? result[0].totalValue : 0;
    
    return {
      totalValue: Math.round(totalValue * 100) / 100 // 保留两位小数
    };
  } catch (error) {
    logger.error('获取库存数据统计失败:', error);
    throw error;
  }
};

/**
 * 计算业务指标
 * @param {Object} revenueStats - 营业数据统计
 * @param {Object} productionLossStats - 生产报损数据统计
 * @returns {Object} 业务指标计算结果
 */
const calculateBusinessMetrics = (revenueStats, productionLossStats) => {
  const metrics = {
    revenue: {},
    productionLoss: {}
  };

  // 实收率 = 实收金额 / 营业额 * 100%
  metrics.revenue.actualRevenueRate = revenueStats.totalRevenue > 0 
    ? parseFloat(((revenueStats.totalActualRevenue / revenueStats.totalRevenue) * 100).toFixed(2))
    : 0;
  
  // 出货报损率 = 出货报损金额 / 营业额 * 100%
  metrics.revenue.shipmentLossRate = revenueStats.totalRevenue > 0 && productionLossStats.byType.shipment
    ? parseFloat(((productionLossStats.byType.shipment.totalValue / revenueStats.totalRevenue) * 100).toFixed(2))
    : 0;
  
  // 营业额报损率 = 总报损金额 / 营业额 * 100%
  metrics.revenue.revenueLossRate = revenueStats.totalRevenue > 0 && productionLossStats.total
    ? parseFloat(((productionLossStats.total.totalValue / revenueStats.totalRevenue) * 100).toFixed(2))
    : 0;

  return metrics;
};

/**
 * 获取综合统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getStatistics = async (req, res) => {
  try {
    const { storeId, period = 'today' } = req.query;

    // 验证必填参数
    if (!storeId) {
      return ResponseHelper.error(res, '门店ID是必填参数', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    // 验证时间周期参数
    if (!['today', 'yesterday', 'week', 'lastWeek', 'month', 'lastMonth'].includes(period)) {
      return ResponseHelper.error(res, '无效的时间周期参数，支持：today, yesterday, week, lastWeek, month, lastMonth', 400);
    }

    // 获取日期范围
    const { startDate, endDate } = getDateRange(period);

    // 并行获取各项统计数据
    const [revenueStats, productionLossStats, inventoryStats] = await Promise.all([
      getRevenueStats(storeId, startDate, endDate),
      getProductionLossStats(storeId, startDate, endDate),
      getInventoryStats(storeId)
    ]);

    // 计算额外的业务指标
    const businessMetrics = calculateBusinessMetrics(revenueStats, productionLossStats);

    const statisticsData = {
      period,
      dateRange: {
        startDate,
        endDate
      },
      store: {
        id: store._id,
        name: store.name
      },
      revenue: {
        ...revenueStats,
        ...businessMetrics.revenue
      },
      productionLoss: {
        ...productionLossStats,
        ...businessMetrics.productionLoss
      },
      inventory: inventoryStats,
      generatedAt: new Date()
    };

    logger.info(`获取统计数据成功 - 门店: ${store.name}, 周期: ${period}`);
    return ResponseHelper.success(res, statisticsData, '获取统计数据成功');

  } catch (error) {
    logger.error('获取统计数据失败:', error);
    return ResponseHelper.error(res, '获取统计数据失败', 500);
  }
};

/**
 * 获取营业数据趋势
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getRevenueTrend = async (req, res) => {
  try {
    const { storeId, days = 7 } = req.query;

    if (!storeId) {
      return ResponseHelper.error(res, '门店ID是必填参数', 400);
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    // 确保storeId是ObjectId类型
    const objectIdStoreId = mongoose.Types.ObjectId.isValid(storeId) 
      ? new mongoose.Types.ObjectId(storeId) 
      : storeId;

    const pipeline = [
      {
        $match: {
          storeId: objectIdStoreId,
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          date: { $first: '$date' },
          actualRevenue: { $sum: '$actualRevenue' },
          totalRevenue: { $sum: '$totalRevenue' },
          orderCount: { $sum: '$orderCount' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ];

    const trendData = await Revenue.aggregate(pipeline);

    logger.info(`获取营业数据趋势成功 - 门店: ${store.name}, 天数: ${days}`);
    return ResponseHelper.success(res, {
      store: {
        id: store._id,
        name: store.name
      },
      days: parseInt(days),
      dateRange: {
        startDate,
        endDate
      },
      trendData
    }, '获取营业数据趋势成功');

  } catch (error) {
    logger.error('获取营业数据趋势失败:', error);
    return ResponseHelper.error(res, '获取营业数据趋势失败', 500);
  }
};

module.exports = {
  getStatistics,
  getRevenueTrend,
  getDateRange,
  getRevenueStats,
  getProductionLossStats,
  getInventoryStats,
  calculateBusinessMetrics
};
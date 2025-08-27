const mongoose = require('mongoose');
const Revenue = require('../models/Revenue');
const ProductionLoss = require('../models/ProductionLoss');
const StoreInventory = require('../models/StoreInventory');
const Store = require('../models/Store');
const Ingredient = require('../models/Ingredient');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const BreadType = require('../models/BreadType');
const DoughRecipe = require('../models/DoughRecipe');
const FillingRecipe = require('../models/FillingRecipe');
const TimezoneUtils = require('../utils/timezone');

/**
 * 获取日期范围的开始和结束时间（UTC格式）
 * @param {string} period - 时间周期：'today', 'yesterday', 'week', 'lastWeek', 'month', 'lastMonth'
 * @param {string} timezone - 时区，默认为 'Asia/Shanghai'
 * @returns {Object} 包含startDate和endDate的UTC时间对象
 */
const getDateRange = (period, timezone = 'Asia/Shanghai') => {
  const moment = require('moment-timezone');
  
  switch (period) {
    case 'today':
      const today = moment.tz(timezone).format('YYYY-MM-DD');
      const todayRange = TimezoneUtils.getDayRangeUTC(today, timezone);
      return { startDate: todayRange.startUTC, endDate: todayRange.endUTC };
    
    case 'yesterday':
      const yesterday = moment.tz(timezone).subtract(1, 'day').format('YYYY-MM-DD');
      const yesterdayRange = TimezoneUtils.getDayRangeUTC(yesterday, timezone);
      return { startDate: yesterdayRange.startUTC, endDate: yesterdayRange.endUTC };
    
    case 'week':
      const weekRange = TimezoneUtils.getPeriodRangeUTC('week', timezone);
      return { startDate: weekRange.startUTC, endDate: weekRange.endUTC };
    
    case 'lastWeek':
      const lastWeekRange = TimezoneUtils.getPeriodRangeUTC('lastWeek', timezone);
      return { startDate: lastWeekRange.startUTC, endDate: lastWeekRange.endUTC };
    
    case 'month':
      const monthRange = TimezoneUtils.getPeriodRangeUTC('month', timezone);
      return { startDate: monthRange.startUTC, endDate: monthRange.endUTC };
    
    case 'lastMonth':
      const lastMonthRange = TimezoneUtils.getPeriodRangeUTC('lastMonth', timezone);
      return { startDate: lastMonthRange.startUTC, endDate: lastMonthRange.endUTC };
    
    default:
      throw new Error('无效的时间周期参数');
  }
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

    // 并行获取营业数据和出货登记数据
    const [revenueResult, shipmentStats] = await Promise.all([
      Revenue.aggregate(pipeline),
      ProductionLoss.getStats(storeId, TimezoneUtils.utcToLocalDate(startDate), TimezoneUtils.utcToLocalDate(endDate), 'shipment')
    ]);
    
    // 获取出货登记金额
    // ProductionLoss.getStats返回数组，需要访问第一个元素的shipmentValue
    const totalShipmentValue = shipmentStats && shipmentStats.length > 0 ? (shipmentStats[0].shipmentValue || 0) : 0;
    
    if (revenueResult.length === 0) {
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
        recordCount: 0,
        totalShipmentValue: totalShipmentValue
      };
    }

    return {
      ...revenueResult[0],
      totalShipmentValue: totalShipmentValue
    };
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
    // 使用ProductionLoss模型的getStats方法获取完整统计数据
    const stringStoreId = storeId.toString();
    
    // 将UTC时间转换为北京时间的日期字符串，因为模型内部会重新转换为UTC
    const startDateStr = TimezoneUtils.utcToLocalDate(startDate, 'Asia/Shanghai', 'YYYY-MM-DD');
    const endDateStr = TimezoneUtils.utcToLocalDate(endDate, 'Asia/Shanghai', 'YYYY-MM-DD');
    
    // 调试：打印查询参数（可在生产环境中移除）
    // console.log('=== 报损数据查询调试 ===');
    // console.log('门店ID:', stringStoreId);
    // console.log('开始日期:', startDateStr);
    // console.log('结束日期:', endDateStr);
    // console.log('原始开始时间:', startDate);
    // console.log('原始结束时间:', endDate);
    
    const result = await ProductionLoss.getStats(stringStoreId, startDateStr, endDateStr);
    
    // console.log('查询结果:', result);
    // console.log('结果长度:', result ? result.length : 'null');
    
    if (!result || result.length === 0) {
      // 返回默认的空统计数据
      return {
        byType: {
          production: { totalQuantity: 0, totalValue: 0, recordCount: 0 },
          tasting: { totalQuantity: 0, totalValue: 0, recordCount: 0 },
          closing: { totalQuantity: 0, totalValue: 0, recordCount: 0 },
          other: { totalQuantity: 0, totalValue: 0, recordCount: 0 },
          shipment: { totalQuantity: 0, totalValue: 0, recordCount: 0 }
        },
        total: { totalQuantity: 0, totalValue: 0, totalLossValue: 0, recordCount: 0 },
        lossRate: 0,
        shipmentLossRate: 0
      };
    }

    const stats = result[0];
    
    // 按报损类型组织数据
    const byTypeStats = {
      production: { 
        totalQuantity: stats.productionLoss || 0, 
        totalValue: stats.productionValue || 0, 
        recordCount: 0 
      },
      tasting: { 
        totalQuantity: stats.tastingLoss || 0, 
        totalValue: stats.tastingValue || 0, 
        recordCount: 0 
      },
      closing: { 
        totalQuantity: stats.closingLoss || 0, 
        totalValue: stats.closingValue || 0, 
        recordCount: 0 
      },
      other: { 
        totalQuantity: stats.otherLoss || 0, 
        totalValue: stats.otherValue || 0, 
        recordCount: 0 
      },
      shipment: { 
        totalQuantity: stats.shipmentLoss || 0, 
        totalValue: stats.shipmentValue || 0, 
        recordCount: 0 
      }
    };

    return {
      byType: byTypeStats,
      total: {
        totalQuantity: stats.totalLoss || 0,
        totalValue: stats.totalValue || 0,
        totalLossValue: stats.totalLossValue || 0,
        recordCount: stats.recordCount || 0
      },
      lossRate: stats.lossRate || 0,
      shipmentLossRate: stats.shipmentLossRate || 0
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
  
  // 出货报损率 = 所有报损金额 / 出货登记金额 * 100% (使用ProductionLoss模型计算的结果)
  console.log('=== 后端出货报损率计算调试 ===');
  console.log('productionLossStats.shipmentLossRate:', productionLossStats.shipmentLossRate);
  console.log('productionLossStats:', JSON.stringify(productionLossStats, null, 2));
  
  metrics.revenue.shipmentLossRate = productionLossStats.shipmentLossRate 
    ? parseFloat((productionLossStats.shipmentLossRate * 100).toFixed(2))
    : 0;
    
  console.log('最终计算的出货报损率:', metrics.revenue.shipmentLossRate);
  console.log('================================');
  
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
    
    // 调试：打印日期范围计算结果
    // 调试日志（可在生产环境中移除）
    // console.log('=== 日期范围计算调试 ===');
    // console.log('时间周期:', period);
    // console.log('计算的开始时间:', startDate);
    // console.log('计算的结束时间:', endDate);
    // console.log('当前时间:', new Date());
    // console.log('========================');

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

/**
 * 获取毛利计算所需的基础数据
 * @param {string} storeId - 门店ID
 * @returns {Object} 包含面包类型、配方和原料数据
 */
const getGrossProfitBaseData = async (storeId) => {
  try {
    // 并行获取所有基础数据
    const [breadTypes, doughRecipes, fillingRecipes, ingredients] = await Promise.all([
      BreadType.find({}).lean(),
      DoughRecipe.find({}).lean(),
      FillingRecipe.find({}).lean(),
      Ingredient.find({}).lean()
    ]);

    // 转换为Map格式以提高查找效率
    const doughRecipesMap = new Map(doughRecipes.map(recipe => [recipe.id, recipe]));
    const fillingRecipesMap = new Map(fillingRecipes.map(recipe => [recipe.id, recipe]));
    const ingredientsMap = new Map(ingredients.map(ing => [ing.name, ing]));

    return {
      breadTypes,
      doughRecipesMap,
      fillingRecipesMap,
      ingredientsMap,
      ingredients
    };
  } catch (error) {
    logger.error('获取毛利计算基础数据失败:', error);
    throw error;
  }
};

/**
 * 计算毛利数据统计
 * @param {string} storeId - 门店ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Object} 毛利数据统计结果
 */
const getGrossProfitStats = async (storeId, startDate, endDate) => {
  try {
    // 获取基础数据
    const baseData = await getGrossProfitBaseData(storeId);
    const { breadTypes, doughRecipesMap, fillingRecipesMap, ingredientsMap } = baseData;

    // 获取营业数据
    const revenueStats = await getRevenueStats(storeId, startDate, endDate);
    
    // 获取生产报损数据
    const productionLossStats = await getProductionLossStats(storeId, startDate, endDate);

    // 获取出货登记数据（实际销售数量）
    const shipmentRecords = await ProductionLoss.find({
      storeId,
      type: 'shipment',
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).lean();

    // 计算毛利数据 - 使用实际销售数量
    const breadProfitAnalysis = [];
    const breadTypesMap = new Map(breadTypes.map(bread => [bread.id, bread]));
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    // 统计每种面包的实际销售数量
    const breadSalesMap = new Map();
    
    shipmentRecords.forEach(record => {
      record.items.forEach(item => {
        const key = item.productId;
        if (!breadSalesMap.has(key)) {
          breadSalesMap.set(key, {
            quantity: 0,
            revenue: 0,
            productName: item.productName
          });
        }
        const existing = breadSalesMap.get(key);
        existing.quantity += item.quantity;
        existing.revenue += item.totalValue;
      });
    });

    // 计算每种面包的成本（使用出货登记的实际销售数量）
    breadSalesMap.forEach((salesData, breadId) => {
      const bread = breadTypesMap.get(breadId);
      if (!bread) {
        logger.warn(`未找到面包类型: ${breadId}`);
        return;
      }

      try {
        const costBreakdown = calculateBreadCost(bread, doughRecipesMap, fillingRecipesMap, ingredientsMap);
        
        if (costBreakdown && costBreakdown.totalCost) {
          const unitCost = costBreakdown.totalCost;
          const unitPrice = bread.price;
          const quantity = salesData.quantity;
          const itemCost = unitCost * quantity;
          const itemRevenue = unitPrice * quantity; // 使用标准价格计算收入
          const itemProfit = itemRevenue - itemCost;
          const profitMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;

          totalCost += itemCost;

          breadProfitAnalysis.push({
            breadId: bread._id,
            breadName: bread.name,
            quantity: quantity,
            unitCost: parseFloat(unitCost.toFixed(2)),
            unitPrice: parseFloat(unitPrice.toFixed(2)),
            totalRevenue: parseFloat(itemRevenue.toFixed(2)),
            totalCost: parseFloat(itemCost.toFixed(2)),
            totalProfit: parseFloat(itemProfit.toFixed(2)),
            profitMargin: parseFloat(profitMargin.toFixed(2))
          });
        }
      } catch (error) {
        logger.warn(`计算面包 ${bread.name} 成本失败:`, error.message);
      }
    });

    // 使用营业数据作为总收入
    totalRevenue = revenueStats.totalRevenue || 0;
    totalProfit = totalRevenue - totalCost;

    // 如果没有出货登记数据，使用营业数据和平均成本率估算
    if (breadSalesMap.size === 0) {
      logger.info('未找到出货登记数据，使用营业数据估算毛利');
      totalRevenue = revenueStats.totalRevenue || 0;
      
      // 计算所有面包的平均成本率
      let totalUnitCost = 0;
      let totalUnitPrice = 0;
      let validBreadCount = 0;

      breadTypes.forEach(bread => {
        try {
          const costBreakdown = calculateBreadCost(bread, doughRecipesMap, fillingRecipesMap, ingredientsMap);
          
          if (costBreakdown && costBreakdown.totalCost && bread.price > 0) {
            totalUnitCost += costBreakdown.totalCost;
            totalUnitPrice += bread.price;
            validBreadCount++;
          }
        } catch (error) {
          logger.warn(`计算面包 ${bread.name} 成本失败:`, error.message);
        }
      });

      if (validBreadCount > 0 && totalUnitPrice > 0) {
        const avgCostRate = totalUnitCost / totalUnitPrice;
        totalCost = totalRevenue * avgCostRate;
        totalProfit = totalRevenue - totalCost;
      }
    }

    // 计算总体毛利指标
    const overallProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const costRatio = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    // 计算报损对毛利的影响（排除出货记录）
    const totalLossValue = productionLossStats.total.totalLossValue || 0;
    const adjustedProfit = totalProfit - totalLossValue;
    const adjustedProfitMargin = totalRevenue > 0 ? (adjustedProfit / totalRevenue) * 100 : 0;
    
    // 计算报损对毛利率的影响
    const profitMarginImpact = totalRevenue > 0 ? (totalLossValue / totalRevenue) * 100 : 0;

    return {
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        profitMargin: parseFloat(overallProfitMargin.toFixed(2)),
        costRatio: parseFloat(costRatio.toFixed(2)),
        totalLossValue: parseFloat(totalLossValue.toFixed(2)),
        adjustedProfit: parseFloat(adjustedProfit.toFixed(2)),
        adjustedProfitMargin: parseFloat(adjustedProfitMargin.toFixed(2))
      },
      breadAnalysis: breadProfitAnalysis,
      lossImpact: {
        productionLoss: productionLossStats.byType.production.totalValue || 0,
        tastingLoss: productionLossStats.byType.tasting.totalValue || 0,
        closingLoss: productionLossStats.byType.closing.totalValue || 0,
        otherLoss: productionLossStats.byType.other.totalValue || 0,
        shipmentLoss: productionLossStats.byType.shipment.totalValue || 0,
        totalLossValue: parseFloat(totalLossValue.toFixed(2)),
        profitMarginImpact: parseFloat(profitMarginImpact.toFixed(2))
      }
    };
  } catch (error) {
    logger.error('获取毛利数据统计失败:', error);
    throw error;
  }
};

/**
 * 简化版面包成本计算函数（基于前端逻辑）
 * @param {Object} bread - 面包数据
 * @param {Map} doughRecipesMap - 面团配方Map
 * @param {Map} fillingRecipesMap - 馅料配方Map
 * @param {Map} ingredientsMap - 原料Map
 * @returns {Object} 成本分解结果
 */
const calculateBreadCost = (bread, doughRecipesMap, fillingRecipesMap, ingredientsMap) => {
  try {
    let totalCost = 0;
    const breakdown = {
      doughCost: 0,
      fillingsCost: 0,
      decorationsCost: 0
    };

    // 计算面团成本
    if (bread.doughId && bread.doughWeight) {
      const doughRecipe = doughRecipesMap.get(bread.doughId);
      if (doughRecipe && doughRecipe.yield > 0) {
        const doughBatchCost = calculateDoughBatchCost(doughRecipe, doughRecipesMap, ingredientsMap);
        const costPerGram = doughBatchCost / doughRecipe.yield;
        breakdown.doughCost = costPerGram * bread.doughWeight;
        totalCost += breakdown.doughCost;
      }
    }

    // 计算馅料成本
    if (bread.fillings && Array.isArray(bread.fillings)) {
      bread.fillings.forEach(filling => {
        if (filling.fillingId && filling.quantity) {
          const fillingRecipe = fillingRecipesMap.get(filling.fillingId);
          if (fillingRecipe && fillingRecipe.yield > 0) {
            const fillingBatchCost = calculateFillingBatchCost(fillingRecipe, fillingRecipesMap, ingredientsMap);
            const costPerGram = fillingBatchCost / fillingRecipe.yield;
            const fillingCost = costPerGram * filling.quantity;
            breakdown.fillingsCost += fillingCost;
            totalCost += fillingCost;
          }
        }
      });
    }

    // 计算装饰成本
    if (bread.decorations && Array.isArray(bread.decorations)) {
      bread.decorations.forEach(decoration => {
        if (decoration.ingredientId && decoration.quantity) {
          const ingredient = ingredientsMap.get(decoration.ingredientId);
          if (ingredient && ingredient.price && ingredient.norms > 0) {
            const unitCost = ingredient.price / ingredient.norms;
            const decorationCost = unitCost * decoration.quantity;
            breakdown.decorationsCost += decorationCost;
            totalCost += decorationCost;
          }
        }
      });
    }

    return {
      totalCost,
      breakdown
    };
  } catch (error) {
    logger.warn('计算面包成本失败:', error.message);
    return { totalCost: 0, breakdown: { doughCost: 0, fillingsCost: 0, decorationsCost: 0 } };
  }
};

/**
 * 计算面团配方批次成本
 */
const calculateDoughBatchCost = (doughRecipe, doughRecipesMap, ingredientsMap) => {
  let batchCost = 0;

  // 计算主要原料成本
  if (doughRecipe.ingredients) {
    doughRecipe.ingredients.forEach(ingredient => {
      const ingredientData = ingredientsMap.get(ingredient.ingredientId);
      if (ingredientData && ingredientData.price && ingredientData.norms > 0) {
        const unitCost = ingredientData.price / ingredientData.norms;
        batchCost += unitCost * ingredient.quantity;
      }
    });
  }

  // 计算预发酵物成本
  if (doughRecipe.preFerments) {
    doughRecipe.preFerments.forEach(preFerment => {
      const preFermentRecipe = doughRecipesMap.get(preFerment.id);
      if (preFermentRecipe && preFermentRecipe.yield > 0) {
        const preFermentBatchCost = calculateDoughBatchCost(preFermentRecipe, doughRecipesMap, ingredientsMap);
        const costPerGram = preFermentBatchCost / preFermentRecipe.yield;
        batchCost += costPerGram * preFerment.quantity;
      }
    });
  }

  return batchCost;
};

/**
 * 计算馅料配方批次成本
 */
const calculateFillingBatchCost = (fillingRecipe, fillingRecipesMap, ingredientsMap) => {
  let batchCost = 0;

  // 计算主要原料成本
  if (fillingRecipe.ingredients) {
    fillingRecipe.ingredients.forEach(ingredient => {
      const ingredientData = ingredientsMap.get(ingredient.ingredientId);
      if (ingredientData && ingredientData.price && ingredientData.norms > 0) {
        const unitCost = ingredientData.price / ingredientData.norms;
        batchCost += unitCost * ingredient.quantity;
      }
    });
  }

  // 计算子馅料成本
  if (fillingRecipe.subFillings) {
    fillingRecipe.subFillings.forEach(subFilling => {
      const subFillingRecipe = fillingRecipesMap.get(subFilling.id);
      if (subFillingRecipe && subFillingRecipe.yield > 0) {
        const subFillingBatchCost = calculateFillingBatchCost(subFillingRecipe, fillingRecipesMap, ingredientsMap);
        const costPerGram = subFillingBatchCost / subFillingRecipe.yield;
        batchCost += costPerGram * subFilling.quantity;
      }
    });
  }

  return batchCost;
};

module.exports = {
  getStatistics,
  getRevenueTrend,
  getDateRange,
  getRevenueStats,
  getProductionLossStats,
  getInventoryStats,
  calculateBusinessMetrics,
  getGrossProfitStats,
  getGrossProfitBaseData
};
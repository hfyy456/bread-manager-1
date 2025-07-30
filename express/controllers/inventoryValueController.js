const Ingredient = require('../models/Ingredient');
const StoreInventory = require('../models/StoreInventory');
const { monitorDbQuery } = require('../middleware/performanceMiddleware');
const logger = require('../utils/logger');

/**
 * 获取门店库存价值统计
 * 包含主仓库存和岗位库存的详细分析
 */
const getStoreInventoryValue = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const storeId = req.header('x-current-store-id') || req.user?.currentStoreId;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        message: '请求头中缺少门店ID' 
      });
    }

    // 并行查询原料和库存数据
    const [ingredients, storeInventories] = await Promise.all([
      monitorDbQuery('find', 'ingredients', () => 
        Ingredient.find({})
          .select('name price unit _id')
          .lean()
      ),
      monitorDbQuery('find', 'storeInventories', () =>
        StoreInventory.find({ storeId })
          .select('ingredientId mainWarehouseStock stockByPost')
          .lean()
      )
    ]);

    // 创建库存映射以提高查找性能
    const inventoryMap = new Map(
      storeInventories.map(inv => [inv.ingredientId.toString(), inv])
    );

    // 统计数据
    let totalValue = 0;
    let mainWarehouseValue = 0;
    let postStockValue = 0;
    let itemsWithMainStock = 0;
    let itemsWithPostStock = 0;
    let totalMainQuantity = 0;
    let totalPostQuantity = 0;

    const itemDetails = [];

    ingredients.forEach(ingredient => {
      const price = parseFloat(ingredient.price) || 0;
      const inventory = inventoryMap.get(ingredient._id.toString());
      
      let mainStock = 0;
      let postStock = 0;
      let mainValue = 0;
      let postValue = 0;

      if (inventory) {
        // 主仓库存
        mainStock = inventory.mainWarehouseStock?.quantity || 0;
        mainValue = mainStock * price;
        mainWarehouseValue += mainValue;
        totalMainQuantity += mainStock;
        
        if (mainStock > 0) itemsWithMainStock++;

        // 岗位库存
        if (inventory.stockByPost && typeof inventory.stockByPost === 'object') {
          Object.values(inventory.stockByPost).forEach(stockEntry => {
            const quantity = parseFloat(stockEntry.quantity) || 0;
            postStock += quantity;
            totalPostQuantity += quantity;
          });
        }
        
        postValue = postStock * price;
        postStockValue += postValue;
        
        if (postStock > 0) itemsWithPostStock++;
      }

      const itemTotalValue = mainValue + postValue;
      totalValue += itemTotalValue;

      // 记录详细信息（只记录有库存或价值的物料）
      if (itemTotalValue > 0 || mainStock > 0 || postStock > 0) {
        itemDetails.push({
          ingredientId: ingredient._id,
          name: ingredient.name,
          unit: ingredient.unit,
          price,
          mainStock,
          postStock,
          totalStock: mainStock + postStock,
          mainValue,
          postValue,
          totalValue: itemTotalValue
        });
      }
    });

    // 计算百分比
    const mainPercentage = totalValue > 0 ? (mainWarehouseValue / totalValue * 100) : 0;
    const postPercentage = totalValue > 0 ? (postStockValue / totalValue * 100) : 0;

    const duration = Date.now() - startTime;
    
    // 记录性能日志
    logger.performance('Inventory Value Calculation', duration, {
      storeId,
      ingredientCount: ingredients.length,
      inventoryCount: storeInventories.length,
      totalValue: totalValue.toFixed(2)
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalValue: parseFloat(totalValue.toFixed(2)),
          mainWarehouseValue: parseFloat(mainWarehouseValue.toFixed(2)),
          postStockValue: parseFloat(postStockValue.toFixed(2)),
          mainPercentage: parseFloat(mainPercentage.toFixed(2)),
          postPercentage: parseFloat(postPercentage.toFixed(2))
        },
        quantities: {
          totalMainQuantity: parseFloat(totalMainQuantity.toFixed(2)),
          totalPostQuantity: parseFloat(totalPostQuantity.toFixed(2)),
          totalQuantity: parseFloat((totalMainQuantity + totalPostQuantity).toFixed(2))
        },
        counts: {
          totalIngredients: ingredients.length,
          itemsWithMainStock,
          itemsWithPostStock,
          itemsWithAnyStock: itemsWithMainStock + itemsWithPostStock
        },
        items: itemDetails.sort((a, b) => b.totalValue - a.totalValue), // 按价值排序
        meta: {
          storeId,
          timestamp: new Date().toISOString(),
          duration: `${duration}ms`
        }
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error calculating inventory value', error, {
      storeId: req.header('x-current-store-id'),
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      success: false,
      message: '计算库存价值失败',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 获取库存价值趋势数据
 * 用于图表展示
 */
const getInventoryValueTrend = async (req, res) => {
  try {
    const storeId = req.header('x-current-store-id') || req.user?.currentStoreId;
    const { days = 7 } = req.query;
    
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        message: '请求头中缺少门店ID' 
      });
    }

    // 这里可以实现历史趋势查询
    // 目前返回当前值作为示例
    const currentValueResponse = await getStoreInventoryValue(req, res);
    
    // 模拟趋势数据
    const trendData = [];
    const currentValue = currentValueResponse?.data?.summary?.totalValue || 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // 模拟一些变化
      const variation = (Math.random() - 0.5) * 0.1; // ±5% 变化
      const value = currentValue * (1 + variation);
      
      trendData.push({
        date: date.toISOString().split('T')[0],
        totalValue: parseFloat(value.toFixed(2)),
        mainWarehouseValue: parseFloat((value * 0.7).toFixed(2)),
        postStockValue: parseFloat((value * 0.3).toFixed(2))
      });
    }

    res.json({
      success: true,
      data: {
        trend: trendData,
        period: `${days}天`,
        storeId
      }
    });

  } catch (error) {
    logger.error('Error getting inventory value trend', error);
    res.status(500).json({
      success: false,
      message: '获取库存价值趋势失败'
    });
  }
};

module.exports = {
  getStoreInventoryValue,
  getInventoryValueTrend
};
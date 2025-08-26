const ProductionLoss = require('../models/ProductionLoss');
const BreadType = require('../models/BreadType');
const Store = require('../models/Store');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * 创建或更新生产报损记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createOrUpdateProductionLoss = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { type, date, items, totalQuantity, totalValue, operatedBy, notes } = req.body;

    // 验证必填字段
    if (!type || !date || !items || !Array.isArray(items) || items.length === 0) {
      return ResponseHelper.error(res, '报损类型、日期和报损项目是必填参数', 400);
    }

    // 验证报损类型
    const validTypes = ['production', 'tasting', 'closing', 'other', 'shipment'];
    if (!validTypes.includes(type)) {
      return ResponseHelper.error(res, '无效的报损类型', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    // 验证报损项目数据
    for (const item of items) {
      if (!item.productId || !item.productName || typeof item.quantity !== 'number' || 
          typeof item.unitPrice !== 'number' || typeof item.totalValue !== 'number') {
        return ResponseHelper.error(res, '报损项目数据格式不正确', 400);
      }
      
      if (item.quantity <= 0 || item.unitPrice < 0 || item.totalValue < 0) {
        return ResponseHelper.error(res, '报损数量必须大于0，价格不能为负数', 400);
      }
    }

    // 计算总计（验证前端计算是否正确）
    const calculatedQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const calculatedValue = items.reduce((sum, item) => sum + item.totalValue, 0);

    const lossData = {
      items,
      totalQuantity: calculatedQuantity,
      totalValue: calculatedValue,
      operatedBy,
      notes
    };

    // 创建或更新报损记录
    const result = await ProductionLoss.createOrUpdate(storeId, date, type, lossData);

    logger.info(`生产报损记录${result.isNew ? '创建' : '更新'}成功: 门店 ${storeId}, 类型 ${type}, 日期 ${date}`);
    
    return ResponseHelper.success(res, result, `报损记录${result.isNew ? '创建' : '更新'}成功`);
  } catch (error) {
    logger.error('创建/更新生产报损记录失败:', error);
    return ResponseHelper.error(res, '创建/更新报损记录失败', 500, error.message);
  }
};

/**
 * 获取指定日期的生产报损记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getProductionLossByDate = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { date, type } = req.query;
    
    if (!date) {
      return ResponseHelper.error(res, '日期参数是必填的', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    const result = await ProductionLoss.getByDate(storeId, date, type);
    
    if (!result) {
      // 如果没有记录，返回空的结构
      const emptyRecord = {
        storeId,
        date: new Date(date),
        type: type || 'production',
        items: [],
        totalQuantity: 0,
        totalValue: 0
      };
      return ResponseHelper.success(res, emptyRecord, '暂无报损记录');
    }

    return ResponseHelper.success(res, result, '获取报损记录成功');
  } catch (error) {
    logger.error('获取生产报损记录失败:', error);
    return ResponseHelper.error(res, '获取报损记录失败', 500, error.message);
  }
};

/**
 * 获取生产报损统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getProductionLossStats = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { startDate, endDate, type } = req.query;
    
    if (!startDate || !endDate) {
      return ResponseHelper.error(res, '开始日期和结束日期是必填参数', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    const stats = await ProductionLoss.getStats(storeId, startDate, endDate, type);
    
    const result = stats[0] || {
      totalLoss: 0,
      totalValue: 0,
      productionLoss: 0,
      tastingLoss: 0,
      closingLoss: 0,
      otherLoss: 0,
      shipmentLoss: 0,
      productionValue: 0,
      tastingValue: 0,
      closingValue: 0,
      otherValue: 0,
      shipmentValue: 0,
      totalLossValue: 0,
      recordCount: 0,
      lossRate: 0
    };

    logger.info(`获取门店 ${storeId} 报损统计成功，时间范围: ${startDate} - ${endDate}`);
    return ResponseHelper.success(res, result, '获取报损统计成功');
  } catch (error) {
    logger.error('获取生产报损统计失败:', error);
    return ResponseHelper.error(res, '获取报损统计失败', 500, error.message);
  }
};

/**
 * 获取生产报损记录列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getProductionLossRecords = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { startDate, endDate, type, page = 1, limit = 20 } = req.query;
    
    if (!startDate || !endDate) {
      return ResponseHelper.error(res, '开始日期和结束日期是必填参数', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    const options = {
      startDate,
      endDate,
      type,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const records = await ProductionLoss.getRecords(storeId, options);
    
    logger.info(`获取门店 ${storeId} 报损记录列表成功，共 ${records.length} 条记录`);
    return ResponseHelper.success(res, records, '获取报损记录列表成功');
  } catch (error) {
    logger.error('获取生产报损记录列表失败:', error);
    return ResponseHelper.error(res, '获取报损记录列表失败', 500, error.message);
  }
};

/**
 * 删除生产报损记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteProductionLoss = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { id } = req.params;
    
    if (!id) {
      return ResponseHelper.error(res, '报损记录ID是必填参数', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    // 查找并删除报损记录
    const result = await ProductionLoss.findOneAndDelete({ _id: id, storeId });
    
    if (!result) {
      return ResponseHelper.notFound(res, '报损记录');
    }

    logger.info(`删除生产报损记录成功: 门店 ${storeId}, 记录ID ${id}`);
    return ResponseHelper.success(res, { deletedId: id }, '删除报损记录成功');
  } catch (error) {
    logger.error('删除生产报损记录失败:', error);
    return ResponseHelper.error(res, '删除报损记录失败', 500, error.message);
  }
};

/**
 * 获取门店上架产品列表（用于报损页面选择产品）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getActiveProducts = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    // 获取门店上架的产品（按排序顺序）
    const StoreProduct = require('../models/StoreProduct');
    const activeStoreProducts = await StoreProduct.find({ storeId, isActive: true })
      .select('breadTypeId sortOrder')
      .sort({ sortOrder: 1, activatedAt: -1 })
      .lean();

    if (activeStoreProducts.length === 0) {
      return ResponseHelper.success(res, [], '该门店暂无上架产品');
    }

    // 获取对应的面包类型信息
    const breadTypeIds = activeStoreProducts.map(sp => sp.breadTypeId);
    const breadTypes = await BreadType.find({ id: { $in: breadTypeIds } })
      .select('id name description price category unit')
      .lean();

    // 创建面包类型映射
    const breadTypeMap = {};
    breadTypes.forEach(bt => {
      breadTypeMap[bt.id] = bt;
    });

    // 按排序顺序转换数据格式
    const products = activeStoreProducts
      .map(sp => {
        const bt = breadTypeMap[sp.breadTypeId];
        if (!bt) return null;
        return {
          _id: bt.id,
          name: bt.name,
          description: bt.description,
          price: bt.price,
          category: bt.category,
          unit: bt.unit || '个',
          sortOrder: sp.sortOrder || 0
        };
      })
      .filter(product => product !== null);

    logger.info(`获取门店 ${storeId} 上架产品列表成功，共 ${products.length} 个产品`);
    return ResponseHelper.success(res, products, '获取上架产品列表成功');
  } catch (error) {
    logger.error('获取上架产品列表失败:', error);
    return ResponseHelper.error(res, '获取上架产品列表失败', 500, error.message);
  }
};

module.exports = {
  createOrUpdateProductionLoss,
  getProductionLossByDate,
  getProductionLossStats,
  getProductionLossRecords,
  deleteProductionLoss,
  getActiveProducts
};
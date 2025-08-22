const StoreProduct = require('../models/StoreProduct');
const BreadType = require('../models/BreadType');
const Store = require('../models/Store');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * 获取所有面包类型（用于产品管理页面）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getAllBreadTypes = async (req, res) => {
  try {
    const breadTypes = await BreadType.find({})
      .select('id name description price')
      .sort({ name: 1 });
    
    logger.info(`获取面包类型列表成功，共 ${breadTypes.length} 个产品`);
    return ResponseHelper.success(res, breadTypes, '获取面包类型列表成功');
  } catch (error) {
    logger.error('获取面包类型列表失败:', error);
    return ResponseHelper.error(res, '获取面包类型列表失败', 500, error.message);
  }
};

/**
 * 获取门店产品列表（包含上下架状态）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getStoreProducts = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status } = req.query; // 'active', 'inactive', 'all'
    
    if (!storeId) {
      return ResponseHelper.error(res, '门店ID是必填参数', 400);
    }

    // 验证门店是否存在
    const store = await Store.findOne({ _id: storeId });
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    let query = { storeId };
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // 获取门店产品状态
    const storeProducts = await StoreProduct.find(query)
      .sort({ updatedAt: -1 });

    // 获取所有面包类型
    const allBreadTypes = await BreadType.find({})
      .select('id name description price');

    // 创建产品状态映射
    const productStatusMap = {};
    storeProducts.forEach(sp => {
      productStatusMap[sp.breadTypeId] = {
        isActive: sp.isActive,
        activatedAt: sp.activatedAt,
        deactivatedAt: sp.deactivatedAt,
        operatedBy: sp.operatedBy,
        notes: sp.notes,
        updatedAt: sp.updatedAt
      };
    });

    // 合并数据
    const result = allBreadTypes.map(breadType => ({
      breadTypeId: breadType.id,
      name: breadType.name,
      description: breadType.description,
      price: breadType.price,
      storeStatus: productStatusMap[breadType.id] || {
        isActive: false,
        activatedAt: null,
        deactivatedAt: null,
        operatedBy: null,
        notes: null,
        updatedAt: null
      }
    }));

    // 根据状态过滤结果
    let filteredResult = result;
    if (status === 'active') {
      filteredResult = result.filter(item => item.storeStatus.isActive);
    } else if (status === 'inactive') {
      filteredResult = result.filter(item => !item.storeStatus.isActive);
    }

    logger.info(`获取门店 ${storeId} 产品列表成功，状态筛选: ${status || 'all'}，共 ${filteredResult.length} 个产品`);
    return ResponseHelper.success(res, {
      storeId,
      storeName: store.name,
      products: filteredResult,
      total: filteredResult.length
    }, '获取门店产品列表成功');
  } catch (error) {
    logger.error('获取门店产品列表失败:', error);
    return ResponseHelper.error(res, '获取门店产品列表失败', 500, error.message);
  }
};

/**
 * 更新产品上下架状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateProductStatus = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { breadTypeId, isActive, operatedBy, notes } = req.body;
    
    if (!storeId || !breadTypeId || typeof isActive !== 'boolean') {
      return ResponseHelper.error(res, '门店ID、产品ID和状态是必填参数', 400);
    }

    // 验证门店是否存在
    const store = await Store.findOne({ _id: storeId });
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    // 验证面包类型是否存在
    const breadType = await BreadType.findOne({ id: breadTypeId });
    if (!breadType) {
      return ResponseHelper.notFound(res, '产品');
    }

    let result;
    if (isActive) {
      result = await StoreProduct.activateProduct(storeId, breadTypeId, operatedBy, notes);
      logger.info(`产品上架成功: 门店 ${storeId}, 产品 ${breadTypeId}, 操作人 ${operatedBy}`);
    } else {
      result = await StoreProduct.deactivateProduct(storeId, breadTypeId, operatedBy, notes);
      logger.info(`产品下架成功: 门店 ${storeId}, 产品 ${breadTypeId}, 操作人 ${operatedBy}`);
    }

    return ResponseHelper.success(res, {
      storeId,
      breadTypeId,
      breadTypeName: breadType.name,
      isActive,
      operatedBy,
      notes,
      updatedAt: result.updatedAt
    }, `产品${isActive ? '上架' : '下架'}成功`);
  } catch (error) {
    logger.error('更新产品状态失败:', error);
    return ResponseHelper.error(res, '更新产品状态失败', 500, error.message);
  }
};

/**
 * 批量更新产品状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const batchUpdateProductStatus = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { operations, operatedBy } = req.body;
    
    if (!storeId || !Array.isArray(operations) || operations.length === 0) {
      return ResponseHelper.error(res, '门店ID和操作列表是必填参数', 400);
    }

    // 验证门店是否存在
    const store = await Store.findOne({ _id: storeId });
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    // 验证操作数据格式
    for (const operation of operations) {
      if (!operation.breadTypeId || typeof operation.isActive !== 'boolean') {
        return ResponseHelper.error(res, '操作数据格式不正确', 400);
      }
    }

    // 添加操作人信息
    const operationsWithOperator = operations.map(op => ({
      ...op,
      operatedBy: operatedBy || op.operatedBy
    }));

    const results = await StoreProduct.batchUpdateProducts(storeId, operationsWithOperator);
    
    const successCount = results.length;
    const activeCount = results.filter(r => r.isActive).length;
    const inactiveCount = results.filter(r => !r.isActive).length;

    logger.info(`批量更新产品状态成功: 门店 ${storeId}, 共 ${successCount} 个产品, 上架 ${activeCount} 个, 下架 ${inactiveCount} 个`);
    
    return ResponseHelper.success(res, {
      storeId,
      storeName: store.name,
      totalOperations: successCount,
      activeCount,
      inactiveCount,
      results
    }, '批量更新产品状态成功');
  } catch (error) {
    logger.error('批量更新产品状态失败:', error);
    return ResponseHelper.error(res, '批量更新产品状态失败', 500, error.message);
  }
};

/**
 * 获取产品操作历史
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getProductHistory = async (req, res) => {
  try {
    const { storeId, breadTypeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    if (!storeId || !breadTypeId) {
      return ResponseHelper.error(res, '门店ID和产品ID是必填参数', 400);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 这里可以扩展为记录所有历史操作，目前只返回当前状态
    const currentStatus = await StoreProduct.findOne({ storeId, breadTypeId });
    const breadType = await BreadType.findOne({ id: breadTypeId }).select('name description price');
    
    if (!breadType) {
      return ResponseHelper.notFound(res, '产品');
    }

    const history = currentStatus ? [{
      operation: currentStatus.isActive ? '上架' : '下架',
      operatedAt: currentStatus.isActive ? currentStatus.activatedAt : currentStatus.deactivatedAt,
      operatedBy: currentStatus.operatedBy,
      notes: currentStatus.notes,
      isActive: currentStatus.isActive
    }] : [];

    return ResponseHelper.success(res, {
      storeId,
      breadTypeId,
      breadTypeName: breadType.name,
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: history.length
      }
    }, '获取产品操作历史成功');
  } catch (error) {
    logger.error('获取产品操作历史失败:', error);
    return ResponseHelper.error(res, '获取产品操作历史失败', 500, error.message);
  }
};

module.exports = {
  getAllBreadTypes,
  getStoreProducts,
  updateProductStatus,
  batchUpdateProductStatus,
  getProductHistory
};
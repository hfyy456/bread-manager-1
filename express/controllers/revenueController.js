const Revenue = require('../models/Revenue');
const Store = require('../models/Store');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * 注册营业数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const registerRevenue = async (req, res) => {
  try {
    const {
      storeId,
      date,
      actualRevenue,
      totalRevenue,
      avgOrderValue,
      orderCount,
      meituanRevenue = 0,
      douyinRevenue = 0,
      cashRevenue = 0,
      cardRevenue = 0,
      wechatRevenue = 0,
      alipayRevenue = 0,

      submittedBy
    } = req.body;

    // 验证必填字段
    if (!storeId || !date || actualRevenue === undefined || totalRevenue === undefined || 
        avgOrderValue === undefined || orderCount === undefined || !submittedBy) {
      return ResponseHelper.error(res, '缺少必填字段', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    // 验证数据合理性
    if (actualRevenue < 0 || totalRevenue < 0 || avgOrderValue < 0 || orderCount < 0) {
      return ResponseHelper.error(res, '营业数据不能为负数', 400);
    }

    // 自动计算实收金额（收入明细总和）
    const calculatedActualRevenue = meituanRevenue + douyinRevenue + cashRevenue + cardRevenue + wechatRevenue + alipayRevenue;
    
    // 使用计算出的实收金额
    const finalActualRevenue = calculatedActualRevenue;

    // 验证客单价计算
    if (orderCount > 0) {
      const calculatedAvgOrderValue = totalRevenue / orderCount;
      if (Math.abs(calculatedAvgOrderValue - avgOrderValue) > 0.01) {
        return ResponseHelper.error(res, '客单价计算不正确', 400);
      }
    }

    // 检查是否已存在当天的营业数据
    const existingRevenue = await Revenue.findByStoreAndDate(storeId, date);
    
    let result;
    if (existingRevenue) {
      // 更新现有记录
      result = await existingRevenue.updateRevenue({
        actualRevenue: finalActualRevenue,
        totalRevenue,
        avgOrderValue,
        orderCount,
        meituanRevenue,
        douyinRevenue,
        cashRevenue,
        cardRevenue,
        wechatRevenue,
        alipayRevenue,

        submittedBy,
        submittedAt: new Date()
      });
      
      logger.info(`营业数据更新成功: 门店 ${storeId}, 日期 ${date}, 操作人 ${submittedBy}`);
    } else {
      // 创建新记录
      // 确保日期使用本地时间而不是UTC时间
      const localDate = new Date(date + 'T00:00:00');
      const revenueData = new Revenue({
        storeId,
        date: localDate,
        actualRevenue: finalActualRevenue,
        totalRevenue,
        avgOrderValue,
        orderCount,
        meituanRevenue,
        douyinRevenue,
        cashRevenue,
        cardRevenue,
        wechatRevenue,
        alipayRevenue,

        submittedBy,
        submittedAt: new Date()
      });
      
      result = await revenueData.save();
      
      logger.info(`营业数据创建成功: 门店 ${storeId}, 日期 ${date}, 操作人 ${submittedBy}`);
    }

    return ResponseHelper.success(res, {
      id: result._id,
      storeId: result.storeId,
      storeName: store.name,
      date: result.date,
      actualRevenue: result.actualRevenue,
      totalRevenue: result.totalRevenue,
      avgOrderValue: result.avgOrderValue,
      orderCount: result.orderCount,
      meituanRevenue: result.meituanRevenue,
      douyinRevenue: result.douyinRevenue,
      cashRevenue: result.cashRevenue,
      cardRevenue: result.cardRevenue,
      notes: result.notes,
      submittedBy: result.submittedBy,
      submittedAt: result.submittedAt,
      isUpdate: !!existingRevenue
    }, existingRevenue ? '营业数据更新成功' : '营业数据提交成功');

  } catch (error) {
    logger.error('营业数据注册失败:', error);
    
    // 处理唯一索引冲突错误
    if (error.code === 11000) {
      return ResponseHelper.error(res, '该门店当天的营业数据已存在', 409);
    }
    
    // 处理验证错误
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return ResponseHelper.validationError(res, validationErrors);
    }
    
    return ResponseHelper.error(res, '营业数据注册失败', 500, error.message);
  }
};

/**
 * 获取营业数据列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getRevenueList = async (req, res) => {
  try {
    const { storeId, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    if (!storeId) {
      return ResponseHelper.error(res, '门店ID是必填参数', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = { storeId };
    
    // 添加日期范围过滤
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // 获取总数
    const total = await Revenue.countDocuments(query);
    
    // 获取数据
    const revenues = await Revenue.find(query)
      .populate('storeId', 'name address')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 计算统计数据
    const stats = {
      totalRevenue: revenues.reduce((sum, item) => sum + item.totalRevenue, 0),
      totalActualRevenue: revenues.reduce((sum, item) => sum + item.actualRevenue, 0),
      totalOrders: revenues.reduce((sum, item) => sum + item.orderCount, 0),
      avgOrderValue: revenues.length > 0 ? 
        revenues.reduce((sum, item) => sum + item.avgOrderValue, 0) / revenues.length : 0
    };

    logger.info(`获取营业数据列表成功: 门店 ${storeId}, 共 ${revenues.length} 条记录`);
    
    return ResponseHelper.paginated(res, revenues, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      stats
    }, '获取营业数据列表成功');

  } catch (error) {
    logger.error('获取营业数据列表失败:', error);
    return ResponseHelper.error(res, '获取营业数据列表失败', 500, error.message);
  }
};

/**
 * 获取单条营业数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getRevenueById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const revenue = await Revenue.findById(id).populate('storeId', 'name address');
    
    if (!revenue) {
      return ResponseHelper.notFound(res, '营业数据');
    }

    logger.info(`获取营业数据详情成功: ID ${id}`);
    
    return ResponseHelper.success(res, revenue, '获取营业数据详情成功');

  } catch (error) {
    logger.error('获取营业数据详情失败:', error);
    return ResponseHelper.error(res, '获取营业数据详情失败', 500, error.message);
  }
};

/**
 * 根据门店和日期获取营业数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getRevenueByStoreAndDate = async (req, res) => {
  try {
    const { storeId, date } = req.params;
    
    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    const revenue = await Revenue.findByStoreAndDate(storeId, date);
    
    if (!revenue) {
      return ResponseHelper.notFound(res, '营业数据');
    }

    logger.info(`获取营业数据成功: 门店 ${storeId}, 日期 ${date}`);
    
    return ResponseHelper.success(res, revenue, '获取营业数据成功');

  } catch (error) {
    logger.error('获取营业数据失败:', error);
    return ResponseHelper.error(res, '获取营业数据失败', 500, error.message);
  }
};

/**
 * 删除营业数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    
    const revenue = await Revenue.findById(id);
    
    if (!revenue) {
      return ResponseHelper.notFound(res, '营业数据');
    }

    await Revenue.findByIdAndDelete(id);

    logger.info(`营业数据删除成功: ID ${id}`);
    
    return ResponseHelper.success(res, null, '营业数据删除成功');

  } catch (error) {
    logger.error('删除营业数据失败:', error);
    return ResponseHelper.error(res, '删除营业数据失败', 500, error.message);
  }
};

module.exports = {
  registerRevenue,
  getRevenueList,
  getRevenueById,
  getRevenueByStoreAndDate,
  deleteRevenue
};
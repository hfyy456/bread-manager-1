const ProductionPlan = require('../models/ProductionPlan');
const BreadType = require('../models/BreadType');

// 创建或更新生产计划
const createOrUpdateProductionPlan = async (req, res) => {
  try {
    const storeId = req.currentStoreId;
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        message: '请求头中缺少门店ID' 
      });
    }

    const { date, weekday, weather, estimateData, items, totals } = req.body;

    if (!date || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的生产计划数据'
      });
    }

    // 验证面包ID是否存在
    const breadIds = items.map(item => item.breadId).filter(Boolean);
    const existingBreads = await BreadType.find({ _id: { $in: breadIds } });
    const existingBreadIds = existingBreads.map(bread => bread._id.toString());

    const invalidItems = items.filter(item => 
      item.breadId && !existingBreadIds.includes(item.breadId)
    );

    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: '存在无效的面包ID',
        invalidItems: invalidItems.map(item => item.breadId)
      });
    }

    // 查找是否已存在该日期的生产计划
    const existingPlan = await ProductionPlan.findOne({
      storeId,
      date: new Date(date)
    });

    let productionPlan;

    if (existingPlan) {
      // 更新现有计划
      existingPlan.weekday = weekday;
      existingPlan.weather = weather;
      existingPlan.estimateData = estimateData;
      existingPlan.items = items;
      existingPlan.updatedBy = req.user?.name || 'system';
      
      productionPlan = await existingPlan.save();
    } else {
      // 创建新计划
      productionPlan = new ProductionPlan({
        storeId,
        date: new Date(date),
        weekday,
        weather,
        estimateData,
        items,
        createdBy: req.user?.name || 'system',
        updatedBy: req.user?.name || 'system'
      });

      productionPlan = await productionPlan.save();
    }

    // 填充面包信息
    await productionPlan.populate('items.breadId', 'name price');

    res.json({
      success: true,
      message: existingPlan ? '生产计划更新成功' : '生产计划创建成功',
      data: productionPlan
    });

  } catch (error) {
    console.error('创建/更新生产计划失败:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '该日期已存在生产计划，请选择其他日期或更新现有计划'
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 获取生产计划列表
const getProductionPlans = async (req, res) => {
  try {
    const storeId = req.currentStoreId;
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        message: '请求头中缺少门店ID' 
      });
    }

    const { 
      startDate, 
      endDate, 
      status, 
      page = 1, 
      limit = 20 
    } = req.query;

    // 构建查询条件
    const query = { storeId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (status) {
      query.status = status;
    }

    // 分页参数
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 查询生产计划
    const [plans, total] = await Promise.all([
      ProductionPlan.find(query)
        .populate('items.breadId', 'name price')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ProductionPlan.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: plans,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('获取生产计划列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 获取单个生产计划
const getProductionPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.currentStoreId;

    const plan = await ProductionPlan.findOne({ _id: id, storeId })
      .populate('items.breadId', 'name price')
      .lean();

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的生产计划'
      });
    }

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('获取生产计划详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 根据日期获取生产计划
const getProductionPlanByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const storeId = req.currentStoreId;

    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        message: '请求头中缺少门店ID' 
      });
    }

    const plan = await ProductionPlan.findOne({ 
      storeId, 
      date: new Date(date) 
    })
      .populate('items.breadId', 'name price')
      .lean();

    if (!plan) {
      return res.json({
        success: true,
        data: null,
        message: '该日期暂无生产计划'
      });
    }

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('根据日期获取生产计划失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 删除生产计划
const deleteProductionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.currentStoreId;

    const plan = await ProductionPlan.findOneAndDelete({ _id: id, storeId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的生产计划'
      });
    }

    res.json({
      success: true,
      message: '生产计划删除成功'
    });

  } catch (error) {
    console.error('删除生产计划失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 获取生产统计
const getProductionStats = async (req, res) => {
  try {
    const storeId = req.currentStoreId;
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        message: '请求头中缺少门店ID' 
      });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期和结束日期'
      });
    }

    const stats = await ProductionPlan.getProductionStats(storeId, startDate, endDate);

    res.json({
      success: true,
      data: stats[0] || {
        totalPlans: 0,
        totalQuantity: 0,
        totalProductionAmount: 0,
        totalWasteAmount: 0,
        avgDailyQuantity: 0,
        avgDailyAmount: 0
      }
    });

  } catch (error) {
    console.error('获取生产统计失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 切换生产计划锁定状态
const toggleProductionPlanLock = async (req, res) => {
  try {
    const { id } = req.params;
    const { isLocked } = req.body;
    const storeId = req.currentStoreId;

    if (typeof isLocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '锁定状态必须是布尔值'
      });
    }

    const plan = await ProductionPlan.findOne({ _id: id, storeId });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的生产计划'
      });
    }

    plan.isLocked = isLocked;
    plan.updatedBy = req.user?.name || 'system';
    await plan.save();

    res.json({
      success: true,
      message: isLocked ? '生产计划已锁定' : '生产计划已解锁',
      data: { isLocked: plan.isLocked }
    });

  } catch (error) {
    console.error('切换锁定状态失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 复制生产计划
const copyProductionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetDate } = req.body;
    const storeId = req.currentStoreId;

    if (!targetDate) {
      return res.status(400).json({
        success: false,
        message: '请提供目标日期'
      });
    }

    // 获取源计划
    const sourcePlan = await ProductionPlan.findOne({ _id: id, storeId });
    if (!sourcePlan) {
      return res.status(404).json({
        success: false,
        message: '未找到源生产计划'
      });
    }

    // 检查目标日期是否已存在计划
    const existingPlan = await ProductionPlan.findOne({
      storeId,
      date: new Date(targetDate)
    });

    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: '目标日期已存在生产计划'
      });
    }

    // 创建新计划
    const targetDateObj = new Date(targetDate);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[targetDateObj.getDay()];

    const newPlan = new ProductionPlan({
      storeId,
      date: targetDateObj,
      weekday,
      weather: sourcePlan.weather,
      estimateData: sourcePlan.estimateData ? { ...sourcePlan.estimateData } : {
        productionWaste: 0,
        tastingWaste: 0,
        customerCount: 0,
        customerPrice: 0
      },
      items: sourcePlan.items.map(item => ({
        breadId: item.breadId,
        breadName: item.breadName,
        price: item.price,
        timeSlots: item.timeSlots,
        totalQuantity: item.totalQuantity
      })),
      createdBy: req.user?.name || 'system',
      updatedBy: req.user?.name || 'system'
    });

    await newPlan.save();
    await newPlan.populate('items.breadId', 'name price');

    res.json({
      success: true,
      message: '生产计划复制成功',
      data: newPlan
    });

  } catch (error) {
    console.error('复制生产计划失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

module.exports = {
  createOrUpdateProductionPlan,
  getProductionPlans,
  getProductionPlanById,
  getProductionPlanByDate,
  deleteProductionPlan,
  getProductionStats,
  toggleProductionPlanLock,
  copyProductionPlan
};
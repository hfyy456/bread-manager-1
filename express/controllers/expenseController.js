const Expense = require('../models/Expense');
const Store = require('../models/Store');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * 创建支出记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createExpense = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { type, date, amount, description, notes, operatedBy, category } = req.body;

    // 验证必填字段
    if (!date || typeof amount !== 'number' || !description || !operatedBy) {
      return ResponseHelper.error(res, '日期、金额、描述和提交人是必填参数', 400);
    }

    // 验证支出类型
    const validTypes = ['operational', 'maintenance', 'purchase', 'other'];
    if (type && !validTypes.includes(type)) {
      return ResponseHelper.error(res, '无效的支出类型', 400);
    }

    // 验证金额
    if (amount <= 0) {
      return ResponseHelper.error(res, '支出金额必须大于0', 400);
    }

    // 验证门店是否存在
    const store = await Store.findById(storeId);
    if (!store) {
      return ResponseHelper.notFound(res, '门店');
    }

    // 创建支出记录
    const expenseData = {
      storeId,
      type: type || 'operational',
      date: new Date(date),
      amount,
      description: description.trim(),
      notes: notes ? notes.trim() : '',
      operatedBy: operatedBy.trim(),
      category: category ? category.trim() : ''
    };

    const expense = await Expense.createExpense(expenseData);

    logger.info(`支出记录创建成功`, {
      expenseId: expense._id,
      storeId,
      amount,
      type: expense.type,
      operatedBy
    });

    return ResponseHelper.success(res, expense, '支出记录创建成功');

  } catch (error) {
    logger.error('创建支出记录失败:', error);
    return ResponseHelper.error(res, '创建支出记录失败', 500);
  }
};

/**
 * 根据日期获取支出记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getExpenseByDate = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { date, type, reimbursementStatus } = req.query;
    if (!date) {
      return ResponseHelper.error(res, '日期参数是必填的', 400);
    }

    const queryDate = new Date(date);
    if (isNaN(queryDate.getTime())) {
      return ResponseHelper.error(res, '无效的日期格式', 400);
    }

    const expenses = await Expense.getByDate(storeId, queryDate, type, reimbursementStatus);

    return ResponseHelper.success(res, expenses, '获取支出记录成功');

  } catch (error) {
    logger.error('获取支出记录失败:', error);
    return ResponseHelper.error(res, '获取支出记录失败', 500);
  }
};

/**
 * 获取支出统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getExpenseStats = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { startDate, endDate, type, reimbursementStatus } = req.query;
    if (!startDate || !endDate) {
      return ResponseHelper.error(res, '开始日期和结束日期是必填参数', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return ResponseHelper.error(res, '无效的日期格式', 400);
    }

    if (start > end) {
      return ResponseHelper.error(res, '开始日期不能晚于结束日期', 400);
    }

    const stats = await Expense.getStats(storeId, start, end, type, reimbursementStatus);

    // 如果没有数据，返回默认统计
    const result = stats.length > 0 ? stats[0] : {
      totalExpenses: 0,
      totalAmount: 0,
      avgAmount: 0,
      maxAmount: 0,
      minAmount: 0,
      typeBreakdown: []
    };

    return ResponseHelper.success(res, result, '获取支出统计成功');

  } catch (error) {
    logger.error('获取支出统计失败:', error);
    return ResponseHelper.error(res, '获取支出统计失败', 500);
  }
};

/**
 * 获取支出记录列表（分页）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getExpenseRecords = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const {
      startDate,
      endDate,
      type,
      reimbursementStatus,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    if (startDate) {
      options.startDate = new Date(startDate);
    }
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    if (type) {
      options.type = type;
    }
    if (reimbursementStatus) {
      options.reimbursementStatus = reimbursementStatus;
    }

    const result = await Expense.getRecords(storeId, options);

    return ResponseHelper.success(res, result, '获取支出记录列表成功');

  } catch (error) {
    logger.error('获取支出记录列表失败:', error);
    return ResponseHelper.error(res, '获取支出记录列表失败', 500);
  }
};

/**
 * 更新支出记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateExpense = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { expenseId } = req.params;
    if (!expenseId) {
      return ResponseHelper.error(res, '支出记录ID是必填参数', 400);
    }

    // 检查支出记录是否存在且属于当前门店
    const existingExpense = await Expense.findById(expenseId);
    if (!existingExpense) {
      return ResponseHelper.notFound(res, '支出记录');
    }

    if (existingExpense.storeId !== storeId) {
      return ResponseHelper.error(res, '无权限修改此支出记录', 403);
    }

    const { type, date, amount, description, notes, category } = req.body;
    const updateData = {};

    // 验证并设置更新字段
    if (type !== undefined) {
      const validTypes = ['operational', 'maintenance', 'purchase', 'other'];
      if (!validTypes.includes(type)) {
        return ResponseHelper.error(res, '无效的支出类型', 400);
      }
      updateData.type = type;
    }

    if (date !== undefined) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime())) {
        return ResponseHelper.error(res, '无效的日期格式', 400);
      }
      updateData.date = newDate;
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return ResponseHelper.error(res, '支出金额必须是大于0的数字', 400);
      }
      updateData.amount = amount;
    }

    if (description !== undefined) {
      if (!description || !description.trim()) {
        return ResponseHelper.error(res, '支出描述不能为空', 400);
      }
      updateData.description = description.trim();
    }

    if (notes !== undefined) {
      updateData.notes = notes ? notes.trim() : '';
    }

    if (category !== undefined) {
      updateData.category = category ? category.trim() : '';
    }

    const updatedExpense = await Expense.updateExpense(expenseId, updateData);

    logger.info(`支出记录更新成功`, {
      expenseId,
      storeId,
      updateData
    });

    return ResponseHelper.success(res, updatedExpense, '支出记录更新成功');

  } catch (error) {
    logger.error('更新支出记录失败:', error);
    return ResponseHelper.error(res, '更新支出记录失败', 500);
  }
};

/**
 * 删除支出记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteExpense = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { expenseId } = req.params;
    if (!expenseId) {
      return ResponseHelper.error(res, '支出记录ID是必填参数', 400);
    }

    // 检查支出记录是否存在且属于当前门店
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return ResponseHelper.notFound(res, '支出记录');
    }

    if (expense.storeId !== storeId) {
      return ResponseHelper.error(res, '无权限删除此支出记录', 403);
    }

    await Expense.deleteExpense(expenseId);

    logger.info(`支出记录删除成功`, {
      expenseId,
      storeId,
      amount: expense.amount,
      type: expense.type
    });

    return ResponseHelper.success(res, null, '支出记录删除成功');

  } catch (error) {
    logger.error('删除支出记录失败:', error);
    return ResponseHelper.error(res, '删除支出记录失败', 500);
  }
};

/**
 * 审核支出记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const approveExpense = async (req, res) => {
  try {
    const storeId = req.currentStoreId || req.headers['x-current-store-id'];
    if (!storeId) {
      return ResponseHelper.error(res, '请求头中缺少门店ID', 400);
    }

    const { expenseId } = req.params;
    const { approvedBy } = req.body;

    if (!expenseId) {
      return ResponseHelper.error(res, '支出记录ID是必填参数', 400);
    }

    if (!approvedBy) {
      return ResponseHelper.error(res, '审核人是必填参数', 400);
    }

    // 检查支出记录是否存在且属于当前门店
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return ResponseHelper.notFound(res, '支出记录');
    }

    if (expense.storeId !== storeId) {
      return ResponseHelper.error(res, '无权限审核此支出记录', 403);
    }

    if (expense.isApproved) {
      return ResponseHelper.error(res, '此支出记录已经审核过了', 400);
    }

    const approvedExpense = await Expense.approveExpense(expenseId, approvedBy.trim());

    logger.info(`支出记录审核成功`, {
      expenseId,
      storeId,
      approvedBy,
      amount: expense.amount
    });

    return ResponseHelper.success(res, approvedExpense, '支出记录审核成功');

  } catch (error) {
    logger.error('审核支出记录失败:', error);
    return ResponseHelper.error(res, '审核支出记录失败', 500);
  }
};

/**
 * 获取支出类型列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getExpenseTypes = async (req, res) => {
  try {
    const expenseTypes = [
      { value: 'operational', label: '运营支出', description: '日常运营相关的支出' },
      { value: 'maintenance', label: '维护支出', description: '设备维护、店面维修等支出' },
      { value: 'purchase', label: '采购支出', description: '原材料、设备采购等支出' },
      { value: 'other', label: '其他支出', description: '其他类型的支出' }
    ];

    return ResponseHelper.success(res, expenseTypes, '获取支出类型成功');

  } catch (error) {
    logger.error('获取支出类型失败:', error);
    return ResponseHelper.error(res, '获取支出类型失败', 500);
  }
};

module.exports = {
  createExpense,
  getExpenseByDate,
  getExpenseStats,
  getExpenseRecords,
  updateExpense,
  deleteExpense,
  approveExpense,
  getExpenseTypes
};
const express = require('express');
const router = express.Router();
const {
  createExpense,
  getExpenseByDate,
  getExpenseStats,
  getExpenseRecords,
  updateExpense,
  deleteExpense,
  approveExpense,
  getExpenseTypes
} = require('../controllers/expenseController');

/**
 * @route POST /api/expense/register
 * @desc 创建支出记录
 * @body {string} type - 支出类型 ('operational', 'maintenance', 'purchase', 'other')
 * @body {string} date - 支出日期 (ISO格式)
 * @body {number} amount - 支出金额
 * @body {string} description - 支出描述
 * @body {string} notes - 详细备注 (可选)
 * @body {string} operatedBy - 提交人
 * @body {string} category - 支出分类 (可选)
 * @access Public
 */
router.post('/register', createExpense);

/**
 * @route GET /api/expense/by-date
 * @desc 获取指定日期的支出记录
 * @query {string} date - 日期 (YYYY-MM-DD)
 * @query {string} type - 支出类型 (可选)
 * @access Public
 */
router.get('/by-date', getExpenseByDate);

/**
 * @route GET /api/expense/stats
 * @desc 获取支出统计数据
 * @query {string} startDate - 开始日期 (YYYY-MM-DD)
 * @query {string} endDate - 结束日期 (YYYY-MM-DD)
 * @query {string} type - 支出类型 (可选，'all'表示所有类型)
 * @access Public
 */
router.get('/stats', getExpenseStats);

/**
 * @route GET /api/expense/records
 * @desc 获取支出记录列表
 * @query {string} startDate - 开始日期 (YYYY-MM-DD)
 * @query {string} endDate - 结束日期 (YYYY-MM-DD)
 * @query {string} type - 支出类型 (可选)
 * @query {number} page - 页码 (默认: 1)
 * @query {number} limit - 每页数量 (默认: 20)
 * @query {string} sortBy - 排序字段 (默认: 'date')
 * @query {string} sortOrder - 排序方向 ('asc' | 'desc', 默认: 'desc')
 * @access Public
 */
router.get('/records', getExpenseRecords);

/**
 * @route GET /api/expense/types
 * @desc 获取支出类型列表
 * @access Public
 */
router.get('/types', getExpenseTypes);

/**
 * @route PUT /api/expense/:expenseId
 * @desc 更新支出记录
 * @param {string} expenseId - 支出记录ID
 * @body {string} type - 支出类型 (可选)
 * @body {string} date - 支出日期 (可选)
 * @body {number} amount - 支出金额 (可选)
 * @body {string} description - 支出描述 (可选)
 * @body {string} notes - 详细备注 (可选)
 * @body {string} category - 支出分类 (可选)
 * @access Public
 */
router.put('/:expenseId', updateExpense);

/**
 * @route POST /api/expense/:expenseId/approve
 * @desc 审核支出记录
 * @param {string} expenseId - 支出记录ID
 * @body {string} approvedBy - 审核人
 * @access Public
 */
router.post('/:expenseId/approve', approveExpense);

/**
 * @route DELETE /api/expense/:expenseId
 * @desc 删除支出记录
 * @param {string} expenseId - 支出记录ID
 * @access Public
 */
router.delete('/:expenseId', deleteExpense);

module.exports = router;
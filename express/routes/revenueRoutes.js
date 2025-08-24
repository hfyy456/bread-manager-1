const express = require('express');
const router = express.Router();
const {
  registerRevenue,
  getRevenueList,
  getRevenueById,
  getRevenueByStoreAndDate,
  deleteRevenue
} = require('../controllers/revenueController');

/**
 * @route POST /api/revenue/register
 * @desc 注册营业数据
 * @body {string} storeId - 门店ID
 * @body {string} date - 营业日期
 * @body {number} actualRevenue - 实收金额
 * @body {number} totalRevenue - 营业额
 * @body {number} avgOrderValue - 客单价
 * @body {number} orderCount - 客单数
 * @body {number} meituanRevenue - 美团团购收入
 * @body {number} douyinRevenue - 抖音团购收入
 * @body {number} cashRevenue - 现金收入
 * @body {number} cardRevenue - 银行卡收入
 * @body {string} notes - 备注
 * @body {string} submittedBy - 提交人
 * @access Public
 */
router.post('/register', registerRevenue);

/**
 * @route GET /api/revenue/list
 * @desc 获取营业数据列表
 * @query {string} storeId - 门店ID (必填)
 * @query {string} startDate - 开始日期
 * @query {string} endDate - 结束日期
 * @query {number} page - 页码
 * @query {number} limit - 每页数量
 * @access Public
 */
router.get('/list', getRevenueList);

/**
 * @route GET /api/revenue/:id
 * @desc 获取单条营业数据详情
 * @param {string} id - 营业数据ID
 * @access Public
 */
router.get('/:id', getRevenueById);

/**
 * @route GET /api/revenue/store/:storeId/date/:date
 * @desc 根据门店和日期获取营业数据
 * @param {string} storeId - 门店ID
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @access Public
 */
router.get('/store/:storeId/date/:date', getRevenueByStoreAndDate);

/**
 * @route DELETE /api/revenue/:id
 * @desc 删除营业数据
 * @param {string} id - 营业数据ID
 * @access Public
 */
router.delete('/:id', deleteRevenue);

module.exports = router;
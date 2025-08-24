const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @route GET /api/statistics
 * @desc 获取综合统计数据（营业数据、生产报损、库存数据）
 * @access Private
 * @param {string} storeId - 门店ID (必填)
 * @param {string} period - 时间周期：'today', 'week', 'month' (可选，默认'today')
 */
router.get('/', authenticate, statisticsController.getStatistics);

/**
 * @route GET /api/statistics/revenue-trend
 * @desc 获取营业数据趋势
 * @access Private
 * @param {string} storeId - 门店ID (必填)
 * @param {number} days - 天数 (可选，默认7天)
 */
router.get('/revenue-trend', authenticate, statisticsController.getRevenueTrend);

module.exports = router;
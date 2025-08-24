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

/**
 * @route GET /api/statistics/gross-profit
 * @desc 获取毛利数据统计
 * @access Private
 * @param {string} storeId - 门店ID (必填)
 * @param {string} period - 时间周期：'today', 'week', 'month' (可选，默认'today')
 */
router.get('/gross-profit', authenticate, async (req, res) => {
  try {
    const { storeId, period = 'today' } = req.query;

    // 验证必填参数
    if (!storeId) {
      return res.status(400).json({ success: false, message: '门店ID是必填参数' });
    }

    // 获取日期范围
    const { getDateRange } = require('../controllers/statisticsController');
    const { startDate, endDate } = getDateRange(period);

    // 调用毛利统计函数
    const grossProfitStats = await statisticsController.getGrossProfitStats(storeId, startDate, endDate);

    res.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        ...grossProfitStats
      },
      message: '获取毛利数据成功'
    });
  } catch (error) {
    console.error('获取毛利数据失败:', error);
    res.status(500).json({ success: false, message: '获取毛利数据失败' });
  }
});

/**
 * @route GET /api/statistics/gross-profit/base-data
 * @desc 获取毛利计算基础数据
 * @access Private
 * @param {string} storeId - 门店ID (必填)
 */
router.get('/gross-profit/base-data', authenticate, async (req, res) => {
  try {
    const { storeId } = req.query;

    // 验证必填参数
    if (!storeId) {
      return res.status(400).json({ success: false, message: '门店ID是必填参数' });
    }

    // 调用基础数据获取函数
    const baseData = await statisticsController.getGrossProfitBaseData(storeId);

    res.json({
      success: true,
      data: baseData,
      message: '获取毛利基础数据成功'
    });
  } catch (error) {
    console.error('获取毛利基础数据失败:', error);
    res.status(500).json({ success: false, message: '获取毛利基础数据失败' });
  }
});

module.exports = router;
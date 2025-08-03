const express = require('express');
const router = express.Router();
const {
  createOrUpdateProductionPlan,
  getProductionPlans,
  getProductionPlanById,
  getProductionPlanByDate,
  deleteProductionPlan,
  getProductionStats,
  toggleProductionPlanLock,
  copyProductionPlan
} = require('../controllers/productionPlanController');

// @route   POST /api/production-plans
// @desc    创建或更新生产计划
// @access  Private
router.post('/', createOrUpdateProductionPlan);

// @route   GET /api/production-plans
// @desc    获取生产计划列表
// @access  Private
router.get('/', getProductionPlans);

// @route   GET /api/production-plans/stats
// @desc    获取生产统计
// @access  Private
router.get('/stats', getProductionStats);

// @route   GET /api/production-plans/date/:date
// @desc    根据日期获取生产计划
// @access  Private
router.get('/date/:date', getProductionPlanByDate);

// @route   GET /api/production-plans/:id
// @desc    获取单个生产计划
// @access  Private
router.get('/:id', getProductionPlanById);

// @route   DELETE /api/production-plans/:id
// @desc    删除生产计划
// @access  Private
router.delete('/:id', deleteProductionPlan);

// @route   POST /api/production-plans/:id/lock
// @desc    切换生产计划锁定状态
// @access  Private
router.post('/:id/lock', toggleProductionPlanLock);

// @route   POST /api/production-plans/:id/copy
// @desc    复制生产计划
// @access  Private
router.post('/:id/copy', copyProductionPlan);

module.exports = router;
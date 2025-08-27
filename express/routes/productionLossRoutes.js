/*
 * @Author: Sirius 540363975@qq.com
 * @Date: 2025-08-28 00:32:53
 * @LastEditors: Sirius 540363975@qq.com
 * @LastEditTime: 2025-08-28 03:27:45
 */
const express = require('express');
const router = express.Router();
const {
  createOrUpdateProductionLoss,
  getProductionLossByDate,
  getProductionLossStats,
  getProductionLossRecords,
  deleteProductionLoss,
  getActiveProducts
} = require('../controllers/productionLossController');

/**
 * @route POST /api/production-loss/register
 * @desc 创建或更新生产报损记录
 * @body {string} type - 报损类型 ('production', 'tasting', 'closing', 'other')
 * @body {string} date - 报损日期 (ISO格式)
 * @body {Array} items - 报损项目列表
 * @body {number} totalQuantity - 总报损数量
 * @body {number} totalValue - 总报损价值
 * @body {string} operatedBy - 操作人员 (可选)
 * @body {string} notes - 备注 (可选)
 * @access Public
 */
router.post('/register', createOrUpdateProductionLoss);

/**
 * @route GET /api/production-loss/by-date
 * @desc 获取指定日期的生产报损记录
 * @query {string} date - 日期 (YYYY-MM-DD)
 * @query {string} type - 报损类型 (可选)
 * @access Public
 */
router.get('/by-date', getProductionLossByDate);

/**
 * @route GET /api/production-loss/stats
 * @desc 获取生产报损统计数据
 * @query {string} startDate - 开始日期 (YYYY-MM-DD)
 * @query {string} endDate - 结束日期 (YYYY-MM-DD)
 * @query {string} type - 报损类型 (可选，'all'表示所有类型)
 * @access Public
 */
router.get('/stats', getProductionLossStats);

/**
 * @route GET /api/production-loss/records
 * @desc 获取生产报损记录列表
 * @query {string} startDate - 开始日期 (YYYY-MM-DD)
 * @query {string} endDate - 结束日期 (YYYY-MM-DD)
 * @query {string} type - 报损类型 (可选)
 * @query {number} page - 页码 (默认1)
 * @query {number} limit - 每页数量 (默认20)
 * @access Public
 */
router.get('/records', getProductionLossRecords);

/**
 * @route GET /api/production-loss/products
 * @desc 获取门店上架产品列表（用于报损页面选择产品）
 * @access Public
 */
router.get('/products', getActiveProducts);

/**
 * @route DELETE /api/production-loss/:id
 * @desc 删除生产报损记录
 * @param {string} id - 报损记录ID
 * @access Public
 */
router.delete('/:id', deleteProductionLoss);

module.exports = router;
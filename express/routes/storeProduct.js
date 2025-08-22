const express = require('express');
const router = express.Router();
const {
  getAllBreadTypes,
  getStoreProducts,
  updateProductStatus,
  batchUpdateProductStatus,
  getProductHistory
} = require('../controllers/storeProductController');

/**
 * @route GET /api/store-products/bread-types
 * @desc 获取所有面包类型（用于产品管理页面）
 * @access Public
 */
router.get('/bread-types', getAllBreadTypes);

/**
 * @route GET /api/store-products/store/:storeId
 * @desc 获取门店产品列表（包含上下架状态）
 * @param {string} storeId - 门店ID
 * @query {string} status - 状态筛选 ('active', 'inactive', 'all')
 * @access Public
 */
router.get('/store/:storeId', getStoreProducts);

/**
 * @route PUT /api/store-products/store/:storeId/product
 * @desc 更新单个产品上下架状态
 * @param {string} storeId - 门店ID
 * @body {string} breadTypeId - 产品ID
 * @body {boolean} isActive - 是否上架
 * @body {string} operatedBy - 操作人
 * @body {string} notes - 备注
 * @access Public
 */
router.put('/store/:storeId/product', updateProductStatus);

/**
 * @route PUT /api/store-products/store/:storeId/batch
 * @desc 批量更新产品上下架状态
 * @param {string} storeId - 门店ID
 * @body {Array} operations - 操作列表
 * @body {string} operatedBy - 操作人
 * @access Public
 */
router.put('/store/:storeId/batch', batchUpdateProductStatus);

/**
 * @route GET /api/store-products/store/:storeId/product/:breadTypeId/history
 * @desc 获取产品操作历史
 * @param {string} storeId - 门店ID
 * @param {string} breadTypeId - 产品ID
 * @query {number} page - 页码
 * @query {number} limit - 每页数量
 * @access Public
 */
router.get('/store/:storeId/product/:breadTypeId/history', getProductHistory);

module.exports = router;
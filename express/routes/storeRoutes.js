const express = require('express');
const router = express.Router();
const { 
  getAllStores, 
  updateWarehouseManagers, 
  getStoreById 
} = require('../controllers/storeController');

// @route   GET /api/stores
// @desc    获取所有门店列表
// @access  Public (in real app, should be Private)
router.get('/stores', getAllStores);

// @route   GET /api/stores/:id
// @desc    获取单个门店信息
// @access  Public
router.get('/stores/:id', getStoreById);

// @route   PUT /api/stores/:id/warehouse-managers
// @desc    更新门店库管信息
// @access  Private
router.put('/stores/:id/warehouse-managers', updateWarehouseManagers);

module.exports = router; 
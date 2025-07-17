const express = require('express');
const router = express.Router();
const { getAllStores } = require('../controllers/storeController');

// @route   GET /api/stores
// @desc    获取所有门店列表
// @access  Public (in real app, should be Private)
router.get('/stores', getAllStores);

module.exports = router; 
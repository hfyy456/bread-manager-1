const express = require('express');
const router = express.Router();
const { submitStockByPost } = require('../controllers/inventoryController');

// @route   POST /api/inventory/submit
// @desc    提交指定岗位的物料盘点数据
// @access  Private (后续应添加权限验证)
router.post('/submit', submitStockByPost);

module.exports = router; 
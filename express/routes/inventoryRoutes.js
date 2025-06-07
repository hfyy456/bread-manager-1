const express = require('express');
const router = express.Router();
const { 
  submitStockByPost, 
  createInventorySnapshot, 
  listSnapshots, 
  getSnapshotDetails,
  restoreInventoryFromSnapshot
} = require('../controllers/inventoryController');

// @route   POST /api/inventory/submit
// @desc    提交指定岗位的物料盘点数据
// @access  Private (后续应添加权限验证)
router.post('/submit', submitStockByPost);

// @route   POST /api/inventory/snapshot
// @desc    Create a snapshot of the current inventory
router.post('/snapshot', createInventorySnapshot);

// @route   GET /api/inventory/snapshots
// @desc    Get a list of all available inventory snapshots
router.get('/snapshots', listSnapshots);

// @route   GET /api/inventory/snapshots/:id
// @desc    Get the detailed content of a specific inventory snapshot
router.get('/snapshots/:id', getSnapshotDetails);

// @route   POST /api/inventory/restore/:id
// @desc    Restore inventory from a specific snapshot
router.post('/restore/:id', restoreInventoryFromSnapshot);

module.exports = router; 
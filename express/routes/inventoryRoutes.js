const express = require('express');
const router = express.Router();
const { 
  submitStockByPost, 
  createInventorySnapshot, 
  listSnapshots, 
  getSnapshotDetails,
  restoreInventoryFromSnapshot,
  getInventoryState,
  exportInventoryExcel,
  exportInventoryRealtimeExcel
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

// @route   GET /api/inventory/state
// @desc    Get the current stock state for all ingredients
router.get('/state', getInventoryState);

// @route   GET /api/inventory/export
// @desc    导出最新库存快照为Excel
router.get('/export', exportInventoryExcel);

// @route   GET /api/inventory/export-realtime
// @desc    导出实时库存为Excel
router.get('/export-realtime', exportInventoryRealtimeExcel);

module.exports = router; 
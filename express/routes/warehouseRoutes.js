const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/stock', authMiddleware, warehouseController.getWarehouseStock);
router.post('/transfer', authMiddleware, warehouseController.transferStock);
router.put('/stock/bulk', authMiddleware, warehouseController.bulkUpdateWarehouseStock); // For bulk updates
router.put('/stock', authMiddleware, warehouseController.updateWarehouseStock); // For single updates

module.exports = router; 
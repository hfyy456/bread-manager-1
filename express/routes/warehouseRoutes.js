const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/stock', authMiddleware, warehouseController.getWarehouseStock);
router.post('/transfer', authMiddleware, warehouseController.transferStock);
router.post('/bulk-update-stock', authMiddleware, warehouseController.bulkUpdateWarehouseStock); // Corrected route
router.put('/stock', authMiddleware, warehouseController.updateWarehouseStock); // For single updates

module.exports = router; 
const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/stock', authenticate, warehouseController.getWarehouseStock);
router.post('/transfer', authenticate, warehouseController.transferStock);
router.post('/bulk-update-stock', authenticate, warehouseController.bulkUpdateWarehouseStock); // Corrected route
router.put('/stock', authenticate, warehouseController.updateWarehouseStock); // For single updates

module.exports = router;
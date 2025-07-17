const express = require('express');
const router = express.Router();
const transferRequestController = require('../controllers/transferRequestController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/transfer-requests
// @desc    Create a new transfer request
// @access  Private
router.post('/', authMiddleware, transferRequestController.createRequest);

// @route   GET /api/transfer-requests
// @desc    Get all requests for the current store
// @access  Private
router.get('/', authMiddleware, transferRequestController.getRequestsByStore);


module.exports = router; 
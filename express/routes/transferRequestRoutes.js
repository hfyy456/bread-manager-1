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

// @route   GET /api/transfer-requests/all
// @desc    Get all transfer requests (for admin)
// @access  Private (should be restricted to admins in a real app)
router.get('/all', authMiddleware, transferRequestController.getAllRequests);

// @route   PUT /api/transfer-requests/:id/status
// @desc    Update a transfer request's status
// @access  Private (should be restricted to admins)
router.put('/:id/status', authMiddleware, transferRequestController.updateRequestStatus);

// @route   POST /api/transfer-requests/bulk-approve
// @desc    Bulk approve transfer requests
// @access  Private (should be restricted to admins)
router.post('/bulk-approve', authMiddleware, transferRequestController.bulkApproveRequests);

module.exports = router; 
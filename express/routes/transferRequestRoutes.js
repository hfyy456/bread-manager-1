const express = require('express');
const router = express.Router();
const transferRequestController = require('../controllers/transferRequestController');
const { authenticate } = require('../middleware/authMiddleware');

// @route   POST /api/transfer-requests
// @desc    Create a new transfer request
// @access  Private
router.post('/', authenticate, transferRequestController.createRequest);

// @route   GET /api/transfer-requests
// @desc    Get all requests for the current store
// @access  Private
router.get('/', authenticate, transferRequestController.getRequestsByStore);

// @route   GET /api/transfer-requests/all
// @desc    Get all transfer requests (for admin)
// @access  Private (should be restricted to admins in a real app)
router.get('/all', authenticate, transferRequestController.getAllRequests);

// @route   PUT /api/transfer-requests/:id/status
// @desc    Update a transfer request's status
// @access  Private (should be restricted to admins)
router.put('/:id/status', authenticate, transferRequestController.updateRequestStatus);

// @route   POST /api/transfer-requests/bulk-approve
// @desc    Bulk approve transfer requests
// @access  Private (should be restricted to admins)
router.post('/bulk-approve', authenticate, transferRequestController.bulkApproveRequests);

// @route   POST /api/transfer-requests/:id/mobile-approve
// @desc    Mobile approve transfer request (for warehouse managers)
// @access  Private
router.post('/:id/mobile-approve', authenticate, transferRequestController.mobileApproveRequest);

module.exports = router;
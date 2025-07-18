const express = require('express');
const router = express.Router();
const transferRequestController = require('../controllers/transferRequestController');
const { protect, checkStoreAccess } = require('../middleware/authMiddleware');

// Note: The `protect` middleware is removed from GET for mobile access, but `checkStoreAccess` is kept.
router.route('/')
    .get(checkStoreAccess, transferRequestController.getRequestsByStore)
    .post(checkStoreAccess, transferRequestController.createRequest);

// New route for fetching all requests for admin
router.get('/all', protect, transferRequestController.getAllRequests);

// New route for updating status
router.route('/:id/status')
    .put(protect, transferRequestController.updateRequestStatus);

module.exports = router; 
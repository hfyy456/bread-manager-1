const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary data
// @access  Public (adjust as needed)
router.get('/summary', getDashboardSummary);

module.exports = router; 
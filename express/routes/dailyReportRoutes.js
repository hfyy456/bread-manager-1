const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReportController');

// @route   POST /api/daily-reports
// @desc    Create or update a daily report
// @access  Public (add auth middleware later if needed)
router.post('/', dailyReportController.createOrUpdateDailyReport);

// @route   GET /api/daily-reports/by-date
// @desc    Get a daily report by date (e.g., /api/daily-reports/by-date?date=YYYY-MM-DD)
// @access  Public
router.get('/by-date', dailyReportController.getDailyReportByDate);

// @route   GET /api/daily-reports
// @desc    Get all daily reports (sorted by date descending)
// @access  Public
router.get('/', dailyReportController.getAllDailyReports);

module.exports = router; 
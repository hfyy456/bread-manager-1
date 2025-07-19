const express = require('express');
const router = express.Router();
const feishuController = require('../controllers/feishuController');

// @route   POST /api/feishu/auth
// @desc    Authenticate with Feishu using a temporary code
// @access  Public
router.post('/auth', feishuController.authenticate);

module.exports = router; 
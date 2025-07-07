const express = require('express');
const router = express.Router();
const { compareSnapshots } = require('../controllers/ingredientController');

// GET /api/ingredients/compare - Compare two inventory snapshots
router.get('/compare', compareSnapshots);

module.exports = router; 
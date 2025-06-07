const express = require('express');
const router = express.Router();
const { getAllBreadTypes } = require('../controllers/breadTypeController');

router.post('/bread-types/list', getAllBreadTypes);
 
module.exports = router; 
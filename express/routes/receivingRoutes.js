const express = require('express');
const router = express.Router();
const { handleSubmit, parseDeliverySlip } = require('../controllers/receivingController');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Route to submit a new receiving record
router.post('/', handleSubmit);

// Route to parse an uploaded delivery slip image
router.post('/parse-delivery-slip', upload.single('deliverySlip'), parseDeliverySlip);

module.exports = router; 
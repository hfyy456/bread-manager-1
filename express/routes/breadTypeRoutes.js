const express = require('express');
const router = express.Router();
const { 
  getAllBreadTypes,
  getBreadTypeById,
  createBreadType,
  updateBreadType,
  deleteBreadType,
} = require('../controllers/breadTypeController');

router.post('/bread-types/list', getAllBreadTypes);
router.post('/bread-types', createBreadType);
router.get('/bread-types/:id', getBreadTypeById);
router.put('/bread-types/:id', updateBreadType);
router.delete('/bread-types/:id', deleteBreadType);
 
module.exports = router; 
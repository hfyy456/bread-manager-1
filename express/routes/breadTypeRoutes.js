const express = require('express');
const router = express.Router();
const { 
  getAllBreadTypes,
  getBreadTypeById,
  createBreadType,
  updateBreadType,
  deleteBreadType,
} = require('../controllers/breadTypeController');

router.post('/list', getAllBreadTypes);
router.post('/', createBreadType);
router.get('/:id', getBreadTypeById);
router.put('/:id', updateBreadType);
router.delete('/:id', deleteBreadType);
 
module.exports = router; 
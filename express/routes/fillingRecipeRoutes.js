const express = require('express');
const router = express.Router();
const { 
  getAllFillingRecipes,
  createFillingRecipe,
  updateFillingRecipe,
  deleteFillingRecipe 
} = require('../controllers/fillingRecipeController');

router.post('/list', getAllFillingRecipes);
router.post('/create', createFillingRecipe);
router.put('/:id', updateFillingRecipe);
router.delete('/:id', deleteFillingRecipe);
 
module.exports = router; 
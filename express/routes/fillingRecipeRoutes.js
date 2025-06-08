const express = require('express');
const router = express.Router();
const { 
  getAllFillingRecipes,
  createFillingRecipe,
  updateFillingRecipe,
  deleteFillingRecipe 
} = require('../controllers/fillingRecipeController');

router.post('/filling-recipes/list', getAllFillingRecipes);
router.post('/filling-recipes/create', createFillingRecipe);
router.put('/filling-recipes/:id', updateFillingRecipe);
router.delete('/filling-recipes/:id', deleteFillingRecipe);
 
module.exports = router; 
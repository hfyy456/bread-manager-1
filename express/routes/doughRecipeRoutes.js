const express = require('express');
const router = express.Router();
const { 
  getAllDoughRecipes,
  createDoughRecipe,
  updateDoughRecipe,
  deleteDoughRecipe 
} = require('../controllers/doughRecipeController');

router.post('/list', getAllDoughRecipes);
router.post('/create', createDoughRecipe);
router.put('/:id', updateDoughRecipe);
router.delete('/:id', deleteDoughRecipe);
 
module.exports = router; 
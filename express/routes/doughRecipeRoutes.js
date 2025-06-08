const express = require('express');
const router = express.Router();
const { 
  getAllDoughRecipes,
  createDoughRecipe,
  updateDoughRecipe,
  deleteDoughRecipe 
} = require('../controllers/doughRecipeController');

router.post('/dough-recipes/list', getAllDoughRecipes);
router.post('/dough-recipes/create', createDoughRecipe);
router.put('/dough-recipes/:id', updateDoughRecipe);
router.delete('/dough-recipes/:id', deleteDoughRecipe);
 
module.exports = router; 
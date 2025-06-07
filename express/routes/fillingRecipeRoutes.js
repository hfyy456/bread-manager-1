const express = require('express');
const router = express.Router();
const { getAllFillingRecipes } = require('../controllers/fillingRecipeController');

router.post('/filling-recipes/list', getAllFillingRecipes);
 
module.exports = router; 
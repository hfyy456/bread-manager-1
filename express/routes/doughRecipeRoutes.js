const express = require('express');
const router = express.Router();
const { getAllDoughRecipes } = require('../controllers/doughRecipeController');

router.post('/dough-recipes/list', getAllDoughRecipes);
 
module.exports = router; 
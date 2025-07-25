const express = require('express');
const router = express.Router();
const {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getCurrentTotalInventoryValue
} = require('../controllers/ingredientController');

// @route   POST /api/ingredients/list
// @desc    获取所有原料
router.post('/list', getAllIngredients);

// @route   POST /api/ingredients/create
// @desc    创建新原料
router.post('/create', createIngredient);

// @route   POST /api/ingredients/detail
// @desc    根据ID获取单个原料 (ID在请求体中)
router.post('/detail', getIngredientById);

// @route   POST /api/ingredients/update
// @desc    更新原料 (ID和数据在请求体中)
router.post('/update', updateIngredient);

// @route   POST /api/ingredients/delete
// @desc    删除原料 (ID在请求体中)
router.post('/delete', deleteIngredient);

// @route   GET /api/ingredients/current-total-value
// @desc    获取当前总库存价值
router.get('/current-total-value', getCurrentTotalInventoryValue);

module.exports = router; 
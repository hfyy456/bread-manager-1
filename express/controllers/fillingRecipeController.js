const FillingRecipe = require('../models/FillingRecipe');

const getAllFillingRecipes = async (req, res) => {
  try {
    const fillingRecipes = await FillingRecipe.find().lean().sort({ createdAt: -1 });
    res.json({ success: true, data: fillingRecipes });
  } catch (err) {
    console.error("获取馅料配方错误:", err.message);
    res
      .status(500)
      .json({ success: false, message: "服务器错误: " + err.message });
  }
};

module.exports = {
  getAllFillingRecipes,
}; 
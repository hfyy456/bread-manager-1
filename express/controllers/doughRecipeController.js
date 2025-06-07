const DoughRecipe = require('../models/DoughRecipe');

const getAllDoughRecipes = async (req, res) => {
  try {
    const doughRecipes = await DoughRecipe.find().lean().sort({ createdAt: -1 });
    res.json({ success: true, data: doughRecipes });
  } catch (err) {
    console.error("获取面团配方错误:", err.message);
    res
      .status(500)
      .json({ success: false, message: "服务器错误: " + err.message });
  }
};

module.exports = {
  getAllDoughRecipes,
}; 
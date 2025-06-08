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

const createDoughRecipe = async (req, res) => {
  try {
    const newRecipe = new DoughRecipe(req.body);
    const savedRecipe = await newRecipe.save();
    res.status(201).json({ success: true, data: savedRecipe, message: '面团配方创建成功' });
  } catch (err) {
    console.error("创建面团配方错误:", err.message);
    res.status(400).json({ success: false, message: "创建失败: " + err.message });
  }
};

const updateDoughRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecipe = await DoughRecipe.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedRecipe) {
      return res.status(404).json({ success: false, message: '未找到指定的面团配方' });
    }
    res.json({ success: true, data: updatedRecipe, message: '面团配方更新成功' });
  } catch (err) {
    console.error("更新面团配方错误:", err.message);
    res.status(400).json({ success: false, message: "更新失败: " + err.message });
  }
};

const deleteDoughRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecipe = await DoughRecipe.findByIdAndDelete(id);
    if (!deletedRecipe) {
      return res.status(404).json({ success: false, message: '未找到指定的面团配方' });
    }
    res.json({ success: true, message: '面团配方删除成功' });
  } catch (err) {
    console.error("删除面团配方错误:", err.message);
    res.status(500).json({ success: false, message: "删除失败: " + err.message });
  }
};

module.exports = {
  getAllDoughRecipes,
  createDoughRecipe,
  updateDoughRecipe,
  deleteDoughRecipe,
}; 
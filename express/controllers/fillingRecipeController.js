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

const createFillingRecipe = async (req, res) => {
  try {
    const newRecipe = new FillingRecipe(req.body);
    const savedRecipe = await newRecipe.save();
    res.status(201).json({ success: true, data: savedRecipe, message: '馅料配方创建成功' });
  } catch (err) {
    console.error("创建馅料配方错误:", err.message);
    res.status(400).json({ success: false, message: "创建失败: " + err.message });
  }
};

const updateFillingRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecipe = await FillingRecipe.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedRecipe) {
      return res.status(404).json({ success: false, message: '未找到指定的馅料配方' });
    }
    res.json({ success: true, data: updatedRecipe, message: '馅料配方更新成功' });
  } catch (err) {
    console.error("更新馅料配方错误:", err.message);
    res.status(400).json({ success: false, message: "更新失败: " + err.message });
  }
};

const deleteFillingRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecipe = await FillingRecipe.findByIdAndDelete(id);
    if (!deletedRecipe) {
      return res.status(404).json({ success: false, message: '未找到指定的馅料配方' });
    }
    res.json({ success: true, message: '馅料配方删除成功' });
  } catch (err) {
    console.error("删除馅料配方错误:", err.message);
    res.status(500).json({ success: false, message: "删除失败: " + err.message });
  }
};

module.exports = {
  getAllFillingRecipes,
  createFillingRecipe,
  updateFillingRecipe,
  deleteFillingRecipe,
}; 
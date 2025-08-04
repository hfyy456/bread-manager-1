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
    // 验证 subFillings 数据
    if (req.body.subFillings && Array.isArray(req.body.subFillings)) {
      req.body.subFillings.forEach((subFilling, index) => {
        if (!subFilling.id) {
          subFilling.id = `sub-${Date.now()}-${index}`;
        }
        if (!subFilling.name) {
          throw new Error(`subFillings[${index}] 缺少必需的 name 字段`);
        }
        if (subFilling.quantity === undefined || subFilling.quantity === null) {
          throw new Error(`subFillings[${index}] 缺少必需的 quantity 字段`);
        }
        if (!subFilling.unit) {
          throw new Error(`subFillings[${index}] 缺少必需的 unit 字段`);
        }
      });
    }
    
    const newRecipe = new FillingRecipe(req.body);
    const savedRecipe = await newRecipe.save();
    res.status(201).json({ success: true, data: savedRecipe, message: '馅料配方创建成功' });
  } catch (err) {
    console.error("创建馅料配方错误:", err.message);
    
    // 提供更详细的错误信息
    let errorMessage = "创建失败: " + err.message;
    if (err.message.includes('subFillings') && err.message.includes('required')) {
      errorMessage = "subFillings 数据验证失败: " + err.message;
    }
    
    res.status(400).json({ success: false, message: errorMessage });
  }
};

const updateFillingRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证 subFillings 数据
    if (req.body.subFillings && Array.isArray(req.body.subFillings)) {
      req.body.subFillings.forEach((subFilling, index) => {
        if (!subFilling.id) {
          subFilling.id = `sub-${Date.now()}-${index}`;
        }
        if (!subFilling.name) {
          throw new Error(`subFillings[${index}] 缺少必需的 name 字段`);
        }
        if (subFilling.quantity === undefined || subFilling.quantity === null) {
          throw new Error(`subFillings[${index}] 缺少必需的 quantity 字段`);
        }
        if (!subFilling.unit) {
          throw new Error(`subFillings[${index}] 缺少必需的 unit 字段`);
        }
      });
    }
    
    const updatedRecipe = await FillingRecipe.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedRecipe) {
      return res.status(404).json({ success: false, message: '未找到指定的馅料配方' });
    }
    res.json({ success: true, data: updatedRecipe, message: '馅料配方更新成功' });
  } catch (err) {
    console.error("更新馅料配方错误:", err.message);
    
    // 提供更详细的错误信息
    let errorMessage = "更新失败: " + err.message;
    if (err.message.includes('subFillings') && err.message.includes('required')) {
      errorMessage = "subFillings 数据验证失败: " + err.message;
    }
    
    res.status(400).json({ success: false, message: errorMessage });
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
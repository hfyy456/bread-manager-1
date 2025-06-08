const BreadType = require('../models/BreadType');

const getAllBreadTypes = async (req, res) => {
  try {
    const breadTypes = await BreadType.find().lean().sort({ createdAt: -1 });
    res.json({ success: true, data: breadTypes });
  } catch (err) {
    console.error("获取面包种类错误:", err.message);
    res
      .status(500)
      .json({ success: false, message: "服务器错误: " + err.message });
  }
};

const getBreadTypeById = async (req, res) => {
  try {
    const breadType = await BreadType.findById(req.params.id);
    if (!breadType) {
      return res.status(404).json({ success: false, message: '未找到指定的面包种类' });
    }
    res.json({ success: true, data: breadType });
  } catch (err) {
    console.error("获取单个面包种类错误:", err.message);
    res.status(500).json({ success: false, message: "服务器错误: " + err.message });
  }
};

const createBreadType = async (req, res) => {
  try {
    const newBreadType = new BreadType(req.body);
    const savedBreadType = await newBreadType.save();
    res.status(201).json({ success: true, data: savedBreadType, message: '面包种类创建成功' });
  } catch (err) {
    console.error("创建面包种类错误:", err.message);
    res.status(400).json({ success: false, message: "创建失败: " + err.message });
  }
};

const updateBreadType = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBreadType = await BreadType.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedBreadType) {
      return res.status(404).json({ success: false, message: '未找到指定的面包种类' });
    }
    res.json({ success: true, data: updatedBreadType, message: '面包种类更新成功' });
  } catch (err) {
    console.error("更新面包种类错误:", err.message);
    res.status(400).json({ success: false, message: "更新失败: " + err.message });
  }
};

const deleteBreadType = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBreadType = await BreadType.findByIdAndDelete(id);
    if (!deletedBreadType) {
      return res.status(404).json({ success: false, message: '未找到指定的面包种类' });
    }
    res.json({ success: true, message: '面包种类删除成功' });
  } catch (err) {
    console.error("删除面包种类错误:", err.message);
    res.status(500).json({ success: false, message: "删除失败: " + err.message });
  }
};

module.exports = {
  getAllBreadTypes,
  getBreadTypeById,
  createBreadType,
  updateBreadType,
  deleteBreadType,
}; 
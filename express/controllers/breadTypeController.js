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

module.exports = {
  getAllBreadTypes,
}; 
const Store = require('../models/Store');

// @desc    获取所有门店列表
// @route   GET /api/stores
// @access  Public (在真实应用中应该是 Private，并根据用户权限返回)
exports.getAllStores = async (req, res) => {
  try {
    const stores = await Store.find({}).sort({ name: 1 });
    res.json({ success: true, count: stores.length, data: stores });
  } catch (error) {
    console.error('获取门店列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 可以在此添加创建、更新、删除门店的控制器方法
// exports.createStore = async (req, res) => { ... }; 
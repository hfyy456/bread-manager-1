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

// @desc    更新门店库管信息
// @route   PUT /api/stores/:id/warehouse-managers
// @access  Private
exports.updateWarehouseManagers = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouseManagers } = req.body;

    if (!Array.isArray(warehouseManagers)) {
      return res.status(400).json({ 
        success: false, 
        message: '库管列表必须是数组格式' 
      });
    }

    // 验证库管姓名不为空
    const validManagers = warehouseManagers.filter(name => 
      typeof name === 'string' && name.trim().length > 0
    ).map(name => name.trim());

    const store = await Store.findByIdAndUpdate(
      id,
      { warehouseManagers: validManagers },
      { new: true, runValidators: true }
    );

    if (!store) {
      return res.status(404).json({ 
        success: false, 
        message: '门店未找到' 
      });
    }

    res.json({ 
      success: true, 
      message: '库管信息更新成功',
      data: store 
    });
  } catch (error) {
    console.error('更新库管信息失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误: ' + error.message 
    });
  }
};

// @desc    获取单个门店信息
// @route   GET /api/stores/:id
// @access  Public
exports.getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({ 
        success: false, 
        message: '门店未找到' 
      });
    }

    res.json({ success: true, data: store });
  } catch (error) {
    console.error('获取门店信息失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误: ' + error.message 
    });
  }
}; 
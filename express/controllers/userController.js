const { User, USER_ROLES } = require('../models/User');
const logger = require('../utils/logger');

/**
 * 获取所有用户列表
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, storeId, search } = req.query;
    
    // 构建查询条件
    const query = { isActive: true };
    
    if (role && Object.values(USER_ROLES).includes(role)) {
      query.role = role;
    }
    
    if (storeId) {
      query.storeId = storeId;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .populate('storeId', 'name address')
        .select('-permissions')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);
    
    logger.info(`Retrieved ${users.length} users`, {
      query,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: users.length,
        totalCount: total
      }
    });
    
  } catch (error) {
    logger.error('Failed to get users', error);
    res.status(500).json({ 
      message: '获取用户列表失败', 
      details: error.message 
    });
  }
};

/**
 * 根据ID获取用户详情
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .populate('storeId', 'name address')
      .select('-permissions');
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    logger.info(`Retrieved user details for ${user.name}`, { userId: id });
    
    res.json(user);
    
  } catch (error) {
    logger.error('Failed to get user by ID', error, { userId: req.params.id });
    res.status(500).json({ 
      message: '获取用户详情失败', 
      details: error.message 
    });
  }
};

/**
 * 更新用户角色
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, storeId, notes } = req.body;
    
    // 验证角色
    if (!Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({ 
        message: '无效的用户角色',
        validRoles: Object.values(USER_ROLES)
      });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const oldRole = user.role;
    
    // 更新用户信息
    user.role = role;
    if (storeId !== undefined) {
      user.storeId = storeId || null;
    }
    if (notes !== undefined) {
      user.notes = notes;
    }
    
    await user.save();
    
    logger.info(`User role updated`, {
      userId: id,
      userName: user.name,
      oldRole,
      newRole: role,
      storeId,
      updatedBy: req.user?.name || 'System'
    });
    
    res.json({
      message: '用户角色更新成功',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        storeId: user.storeId,
        notes: user.notes
      }
    });
    
  } catch (error) {
    logger.error('Failed to update user role', error, { 
      userId: req.params.id,
      requestBody: req.body 
    });
    res.status(500).json({ 
      message: '更新用户角色失败', 
      details: error.message 
    });
  }
};

/**
 * 禁用/启用用户
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const oldStatus = user.isActive;
    user.isActive = isActive;
    
    if (reason) {
      user.notes = (user.notes || '') + `\n${new Date().toISOString()}: ${reason}`;
    }
    
    await user.save();
    
    logger.info(`User status toggled`, {
      userId: id,
      userName: user.name,
      oldStatus,
      newStatus: isActive,
      reason,
      updatedBy: req.user?.name || 'System'
    });
    
    res.json({
      message: `用户已${isActive ? '启用' : '禁用'}`,
      user: {
        id: user._id,
        name: user.name,
        isActive: user.isActive
      }
    });
    
  } catch (error) {
    logger.error('Failed to toggle user status', error, { 
      userId: req.params.id,
      requestBody: req.body 
    });
    res.status(500).json({ 
      message: '更新用户状态失败', 
      details: error.message 
    });
  }
};

/**
 * 获取用户统计信息
 */
exports.getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });
    
    const roleStats = {};
    Object.values(USER_ROLES).forEach(role => {
      roleStats[role] = { count: 0, active: 0 };
    });
    
    stats.forEach(stat => {
      if (roleStats[stat._id]) {
        roleStats[stat._id] = {
          count: stat.count,
          active: stat.active
        };
      }
    });
    
    logger.info('Retrieved user statistics', {
      totalUsers,
      activeUsers,
      newUsersThisMonth
    });
    
    res.json({
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      newThisMonth: newUsersThisMonth,
      byRole: roleStats
    });
    
  } catch (error) {
    logger.error('Failed to get user statistics', error);
    res.status(500).json({ 
      message: '获取用户统计失败', 
      details: error.message 
    });
  }
};

/**
 * 批量更新用户角色
 */
exports.batchUpdateUsers = async (req, res) => {
  try {
    const { userIds, updates } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: '请提供有效的用户ID列表' });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: '请提供要更新的字段' });
    }
    
    // 验证更新字段
    const allowedFields = ['role', 'storeId', 'isActive', 'notes'];
    const updateFields = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields[key] = updates[key];
      }
    });
    
    if (updateFields.role && !Object.values(USER_ROLES).includes(updateFields.role)) {
      return res.status(400).json({ 
        message: '无效的用户角色',
        validRoles: Object.values(USER_ROLES)
      });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds }, isActive: true },
      { $set: updateFields }
    );
    
    logger.info('Batch user update completed', {
      userIds,
      updates: updateFields,
      modifiedCount: result.modifiedCount,
      updatedBy: req.user?.name || 'System'
    });
    
    res.json({
      message: `成功更新 ${result.modifiedCount} 个用户`,
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    logger.error('Failed to batch update users', error, {
      requestBody: req.body
    });
    res.status(500).json({ 
      message: '批量更新用户失败', 
      details: error.message 
    });
  }
};

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // 假设用户信息已通过中间件设置在 req.user 中
    if (!req.user) {
      return res.status(401).json({ message: '用户未认证' });
    }
    
    const user = await User.findById(req.user.id)
      .populate('storeId', 'name address')
      .select('-permissions');
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json(user);
    
  } catch (error) {
    logger.error('Failed to get current user', error);
    res.status(500).json({ 
      message: '获取当前用户信息失败', 
      details: error.message 
    });
  }
};
const { User, USER_ROLES } = require('../models/User');
const logger = require('../utils/logger');

/**
 * 认证中间件 - 验证用户身份
 * 支持飞书用户认证和传统认证方式
 */
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取用户标识
    const feishuUserId = req.headers['x-feishu-user-id'];
    const currentStoreIdFromHeader = req.headers['x-current-store-id'];
    
    // 如果没有用户标识，使用开发模式的模拟用户
    if (!feishuUserId) {
      logger.warn('No user authentication found, using development mock user');
      
      req.currentStoreId = currentStoreIdFromHeader;
      req.user = {
        _id: '60d0fe4f5311236168a109ca',
        name: '开发用户',
        role: USER_ROLES.ADMIN,
        currentStoreId: currentStoreIdFromHeader,
        stores: [
          { storeId: '6878def4ae6e08fa4af88e34', role: 'admin' },
          { storeId: '6878df16ae6e08fa4af88e35', role: 'manager' }
        ]
      };
      return next();
    }
    

    
    // 根据飞书用户ID查找用户
    const user = await User.findOne({ 
      feishuUserId: feishuUserId, 
      isActive: true 
    }).populate('storeId', 'name address');
    
    if (!user) {
      logger.warn(`User not found or inactive: ${feishuUserId}`);
      return res.status(401).json({ 
        message: '用户未找到或已被禁用，请联系管理员' 
      });
    }
    
    // 更新最后登录时间
    await user.updateLastLogin();
    
    // 设置请求上下文
    req.currentStoreId = currentStoreIdFromHeader || user.storeId?._id;
    req.user = {
      _id: user._id,
      id: user._id,
      feishuUserId: user.feishuUserId,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      currentStoreId: req.currentStoreId,
      permissions: user.permissions || [],
      isAdmin: user.isAdmin(),
      isManager: user.isManager()
    };
    
    logger.debug(`User authenticated: ${user.name} (${user.role})`, {
      userId: user._id,
      feishuUserId: user.feishuUserId,
      role: user.role,
      storeId: req.currentStoreId
    });
    
    next();
    
  } catch (error) {
    logger.error('Authentication failed', error);
    res.status(500).json({ 
      message: '认证过程中发生错误', 
      details: error.message 
    });
  }
};

/**
 * 权限验证中间件 - 要求管理员权限
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: '用户未认证' });
  }
  
  if (req.user.role !== USER_ROLES.ADMIN) {
    logger.warn(`Access denied for user ${req.user.name}: insufficient privileges`, {
      userId: req.user._id,
      userRole: req.user.role,
      requiredRole: USER_ROLES.ADMIN
    });
    
    return res.status(403).json({ 
      message: '权限不足，需要管理员权限' 
    });
  }
  
  next();
};

/**
 * 权限验证中间件 - 要求管理员或经理权限
 */
const requireManagerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: '用户未认证' });
  }
  
  const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER];
  if (!allowedRoles.includes(req.user.role)) {
    logger.warn(`Access denied for user ${req.user.name}: insufficient privileges`, {
      userId: req.user._id,
      userRole: req.user.role,
      allowedRoles
    });
    
    return res.status(403).json({ 
      message: '权限不足，需要管理员或经理权限' 
    });
  }
  
  next();
};

/**
 * 权限验证中间件 - 检查特定权限
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '用户未认证' });
    }
    
    // 管理员拥有所有权限
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    
    // 检查用户是否有特定权限
    if (!req.user.permissions.includes(permission)) {
      logger.warn(`Access denied for user ${req.user.name}: missing permission`, {
        userId: req.user._id,
        userRole: req.user.role,
        requiredPermission: permission,
        userPermissions: req.user.permissions
      });
      
      return res.status(403).json({ 
        message: `权限不足，需要 ${permission} 权限` 
      });
    }
    
    next();
  };
};

/**
 * 门店权限验证中间件 - 验证用户是否有访问特定门店的权限
 */
const requireStoreAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: '用户未认证' });
  }
  
  // 管理员可以访问所有门店
  if (req.user.role === USER_ROLES.ADMIN) {
    return next();
  }
  
  const requestedStoreId = req.currentStoreId || req.params.storeId || req.body.storeId;
  
  // 如果用户有关联门店，检查是否匹配
  if (req.user.storeId && requestedStoreId) {
    if (req.user.storeId._id.toString() !== requestedStoreId.toString()) {
      logger.warn(`Store access denied for user ${req.user.name}`, {
        userId: req.user._id,
        userStoreId: req.user.storeId._id,
        requestedStoreId
      });
      
      return res.status(403).json({ 
        message: '无权访问该门店数据' 
      });
    }
  }
  
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireManagerOrAdmin,
  requirePermission,
  requireStoreAccess,
  // 保持向后兼容
  mockAuthMiddleware: authenticate
};
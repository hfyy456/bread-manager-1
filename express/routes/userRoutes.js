const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * 用户管理路由
 * 所有路由都需要认证，部分需要管理员权限
 */

// 获取当前用户信息
router.get('/me', authMiddleware.authenticate, userController.getCurrentUser);

// 获取所有用户列表（需要管理员权限）
router.get('/', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  userController.getAllUsers
);

// 获取用户统计信息（需要管理员权限）
router.get('/stats', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  userController.getUserStats
);

// 根据ID获取用户详情（需要管理员权限）
router.get('/:id', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  userController.getUserById
);

// 更新用户角色（需要管理员权限）
router.put('/:id/role', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  userController.updateUserRole
);

// 禁用/启用用户（需要管理员权限）
router.put('/:id/status', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  userController.toggleUserStatus
);

// 批量更新用户（需要管理员权限）
router.put('/batch/update', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  userController.batchUpdateUsers
);

module.exports = router;
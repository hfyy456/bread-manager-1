const mongoose = require('mongoose');

/**
 * 用户角色枚举
 */
const USER_ROLES = {
  ADMIN: 'admin',           // 管理员
  MANAGER: 'manager',       // 门店经理
  EMPLOYEE: 'employee'      // 普通员工
};

/**
 * 用户模型Schema
 * 支持飞书用户自动注册和角色管理
 */
const userSchema = new mongoose.Schema({
  // 飞书用户唯一标识
  feishuUserId: {
    type: String,
    required: [true, '飞书用户ID是必填项'],
    unique: true,
    index: true
  },
  
  // 用户基本信息
  name: {
    type: String,
    required: [true, '用户姓名是必填项'],
    trim: true,
    maxlength: [50, '用户姓名不能超过50个字符']
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请输入有效的邮箱地址']
  },
  
  avatar: {
    type: String,
    trim: true
  },
  
  // 用户角色
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.EMPLOYEE,
    required: true
  },
  
  // 关联门店ID（可选，用于门店级别的权限控制）
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },
  
  // 用户状态
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 最后登录时间
  lastLoginAt: {
    type: Date,
    default: null
  },
  
  // 注册来源
  registrationSource: {
    type: String,
    enum: ['feishu', 'manual'],
    default: 'feishu'
  },
  
  // 权限设置（可扩展）
  permissions: {
    type: [String],
    default: []
  },
  
  // 备注信息
  notes: {
    type: String,
    maxlength: [500, '备注信息不能超过500个字符']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // 返回JSON时隐藏敏感信息
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * 索引优化
 */
userSchema.index({ feishuUserId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ storeId: 1 });
userSchema.index({ isActive: 1 });

/**
 * 实例方法：检查用户是否有特定权限
 */
userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.role === USER_ROLES.ADMIN;
};

/**
 * 实例方法：检查用户是否为管理员
 */
userSchema.methods.isAdmin = function() {
  return this.role === USER_ROLES.ADMIN;
};

/**
 * 实例方法：检查用户是否为经理
 */
userSchema.methods.isManager = function() {
  return this.role === USER_ROLES.MANAGER;
};

/**
 * 实例方法：更新最后登录时间
 */
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

/**
 * 静态方法：根据飞书用户ID查找或创建用户
 */
userSchema.statics.findOrCreateByFeishuId = async function(feishuUserData) {
  const { feishuUserId, name, email, avatar, storeId } = feishuUserData;
  
  try {
    // 先尝试查找现有用户
    let user = await this.findOne({ feishuUserId: feishuUserId });
    
    if (user) {
      // 用户已存在，更新基本信息和最后登录时间
      user.name = name || user.name;
      user.email = email || user.email;
      user.avatar = avatar || user.avatar;
      user.lastLoginAt = new Date();
      await user.save();
      return { user, isNewUser: false };
    } else {
      // 用户不存在，创建新用户
      user = new this({
        feishuUserId: feishuUserId,
        name: name || '未知用户',
        email: email,
        avatar: avatar,
        role: USER_ROLES.EMPLOYEE, // 默认角色为普通员工
        storeId: storeId, // 设置门店ID
        registrationSource: 'feishu',
        lastLoginAt: new Date()
      });
      
      await user.save();
      return { user, isNewUser: true };
    }
  } catch (error) {
    throw new Error(`用户创建或更新失败: ${error.message}`);
  }
};

/**
 * 静态方法：获取所有管理员用户
 */
userSchema.statics.getAdmins = function() {
  return this.find({ role: USER_ROLES.ADMIN, isActive: true });
};

/**
 * 静态方法：获取门店的所有用户
 */
userSchema.statics.getStoreUsers = function(storeId) {
  return this.find({ storeId: storeId, isActive: true });
};

const User = mongoose.model('User', userSchema);

// 导出模型和常量
module.exports = {
  User,
  USER_ROLES
};
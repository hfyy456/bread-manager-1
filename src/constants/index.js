/**
 * 应用常量定义
 * 集中管理所有常量，提高代码可维护性
 */

// 申请状态映射
export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};

export const STATUS_MAP = {
  [REQUEST_STATUS.PENDING]: '待处理',
  [REQUEST_STATUS.APPROVED]: '已批准',
  [REQUEST_STATUS.REJECTED]: '已拒绝',
  [REQUEST_STATUS.COMPLETED]: '已完成'
};

// 状态对应的颜色
export const STATUS_COLORS = {
  [REQUEST_STATUS.PENDING]: 'warning',
  [REQUEST_STATUS.APPROVED]: 'info',
  [REQUEST_STATUS.REJECTED]: 'error',
  [REQUEST_STATUS.COMPLETED]: 'success'
};

// API端点
export const API_ENDPOINTS = {
  TRANSFER_REQUESTS: '/api/transfer-requests',
  STORES: '/api/stores',
  INGREDIENTS: '/api/ingredients',
  WAREHOUSE_STOCK: '/api/ingredients/warehouse-stock',
  INVENTORY: '/api/inventory'
};

// 缓存配置
export const CACHE_CONFIG = {
  WAREHOUSE_STOCK_TTL: 5 * 60 * 1000, // 5分钟
  STORE_INFO_TTL: 30 * 60 * 1000, // 30分钟
  USER_PERMISSIONS_TTL: 15 * 60 * 1000 // 15分钟
};

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1
};

// 加载状态
export const LOADING_STAGES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  FETCHING: 'fetching',
  PROCESSING: 'processing',
  RENDERING: 'rendering'
};

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  UNAUTHORIZED: '未授权访问，请重新登录',
  FORBIDDEN: '权限不足，无法执行此操作',
  NOT_FOUND: '请求的资源未找到',
  VALIDATION_ERROR: '数据验证失败，请检查输入',
  SERVER_ERROR: '服务器内部错误，请稍后重试',
  TIMEOUT_ERROR: '请求超时，请稍后重试'
};

// 成功消息
export const SUCCESS_MESSAGES = {
  REQUEST_CREATED: '申请已成功提交',
  REQUEST_APPROVED: '申请已批准',
  REQUEST_REJECTED: '申请已拒绝',
  DATA_UPDATED: '数据更新成功',
  DATA_DELETED: '数据删除成功'
};

// 用户角色
export const USER_ROLES = {
  ADMIN: 'admin',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  STORE_MANAGER: 'store_manager',
  EMPLOYEE: 'employee'
};

// 权限
export const PERMISSIONS = {
  VIEW_ALL_REQUESTS: 'view_all_requests',
  APPROVE_REQUESTS: 'approve_requests',
  MANAGE_INVENTORY: 'manage_inventory',
  MANAGE_USERS: 'manage_users'
};

// 主题配置
export const THEME_CONFIG = {
  PRIMARY_COLOR: '#8B4513',
  SECONDARY_COLOR: '#F5DEB3',
  NEUTRAL_COLOR: '#F5F5DC',
  SUCCESS_COLOR: '#4CAF50',
  WARNING_COLOR: '#FF9800',
  ERROR_COLOR: '#F44336',
  INFO_COLOR: '#2196F3'
};

// 动画配置
export const ANIMATION_CONFIG = {
  FADE_DURATION: 300,
  SLIDE_DURATION: 250,
  BOUNCE_DURATION: 400,
  STAGGER_DELAY: 50
};

export default {
  REQUEST_STATUS,
  STATUS_MAP,
  STATUS_COLORS,
  API_ENDPOINTS,
  CACHE_CONFIG,
  PAGINATION,
  LOADING_STAGES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  USER_ROLES,
  PERMISSIONS,
  THEME_CONFIG,
  ANIMATION_CONFIG
};
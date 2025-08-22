/**
 * 多应用配置文件
 * 定义各个应用的详细配置信息，包括路由、功能模块、环境变量等
 * @author Sirius
 * @date 2025-01-21
 */

/**
 * 应用类型枚举
 */
export const APP_TYPES = {
  PC: 'pc',
  MOBILE: 'mobile',
  HYBRID: 'hybrid'
};

/**
 * 环境类型枚举
 */
export const ENV_TYPES = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  STAGING: 'staging'
};

/**
 * 多应用配置
 */
export const APPS_CONFIG = {
  // PC端主应用配置
  main: {
    name: '面包管理系统',
    type: APP_TYPES.PC,
    version: '1.0.0',
    description: 'PC端面包管理系统，提供完整的生产、库存、销售管理功能',
    
    // 入口配置
    entry: {
      html: 'index.html',
      js: 'src/index.jsx',
      css: 'src/index.css'
    },
    
    // 路由配置
    routes: {
      base: '/',
      patterns: [
        '/',
        '/dashboard',
        '/production',
        '/inventory',
        '/sales',
        '/reports',
        '/settings'
      ]
    },
    
    // 功能模块
    features: [
      'dashboard',
      'production-management',
      'inventory-management',
      'sales-management',
      'report-generation',
      'user-management',
      'system-settings'
    ],
    
    // 环境变量
    env: {
      [ENV_TYPES.DEVELOPMENT]: {
        API_BASE_URL: 'http://localhost:10099/api',
        DEBUG: true,
        HOT_RELOAD: true
      },
      [ENV_TYPES.PRODUCTION]: {
        API_BASE_URL: '/api',
        DEBUG: false,
        HOT_RELOAD: false
      }
    },
    
    // 构建配置
    build: {
      outputDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: true
    }
  },
  
  // 移动端申领应用配置
  mobile: {
    name: '要货通',
    type: APP_TYPES.MOBILE,
    version: '1.0.0',
    description: '移动端物料申领系统，支持快速申领和审批流程',
    
    // 入口配置
    entry: {
      html: 'mobile.html',
      js: 'src/mobile.jsx',
      css: 'src/mobile.css'
    },
    
    // 路由配置
    routes: {
      base: '/mobile',
      patterns: [
        '/mobile',
        '/mobile/apply',
        '/mobile/approval',
        '/mobile/history',
        '/mobile/profile'
      ]
    },
    
    // 功能模块
    features: [
      'material-application',
      'approval-workflow',
      'application-history',
      'user-profile',
      'feishu-integration'
    ],
    
    // 环境变量
    env: {
      [ENV_TYPES.DEVELOPMENT]: {
        API_BASE_URL: 'http://localhost:10099/api',
        FEISHU_APP_ID: process.env.VITE_FEISHU_APP_ID,
        DEBUG: true,
        MOBILE_DEBUG: true
      },
      [ENV_TYPES.PRODUCTION]: {
        API_BASE_URL: '/api',
        FEISHU_APP_ID: process.env.VITE_FEISHU_APP_ID,
        DEBUG: false,
        MOBILE_DEBUG: false
      }
    },
    
    // 构建配置
    build: {
      outputDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: true,
      // 移动端特定优化
      optimization: {
        splitChunks: true,
        treeShaking: true,
        compression: 'gzip'
      }
    }
  },
  
  // 移动端首页应用配置
  mobileHome: {
    name: '面包管理系统 - 移动端首页',
    type: APP_TYPES.MOBILE,
    version: '1.0.0',
    description: '移动端首页，提供生产报损统计、库存盘点、数据统计等功能入口',
    
    // 入口配置
    entry: {
      html: 'mobile-home.html',
      js: 'src/mobile-home.jsx',
      css: 'src/mobile-home.css'
    },
    
    // 路由配置
    routes: {
      base: '/mobileHome',
      patterns: [
        '/',
        '/mobileHome',
        '/mobileHome/production-loss',
        '/mobileHome/loss-register',
        '/mobileHome/inventory-check',
        '/mobileHome/statistics'
      ]
    },
    
    // 功能模块
    features: [
      'mobile-homepage',
      'production-loss-stats',
      'loss-registration',
      'inventory-check',
      'data-statistics',
      'feishu-integration'
    ],
    
    // 环境变量
    env: {
      [ENV_TYPES.DEVELOPMENT]: {
        API_BASE_URL: 'http://localhost:10099/api',
        FEISHU_APP_ID: process.env.VITE_FEISHU_APP_ID,
        DEBUG: true,
        MOBILE_DEBUG: true
      },
      [ENV_TYPES.PRODUCTION]: {
        API_BASE_URL: '/api',
        FEISHU_APP_ID: process.env.VITE_FEISHU_APP_ID,
        DEBUG: false,
        MOBILE_DEBUG: false
      }
    },
    
    // 构建配置
    build: {
      outputDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: true,
      // 移动端特定优化
      optimization: {
        splitChunks: true,
        treeShaking: true,
        compression: 'gzip',
        // 针对移动端的额外优化
        imageOptimization: true,
        cssMinification: true
      }
    }
  }
};

/**
 * 获取应用配置
 * @param {string} appName - 应用名称
 * @param {string} env - 环境类型
 * @returns {Object} 应用配置
 */
export function getAppConfig(appName, env = ENV_TYPES.DEVELOPMENT) {
  const config = APPS_CONFIG[appName];
  if (!config) {
    throw new Error(`未找到应用配置: ${appName}`);
  }
  
  return {
    ...config,
    currentEnv: env,
    envConfig: config.env[env] || config.env[ENV_TYPES.DEVELOPMENT]
  };
}

/**
 * 获取所有应用列表
 * @returns {Array} 应用列表
 */
export function getAllApps() {
  return Object.keys(APPS_CONFIG).map(appName => ({
    name: appName,
    ...APPS_CONFIG[appName]
  }));
}

/**
 * 根据类型获取应用列表
 * @param {string} type - 应用类型
 * @returns {Array} 应用列表
 */
export function getAppsByType(type) {
  return getAllApps().filter(app => app.type === type);
}

/**
 * 验证应用配置
 * @param {string} appName - 应用名称
 * @returns {boolean} 配置是否有效
 */
export function validateAppConfig(appName) {
  const config = APPS_CONFIG[appName];
  if (!config) {
    return false;
  }
  
  // 检查必需字段
  const requiredFields = ['name', 'type', 'entry', 'routes'];
  return requiredFields.every(field => config[field]);
}

export default APPS_CONFIG;
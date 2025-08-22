/**
 * Vite 多应用入口配置
 * 支持PC端主应用、移动端申领应用、移动端首页应用的独立构建和开发
 * @author Sirius
 * @date 2025-01-21
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import path from 'path';

/**
 * 多应用入口配置
 * 每个应用都有独立的HTML入口文件和对应的JavaScript入口
 */
const multiAppConfig = {
  // PC端主应用 - 面包管理系统主界面
  main: {
    html: resolve(__dirname, 'index.html'),
    entry: resolve(__dirname, 'src/index.jsx'),
    title: '面包管理系统',
    description: 'PC端面包管理系统，提供完整的生产、库存、销售管理功能'
  },
  // 移动端申领应用 - 物料申领和审批
  mobile: {
    html: resolve(__dirname, 'mobile.html'),
    entry: resolve(__dirname, 'src/mobile.jsx'),
    title: '要货通',
    description: '移动端物料申领系统，支持快速申领和审批流程'
  },
  // 移动端首页应用 - 移动端功能入口
  mobileHome: {
    html: resolve(__dirname, 'mobile-home.html'),
    entry: resolve(__dirname, 'src/mobile-home.jsx'),
    title: '面包管理系统 - 移动端首页',
    description: '移动端首页，提供生产报损统计、库存盘点、数据统计等功能入口'
  }
};

/**
 * Vite 多应用配置
 * 基于多应用入口配置生成完整的Vite配置
 */
export default defineConfig({
  plugins: [
    react()
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@api': path.resolve(__dirname, './src/api'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  
  server: {
    port: 10098,
    host: true, // 允许外部访问
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:10099',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
    },
    // 多应用路由重写规则
    historyApiFallback: {
      rewrites: [
        // 移动端首页路由重写 - 优先级最高
        { from: /^\/mobileHome/, to: '/mobile-home.html' },
        // 移动端申领路由重写
        { from: /^\/mobile/, to: '/mobile.html' },
        // PC端路由重写 - 默认fallback
        { from: /.*/, to: '/index.html' },
      ],
    },
  },
  
  build: {
    // 构建输出目录
    outDir: 'dist',
    // 静态资源目录
    assetsDir: 'assets',
    // 生成sourcemap用于调试
    sourcemap: process.env.NODE_ENV === 'development',
    // 代码分割阈值
    chunkSizeWarningLimit: 1000,
    // Rollup配置
    rollupOptions: {
      // 多应用入口配置
      input: Object.fromEntries(
        Object.entries(multiAppConfig).map(([key, config]) => [
          key,
          config.html
        ])
      ),
      output: {
        // 代码分割配置
        manualChunks: {
          // 将React相关库打包到vendor chunk
          vendor: ['react', 'react-dom'],
          // 将Material-UI相关库打包到mui chunk
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // 将路由相关库打包到router chunk
          router: ['react-router-dom'],
          // 将工具库打包到utils chunk
          utils: ['date-fns', 'lodash']
        },
        // 文件命名规则
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production'
      }
    }
  },
  
  // 环境变量配置
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  
  // 优化配置
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material',
      'react-router-dom',
      'date-fns'
    ]
  }
});
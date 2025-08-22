const express = require('express');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db'); // 引入数据库连接函数
// const sampleRoutes = require('./routes/sampleRoutes'); // 移除旧的示例路由
const ingredientRoutes = require('./routes/ingredientRoutes'); // 引入原料路由
const inventoryRoutes = require('./routes/inventoryRoutes'); // 新增：引入盘点路由
const dailyReportRoutes = require('./routes/dailyReportRoutes'); // 引入日报表路由
const dashboardRoutes = require('./routes/dashboardRoutes'); // Added dashboardRoutes import
const receivingRoutes = require('./routes/receivingRoutes'); // Import the new route
const breadTypeRoutes = require('./routes/breadTypeRoutes');
const fillingRecipeRoutes = require('./routes/fillingRecipeRoutes');
const doughRecipeRoutes = require('./routes/doughRecipeRoutes');
const ingredientsCompareRoutes = require('./routes/ingredients.js'); // 新增对比路由
const storeRoutes = require('./routes/storeRoutes'); // 新增门店路由
const warehouseRoutes = require('./routes/warehouseRoutes'); // 1. 引入仓库路由
const transferRequestRoutes = require('./routes/transferRequestRoutes'); // For mobile requests
const feishuRoutes = require('./routes/feishuRoutes'); // For Feishu integration
const productionPlanRoutes = require('./routes/productionPlanRoutes'); // 引入生产计划路由
const storeProductRoutes = require('./routes/storeProduct'); // 引入产品上下架路由
const productionLossRoutes = require('./routes/productionLossRoutes'); // 引入生产报损路由
const expenseRoutes = require('./routes/expenseRoutes'); // 引入支出路由

const authMiddleware = require('./middleware/authMiddleware'); // 引入模拟认证中间件
const { performanceMiddleware, startPerformanceReporting } = require('./middleware/performanceMiddleware'); // 性能监控
const logger = require('./utils/logger'); // 日志工具

const app = express();
const port = process.env.PORT || 10099;

// --- 连接到数据库 ---
connectDB();

// --- 中间件 ---
app.use(express.json()); // 解析 JSON 请求体

// 性能监控中间件
app.use(performanceMiddleware);

// 全局应用模拟认证中间件。所有API请求都将带有一个模拟的 req.user 对象
app.use('/api', authMiddleware);

// React应用的构建输出目录 (位于项目根目录下的 build 文件夹)
const reactBuildDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(reactBuildDir, 'index.html');

// --- API 路由 ---
// app.use('/api', sampleRoutes); // 移除旧的示例路由使用
app.use('/api', storeRoutes); // 使用门店路由
app.use('/api/ingredients', ingredientRoutes); // 使用原料路由，所有 /api/ingredients/* 的请求将由此处理
app.use('/api/inventory', inventoryRoutes); // 新增：使用盘点路由，所有 /api/inventory/* 的请求将由此处理
app.use('/api/daily-reports', dailyReportRoutes); // 使用日报表路由
app.use('/api/dashboard', dashboardRoutes); // Added dashboardRoutes usage
app.use('/api/receiving', receivingRoutes); // Use the new route
app.use('/api/bread-types', breadTypeRoutes);
app.use('/api/filling-recipes', fillingRecipeRoutes);
app.use('/api/dough-recipes', authMiddleware, doughRecipeRoutes);
app.use('/api/ingredients', ingredientsCompareRoutes); // 新增对比路由
app.use('/api/warehouse', authMiddleware, warehouseRoutes); // 2. 注册仓库路由
app.use('/api/transfer-requests', transferRequestRoutes); // Register the new route
app.use('/api/production-plans', authMiddleware, productionPlanRoutes); // 注册生产计划路由
app.use('/api/store-products', storeProductRoutes); // 注册产品上下架路由
app.use('/api/production-loss', productionLossRoutes); // 注册生产报损路由
app.use('/api/expense', expenseRoutes); // 注册支出路由
app.use('/api/feishu', feishuRoutes);
// 您可以在这里添加其他路由模块，例如:
// const userRoutes = require('./routes/userRoutes');
// app.use('/api/users', userRoutes);


// --- 静态文件服务和 React 应用的 Catch-all (仅当构建文件存在时) ---
if (fs.existsSync(indexPath)) {
  console.log('React 构建文件找到，将提供静态文件服务: ' + reactBuildDir);
  // 托管 reactBuildDir 目录中的静态文件
  app.use(express.static(reactBuildDir));

  // --- Specific handler for the mobile entry point ---
  const mobilePath = path.join(reactBuildDir, 'mobile.html');
  if (fs.existsSync(mobilePath)) {
    app.get('/mobile.html', (req, res) => {
      res.sendFile(mobilePath);
    });
    console.log('移动端入口 mobile.html 已找到并配置。');
  } else {
    console.warn('警告: 在 build 目录中未找到 mobile.html。');
  }

  // --- Mobile home entry point handler ---
  const mobileHomePath = path.join(reactBuildDir, 'mobile-home.html');
  if (fs.existsSync(mobileHomePath)) {
    // Handle /mobileHome and /mobileHome/* routes
    app.get('/mobileHome*', (req, res) => {
      res.sendFile(mobileHomePath);
    });
    console.log('移动端首页入口 mobile-home.html 已找到并配置 /mobileHome 路由。');
  } else {
    console.warn('警告: 在 build 目录中未找到 mobile-home.html。');
  }





  // 对于所有其他GET请求，都返回React应用的相应HTML文件
  // 这对于处理React Router的客户端路由至关重要
  app.get(/.*/, (req, res) => {
    // 确保请求不是针对API的，以避免覆盖API路由 (尽管express.static通常会先处理)
    if (req.originalUrl.startsWith('/api/')) {
      // 如果API路由没有匹配到，则返回404
      return res.status(404).json({ message: 'API 终结点未找到' });
    }
    
    // 根据请求路径返回相应的HTML文件
    if (req.originalUrl.startsWith('/mobile-home.html')) {
      const mobileHomePath = path.join(reactBuildDir, 'mobile-home.html');
      if (fs.existsSync(mobileHomePath)) {
        return res.sendFile(mobileHomePath);
      }
    }
    
    // Handle /mobileHome routes (already handled above, but kept for fallback)
    if (req.originalUrl.startsWith('/mobileHome')) {
      const mobileHomePath = path.join(reactBuildDir, 'mobile-home.html');
      if (fs.existsSync(mobileHomePath)) {
        return res.sendFile(mobileHomePath);
      }
    }
    
    res.sendFile(indexPath);
   });
} else {
  console.warn('警告：React 构建目录 ' + reactBuildDir + ' 或 ' + indexPath + ' 未找到。');
  console.warn('Express 服务器将仅提供 API 服务。如果您需要提供前端文件，请先运行 npm run build。');
  // 如果构建文件不存在，对于非API的GET请求可以返回一个提示信息或404
  app.get(/.*/, (req, res) => {
    if (!req.originalUrl.startsWith('/api/')) {
      res.status(404).send('React application not built. Run `npm run build` and restart server to serve frontend files. API endpoints are active.');
    }
    // 如果是API路径但未匹配到，让它自然地404或由后续中间件处理
  });
}

app.listen(port, () => {
  console.log(`Express 服务器正在监听端口 ${port}`);
  console.log(`React 应用应该可以通过 http://localhost:${port} 访问`);
  console.log(`提供的静态文件目录: ${reactBuildDir}`);
  
  // 启动性能监控报告
  if (process.env.NODE_ENV === 'production') {
    startPerformanceReporting(30); // 每30分钟生成一次性能报告
    logger.info('Performance monitoring started');
  }
  
  logger.info('Server started successfully', {
    port,
    environment: process.env.NODE_ENV || 'development',
    buildDir: reactBuildDir
  });
});
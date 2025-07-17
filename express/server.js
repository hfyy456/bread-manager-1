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

const { mockAuthMiddleware } = require('./middleware/authMiddleware'); // 引入模拟认证中间件

const app = express();
const port = process.env.PORT || 10099;

// --- 连接到数据库 ---
connectDB();

// --- 中间件 ---
app.use(express.json()); // 解析 JSON 请求体

// 全局应用模拟认证中间件。所有API请求都将带有一个模拟的 req.user 对象
app.use('/api', mockAuthMiddleware);

// React应用的构建输出目录 (位于项目根目录下的 build 文件夹)
const reactBuildDir = path.resolve(__dirname, '..', 'build');
const indexPath = path.join(reactBuildDir, 'index.html');

// --- API 路由 ---
// app.use('/api', sampleRoutes); // 移除旧的示例路由使用
app.use('/api', storeRoutes); // 使用门店路由
app.use('/api', ingredientRoutes); // 使用原料路由，所有 /api/ingredients/* 的请求将由此处理
app.use('/api/inventory', inventoryRoutes); // 新增：使用盘点路由，所有 /api/inventory/* 的请求将由此处理
app.use('/api/daily-reports', dailyReportRoutes); // 使用日报表路由
app.use('/api/dashboard', dashboardRoutes); // Added dashboardRoutes usage
app.use('/api/receiving', receivingRoutes); // Use the new route
app.use('/api', breadTypeRoutes);
app.use('/api', fillingRecipeRoutes);
app.use('/api', doughRecipeRoutes);
app.use('/api/ingredients', ingredientsCompareRoutes); // 新增对比路由
// 您可以在这里添加其他路由模块，例如:
// const userRoutes = require('./routes/userRoutes');
// app.use('/api/users', userRoutes);


// --- 静态文件服务和 React 应用的 Catch-all (仅当构建文件存在时) ---
if (fs.existsSync(indexPath)) {
  console.log('React 构建文件找到，将提供静态文件服务: ' + reactBuildDir);
  // 托管 reactBuildDir 目录中的静态文件
  app.use(express.static(reactBuildDir));

  // 对于所有其他GET请求，都返回React应用的index.html
  // 这对于处理React Router的客户端路由至关重要
  app.get(/.*/, (req, res) => {
    // 确保请求不是针对API的，以避免覆盖API路由 (尽管express.static通常会先处理)
    if (req.originalUrl.startsWith('/api/')) {
      // 如果API路由没有匹配到，则返回404
      return res.status(404).json({ message: 'API 终结点未找到' });
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
}); 
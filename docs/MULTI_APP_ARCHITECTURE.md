# 多应用入口架构文档

## 概述

本项目采用 Vite 多应用入口配置，支持在同一个代码库中管理多个独立的应用。每个应用都有自己的入口文件、路由配置和构建输出，实现了代码复用的同时保持了应用的独立性。

## 应用架构

### 应用列表

| 应用名称 | 类型 | 入口文件 | 路由前缀 | 描述 |
|---------|------|----------|----------|------|
| main | PC端 | index.html | / | 面包管理系统主界面 |
| mobile | 移动端 | mobile.html | /mobile | 要货通 - 物料申领系统 |
| mobileHome | 移动端 | mobile-home.html | /mobileHome | 移动端功能首页 |

### 目录结构

```
bread-manager/
├── src/
│   ├── index.jsx              # PC端主应用入口
│   ├── mobile.jsx             # 移动端申领应用入口
│   ├── mobile-home.jsx        # 移动端首页应用入口
│   ├── components/            # 共享组件
│   ├── pages/                 # 页面组件
│   │   ├── pc/               # PC端页面
│   │   └── mobile/           # 移动端页面
│   ├── hooks/                # 自定义Hooks
│   ├── contexts/             # React Context
│   ├── utils/                # 工具函数
│   └── api/                  # API接口
├── public/
├── config/
│   └── apps.config.js        # 应用配置文件
├── scripts/
│   └── build-apps.js         # 多应用构建脚本
├── docs/
│   └── MULTI_APP_ARCHITECTURE.md
├── index.html                # PC端HTML模板
├── mobile.html               # 移动端申领HTML模板
├── mobile-home.html          # 移动端首页HTML模板
├── vite.config.js            # Vite配置文件
└── package.json
```

## 配置说明

### Vite 配置 (vite.config.js)

```javascript
// 多应用入口配置
const multiAppConfig = {
  main: {
    html: resolve(__dirname, 'index.html'),
    entry: resolve(__dirname, 'src/index.jsx'),
    title: '面包管理系统'
  },
  mobile: {
    html: resolve(__dirname, 'mobile.html'),
    entry: resolve(__dirname, 'src/mobile.jsx'),
    title: '要货通'
  },
  mobileHome: {
    html: resolve(__dirname, 'mobile-home.html'),
    entry: resolve(__dirname, 'src/mobile-home.jsx'),
    title: '面包管理系统 - 移动端首页'
  }
};
```

### 路由重写规则

开发环境下，Vite 会根据访问路径自动重写到对应的HTML文件：

```javascript
historyApiFallback: {
  rewrites: [
    { from: /^\/mobileHome/, to: '/mobile-home.html' },
    { from: /^\/mobile/, to: '/mobile.html' },
    { from: /.*/, to: '/index.html' }
  ]
}
```

### Express 服务器配置

生产环境下，Express 服务器会根据路由规则提供对应的静态文件：

```javascript
// 移动端首页路由
app.get('/mobileHome*', (req, res) => {
  res.sendFile(path.join(reactBuildDir, 'mobile-home.html'));
});

// 移动端申领路由
app.get('/mobile*', (req, res) => {
  res.sendFile(path.join(reactBuildDir, 'mobile.html'));
});

// PC端路由（默认）
app.get('*', (req, res) => {
  res.sendFile(path.join(reactBuildDir, 'index.html'));
});
```

## 构建系统

### NPM 脚本

```json
{
  "scripts": {
    "build": "vite build",
    "build:main": "node scripts/build-apps.js main",
    "build:mobile": "node scripts/build-apps.js mobile",
    "build:mobile-home": "node scripts/build-apps.js mobileHome",
    "build:all": "node scripts/build-apps.js --all",
    "build:clean": "node scripts/build-apps.js --clean --all"
  }
}
```

### 构建脚本使用

```bash
# 构建单个应用
npm run build:main          # 构建PC端主应用
npm run build:mobile        # 构建移动端申领应用
npm run build:mobile-home   # 构建移动端首页应用

# 构建所有应用
npm run build:all           # 构建所有应用
npm run build:clean         # 清理后构建所有应用

# 使用构建脚本
node scripts/build-apps.js main                    # 构建指定应用
node scripts/build-apps.js --all                   # 构建所有应用
node scripts/build-apps.js --clean main            # 清理后构建
node scripts/build-apps.js --help                  # 显示帮助
```

## 开发指南

### 添加新应用

1. **创建HTML模板**
   ```html
   <!-- new-app.html -->
   <!DOCTYPE html>
   <html lang="zh-CN">
   <head>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     <title>新应用</title>
   </head>
   <body>
     <div id="root"></div>
     <script type="module" src="/src/new-app.jsx"></script>
   </body>
   </html>
   ```

2. **创建应用入口**
   ```jsx
   // src/new-app.jsx
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import { BrowserRouter } from 'react-router-dom';
   import NewApp from './pages/NewApp';
   
   ReactDOM.createRoot(document.getElementById('root')).render(
     <BrowserRouter>
       <NewApp />
     </BrowserRouter>
   );
   ```

3. **更新Vite配置**
   ```javascript
   const multiAppConfig = {
     // ... 现有配置
     newApp: {
       html: resolve(__dirname, 'new-app.html'),
       entry: resolve(__dirname, 'src/new-app.jsx'),
       title: '新应用'
     }
   };
   ```

4. **添加路由重写规则**
   ```javascript
   historyApiFallback: {
     rewrites: [
       { from: /^\/newApp/, to: '/new-app.html' },
       // ... 其他规则
     ]
   }
   ```

5. **更新Express路由**
   ```javascript
   app.get('/newApp*', (req, res) => {
     res.sendFile(path.join(reactBuildDir, 'new-app.html'));
   });
   ```

6. **添加构建脚本**
   ```json
   {
     "scripts": {
       "build:new-app": "node scripts/build-apps.js newApp"
     }
   }
   ```

### 共享代码管理

- **组件共享**: 将通用组件放在 `src/components/` 目录
- **工具函数**: 将工具函数放在 `src/utils/` 目录
- **API接口**: 将API接口放在 `src/api/` 目录
- **样式共享**: 将通用样式放在 `src/styles/` 目录

### 环境变量管理

每个应用可以有独立的环境变量配置：

```javascript
// config/apps.config.js
export const APPS_CONFIG = {
  main: {
    env: {
      development: {
        API_BASE_URL: 'http://localhost:10099/api',
        DEBUG: true
      },
      production: {
        API_BASE_URL: '/api',
        DEBUG: false
      }
    }
  }
};
```

## 部署说明

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 访问不同应用
http://localhost:10098/           # PC端主应用
http://localhost:10098/mobile     # 移动端申领应用
http://localhost:10098/mobileHome # 移动端首页应用
```

### 生产环境

```bash
# 构建所有应用
npm run build:all

# 启动生产服务器
npm run serve

# 访问不同应用
http://localhost:10099/           # PC端主应用
http://localhost:10099/mobile     # 移动端申领应用
http://localhost:10099/mobileHome # 移动端首页应用
```

## 性能优化

### 代码分割

```javascript
// vite.config.js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        mui: ['@mui/material', '@mui/icons-material'],
        router: ['react-router-dom'],
        utils: ['date-fns', 'lodash']
      }
    }
  }
}
```

### 资源优化

- **图片优化**: 使用 WebP 格式，启用懒加载
- **字体优化**: 使用字体子集，启用字体显示优化
- **CSS优化**: 启用CSS压缩和Tree Shaking
- **JavaScript优化**: 启用代码压缩和混淆

## 最佳实践

1. **应用隔离**: 每个应用应该有独立的状态管理和路由
2. **代码复用**: 通过共享组件和工具函数实现代码复用
3. **性能监控**: 为每个应用配置独立的性能监控
4. **错误处理**: 实现应用级别的错误边界
5. **测试策略**: 为每个应用编写独立的测试用例

## 故障排除

### 常见问题

1. **路由不匹配**: 检查路由重写规则和Express路由配置
2. **资源加载失败**: 检查静态资源路径和构建输出
3. **应用间冲突**: 确保应用间的状态隔离
4. **构建失败**: 检查依赖版本和配置文件

### 调试技巧

1. **开启调试模式**: 设置 `DEBUG=true` 环境变量
2. **查看构建日志**: 使用 `--verbose` 参数
3. **分析包大小**: 使用 `npm run build -- --analyze`
4. **性能分析**: 使用浏览器开发者工具

## 更新日志

- **v1.0.0** (2025-01-21): 初始版本，支持三个应用的多入口配置
- 后续版本将根据需求添加新功能和优化

---

*本文档会随着项目的发展持续更新，请关注最新版本。*
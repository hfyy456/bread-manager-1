/*
 * @Author: Sirius 540363975@qq.com
 * @Date: 2025-08-22 23:53:53
 * @LastEditors: Sirius 540363975@qq.com
 * @LastEditTime: 2025-08-23 04:15:03
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './components/StoreContext';
import MobileHomePage from './pages/mobile/MobileHomePage';
import MobileProductionLossPage from './pages/mobile/MobileProductionLossPage';
import MobileLossRegisterPage from './pages/mobile/MobileLossRegisterPage';
import MobileExpenseStatsPage from './pages/mobile/MobileExpenseStatsPage';
import MobileExpenseRegisterPage from './pages/mobile/MobileExpenseRegisterPage';
import './App.css';

/**
 * 移动端首页入口文件
 * 提供独立的移动端首页应用
 */

// --- URL参数解析和Store参数处理 ---
/**
 * 解析URL参数并处理store参数
 * 支持从URL参数、sessionStorage、localStorage获取storeId
 */
function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const storeIdFromUrl = urlParams.get('storeId') || urlParams.get('store');
  
  // 如果URL中有storeId参数，优先使用并存储到sessionStorage
  if (storeIdFromUrl) {
    sessionStorage.setItem('lockedStoreId', storeIdFromUrl);
    console.log('从URL参数获取storeId:', storeIdFromUrl);
  }
}

// 页面加载时解析URL参数
parseUrlParams();

// --- Global Fetch Override (for Mobile) ---
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  // 优先级1: 从sessionStorage获取为移动端锁定的门店ID (用于单次访问，如二维码)
  const lockedStoreId = sessionStorage.getItem('lockedStoreId');
  // 优先级2: 从localStorage获取用户长期选择的默认门店ID
  const defaultStoreId = localStorage.getItem('defaultStoreId');

  const storeId = lockedStoreId || defaultStoreId;
  
  // 获取用户认证信息
  const feishuUserId = window.feishuUserId || localStorage.getItem('feishuUserId');

  const newOptions = { ...options };
  
  if (!newOptions.headers) {
    newOptions.headers = {};
  }

  // 如果请求头中没有显式设置，则使用我们确定的storeId
  if (storeId && !newOptions.headers['x-current-store-id']) {
    newOptions.headers['x-current-store-id'] = storeId;
  }
  
  // 添加用户认证头
  if (feishuUserId && !newOptions.headers['x-feishu-user-id']) {
    newOptions.headers['x-feishu-user-id'] = feishuUserId;
  }
  
  return originalFetch(url, newOptions);
};
// ------------------------------------

/**
 * 移动端首页应用入口
 * 提供路由配置和全局设置
 */
const MobileHomeApp = () => {
  return (
    <StoreProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="mobile-app">
          <Routes>
            <Route path="/" element={<MobileHomePage />} />
            <Route path="/mobileHome" element={<MobileHomePage />} />
            <Route path="/mobileHome/production-loss" element={<MobileProductionLossPage />} />
            <Route path="/mobileHome/loss-register" element={<MobileLossRegisterPage />} />
            <Route path="/mobileHome/expense-stats" element={<MobileExpenseStatsPage />} />
            <Route path="/mobileHome/expense-register" element={<MobileExpenseRegisterPage />} />
          </Routes>
        </div>
      </Router>
    </StoreProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MobileHomeApp />
  </React.StrictMode>
);
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import MobileRequestPage from './components/MobileRequestPage';
import './App.css';

// --- Global Fetch Override (for Mobile) ---
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  // 优先级1: 从sessionStorage获取为移动端锁定的门店ID (用于单次访问，如二维码)
  const lockedStoreId = sessionStorage.getItem('lockedStoreId');
  // 优先级2: 从localStorage获取用户长期选择的默认门店ID
  const defaultStoreId = localStorage.getItem('defaultStoreId');

  const storeId = lockedStoreId || defaultStoreId;

  const newOptions = { ...options };
  
  if (!newOptions.headers) {
    newOptions.headers = {};
  }

  // 如果请求头中没有显式设置，则使用我们确定的storeId
  if (storeId && !newOptions.headers['x-current-store-id']) {
    newOptions.headers['x-current-store-id'] = storeId;
  }
  
  return originalFetch(url, newOptions);
};
// ------------------------------------

// This is the entry point for the mobile SPA

// A minimal theme provider or CSS baseline could be added here if needed
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MobileRequestPage />
    </BrowserRouter>
  </React.StrictMode>
);
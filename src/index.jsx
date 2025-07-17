import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { StoreProvider } from './components/StoreContext';

// --- Global Fetch Override ---
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  // 优先级 1: 从sessionStorage获取锁定的门店ID
  const lockedStoreId = sessionStorage.getItem('lockedStoreId');
  // 优先级 2: 从localStorage获取常规选择的门店ID
  const regularStoreId = localStorage.getItem('currentStoreId');
  
  const storeId = lockedStoreId || regularStoreId;

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
// -------------------------

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>
); 
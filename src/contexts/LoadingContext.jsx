import React, { createContext, useContext, useState, useCallback } from 'react';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingText, setGlobalLoadingText] = useState('');

  // 设置特定组件的加载状态
  const setLoading = useCallback((key, loading, text = '') => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { loading, text }
    }));
  }, []);

  // 获取特定组件的加载状态
  const getLoading = useCallback((key) => {
    return loadingStates[key] || { loading: false, text: '' };
  }, [loadingStates]);

  // 设置全局加载状态
  const setGlobalLoadingState = useCallback((loading, text = '加载中...') => {
    setGlobalLoading(loading);
    setGlobalLoadingText(text);
  }, []);

  // 检查是否有任何组件在加载
  const hasAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state.loading) || globalLoading;
  }, [loadingStates, globalLoading]);

  // 获取所有正在加载的组件
  const getLoadingComponents = useCallback(() => {
    return Object.entries(loadingStates)
      .filter(([_, state]) => state.loading)
      .map(([key, state]) => ({ key, ...state }));
  }, [loadingStates]);

  const value = {
    setLoading,
    getLoading,
    setGlobalLoadingState,
    hasAnyLoading,
    getLoadingComponents,
    globalLoading,
    globalLoadingText
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      
      {/* 全局加载遮罩 */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2
        }}
        open={globalLoading}
      >
        <CircularProgress color="inherit" size={60} />
        {globalLoadingText && (
          <Typography variant="h6" component="div">
            {globalLoadingText}
          </Typography>
        )}
      </Backdrop>
    </LoadingContext.Provider>
  );
};

// 便捷的Hook，用于特定组件的加载状态管理
export const useComponentLoading = (componentKey) => {
  const { setLoading, getLoading } = useLoading();
  
  const setComponentLoading = useCallback((loading, text = '') => {
    setLoading(componentKey, loading, text);
  }, [setLoading, componentKey]);
  
  const componentLoadingState = getLoading(componentKey);
  
  return {
    loading: componentLoadingState.loading,
    text: componentLoadingState.text,
    setLoading: setComponentLoading
  };
};

export default LoadingContext;
import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../components/StoreContext';
import { warehousePerformance } from '../utils/performanceMonitor';

/**
 * 主仓库存数据管理Hook
 * 提供优化的主仓库存数据加载和缓存
 */
export const useWarehouseStock = () => {
  const { currentStore } = useStore();
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadingStage, setLoadingStage] = useState('idle'); // 'idle', 'connecting', 'fetching', 'processing'
  const [progress, setProgress] = useState(0);
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);

  // 缓存键
  const getCacheKey = useCallback(() => {
    return currentStore?._id ? `warehouse-stock-${currentStore._id}` : null;
  }, [currentStore]);

  // 从缓存获取数据
  const getCachedData = useCallback(() => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return null;
    
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return null;
    
    // 检查缓存是否过期（5分钟）
    const now = Date.now();
    if (now - cached.timestamp > 5 * 60 * 1000) {
      cacheRef.current.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }, [getCacheKey]);

  // 设置缓存数据
  const setCachedData = useCallback((data) => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return;
    
    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }, [getCacheKey]);

  // 获取主仓库存数据
  const fetchWarehouseStock = useCallback(async (forceRefresh = false) => {
    if (!currentStore) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 检查缓存
    if (!forceRefresh) {
      const cachedData = getCachedData();
      if (cachedData) {
        setWarehouseStock(cachedData.items || []);
        setLastUpdated(cachedData.timestamp);
        return cachedData;
      }
    }

    setLoading(true);
    setError(null);
    setLoadingStage('connecting');
    setProgress(0);
    
    // 开始性能监控
    warehousePerformance.startFetch();
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    try {
      // 模拟连接阶段
      setProgress(20);
      
      setLoadingStage('fetching');
      setProgress(40);
      const response = await fetch('/api/ingredients/warehouse-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-store-id': currentStore._id,
        },
        body: JSON.stringify({}),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setProgress(60);
      const result = await response.json();
      
      setLoadingStage('processing');
      setProgress(80);
      
      if (result.success) {
        const stockData = result.data;
        
        // 模拟数据处理时间
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setWarehouseStock(stockData.items || []);
        setLastUpdated(result.timestamp);
        setProgress(100);
        
        // 缓存数据
        setCachedData({
          items: stockData.items || [],
          totalValue: stockData.totalValue || 0,
          count: stockData.count || 0,
          timestamp: result.timestamp
        });
        
        // 结束性能监控
        warehousePerformance.endFetch(stockData.items?.length || 0);
        
        return stockData;
      } else {
        throw new Error(result.message || '获取主仓库存失败');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('主仓库存请求被取消');
        return;
      }
      
      console.error('获取主仓库存错误:', err);
      console.error('当前门店:', currentStore);
      
      // 更详细的错误信息
      let errorMessage = err.message;
      if (err.message.includes('401')) {
        errorMessage = '门店认证失败，请重新选择门店';
      } else if (err.message.includes('500')) {
        errorMessage = '服务器内部错误，请稍后重试';
      } else if (err.message.includes('404')) {
        errorMessage = 'API接口未找到';
      }
      
      setError(errorMessage);
      setWarehouseStock([]);
    } finally {
      setLoading(false);
      setLoadingStage('idle');
      setProgress(0);
      abortControllerRef.current = null;
    }
  }, [currentStore, getCachedData, setCachedData]);

  // 更新单个原料的主仓库存
  const updateWarehouseStock = useCallback((ingredientId, newQuantity) => {
    setWarehouseStock(prev => 
      prev.map(item => 
        item._id === ingredientId 
          ? { 
              ...item, 
              mainWarehouseStock: { 
                ...item.mainWarehouseStock, 
                quantity: newQuantity 
              } 
            }
          : item
      )
    );
    
    // 清除缓存，强制下次重新获取
    const cacheKey = getCacheKey();
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
  }, [getCacheKey]);

  // 清除缓存
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // 初始加载
  useEffect(() => {
    if (currentStore) {
      fetchWarehouseStock();
    }
    
    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentStore, fetchWarehouseStock]);

  return {
    warehouseStock,
    loading,
    error,
    lastUpdated,
    loadingStage,
    progress,
    fetchWarehouseStock,
    updateWarehouseStock,
    clearCache,
    refresh: () => fetchWarehouseStock(true)
  };
};

export default useWarehouseStock;
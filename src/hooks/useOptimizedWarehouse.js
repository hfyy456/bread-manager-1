import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useStore } from '../components/StoreContext';
import { startTimer, endTimer } from '../utils/performanceMonitor';

/**
 * 优化的仓库管理Hook
 * 提供高性能的数据加载、缓存和状态管理
 */
export const useOptimizedWarehouse = () => {
  const { currentStore } = useStore();
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [grandTotal, setGrandTotal] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // 编辑状态管理
  const [editStock, setEditStock] = useState({});
  const [originalStock, setOriginalStock] = useState({});
  const [dirty, setDirty] = useState({});
  
  // 缓存和性能优化
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  
  // 缓存键生成
  const getCacheKey = useCallback(() => {
    return currentStore?._id ? `warehouse-${currentStore._id}` : null;
  }, [currentStore]);

  // 从缓存获取数据
  const getCachedData = useCallback(() => {
    const cacheKey = getCacheKey();
    if (!cacheKey) return null;
    
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return null;
    
    // 检查缓存是否过期（3分钟）
    const now = Date.now();
    if (now - cached.timestamp > 3 * 60 * 1000) {
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

  // 安全的数字解析
  const safeParseFloat = useCallback((val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }, []);

  // 获取仓库库存数据
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
        setGrandTotal(cachedData.grandTotal || 0);
        setLastUpdated(cachedData.timestamp);
        
        // 初始化编辑状态
        const initialStockState = (cachedData.items || []).reduce((acc, item) => {
          acc[item.ingredient._id] = item.mainWarehouseStock?.quantity ?? 0;
          return acc;
        }, {});
        setEditStock(initialStockState);
        setOriginalStock(initialStockState);
        setDirty({});
        
        return cachedData;
      }
    }

    setLoading(true);
    setError('');
    
    // 开始性能监控
    startTimer('warehouse-fetch');
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/warehouse/stock', {
        headers: {
          'x-current-store-id': currentStore._id,
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('获取主仓库库存失败');
      }

      const data = await response.json();
      
      if (data.success) {
        setWarehouseStock(data.items || []);
        setGrandTotal(data.grandTotal || 0);
        setLastUpdated(Date.now());
        
        // 初始化编辑状态
        const initialStockState = (data.items || []).reduce((acc, item) => {
          acc[item.ingredient._id] = item.mainWarehouseStock?.quantity ?? 0;
          return acc;
        }, {});
        setEditStock(initialStockState);
        setOriginalStock(initialStockState);
        setDirty({});
        
        // 缓存数据
        setCachedData({
          items: data.items || [],
          grandTotal: data.grandTotal || 0,
          timestamp: Date.now()
        });
        
        // 结束性能监控
        endTimer('warehouse-fetch', { itemCount: data.items?.length || 0 });
        
        return data;
      } else {
        throw new Error(data.message || '获取仓库库存失败');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('仓库库存请求被取消');
        return;
      }
      
      console.error('获取仓库库存错误:', err);
      setError(err.message);
      setWarehouseStock([]);
      setGrandTotal(0);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [currentStore, getCachedData, setCachedData]);

  // 防抖的库存更新
  const debouncedStockChange = useCallback((ingredientId, value, callback) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      callback(ingredientId, value);
    }, 300); // 300ms防抖
  }, []);

  // 处理库存变更
  const handleStockChange = useCallback((ingredientId, value) => {
    setEditStock(prev => ({
      ...prev,
      [ingredientId]: value
    }));
    setDirty(prev => ({
      ...prev,
      [ingredientId]: true
    }));
  }, []);

  // 批量更新库存
  const bulkUpdateStock = useCallback(async (updates) => {
    if (!currentStore || !Array.isArray(updates) || updates.length === 0) {
      return { success: false, message: '无效的更新数据' };
    }

    setLoading(true);
    startTimer('warehouse-bulk-update');

    try {
      const response = await fetch('/api/warehouse/bulk-update-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-store-id': currentStore._id,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '批量更新失败');
      }

      // 清除缓存，强制重新获取数据
      const cacheKey = getCacheKey();
      if (cacheKey) {
        cacheRef.current.delete(cacheKey);
      }

      // 重新获取数据
      await fetchWarehouseStock(true);
      
      endTimer('warehouse-bulk-update', { updateCount: updates.length });
      
      return { success: true, message: '批量更新成功！' };
    } catch (err) {
      console.error('批量更新库存错误:', err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [currentStore, getCacheKey, fetchWarehouseStock]);

  // 计算变更差异
  const getDiffData = useMemo(() => {
    if (Object.keys(dirty).length === 0) return [];
    
    return warehouseStock
      .map(item => {
        const originalVal = safeParseFloat(originalStock[item.ingredient._id]);
        const currentVal = safeParseFloat(editStock[item.ingredient._id]);
        const diff = currentVal - originalVal;

        if (diff === 0) return null;

        return {
          id: item.ingredient._id,
          name: item.ingredient.name,
          original: originalVal,
          current: currentVal,
          diff: diff,
          unit: item.ingredient.unit,
        };
      })
      .filter(Boolean);
  }, [warehouseStock, originalStock, editStock, dirty, safeParseFloat]);

  // 检查是否有变更
  const hasChanges = useMemo(() => {
    return Object.keys(dirty).length > 0 && getDiffData.length > 0;
  }, [dirty, getDiffData]);

  // 重置编辑状态
  const resetEditState = useCallback(() => {
    setEditStock(originalStock);
    setDirty({});
  }, [originalStock]);

  // 清除缓存
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // 初始化数据加载
  useEffect(() => {
    if (currentStore) {
      fetchWarehouseStock();
    }
    
    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentStore, fetchWarehouseStock]);

  return {
    // 数据状态
    warehouseStock,
    loading,
    error,
    grandTotal,
    lastUpdated,
    
    // 编辑状态
    editStock,
    originalStock,
    dirty,
    hasChanges,
    getDiffData,
    
    // 操作方法
    fetchWarehouseStock,
    handleStockChange: debouncedStockChange.bind(null, null, null, handleStockChange),
    bulkUpdateStock,
    resetEditState,
    clearCache,
    
    // 工具方法
    safeParseFloat,
    refresh: () => fetchWarehouseStock(true)
  };
};

export default useOptimizedWarehouse;
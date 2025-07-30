import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../components/StoreContext';

/**
 * 离线仓库数据管理Hook
 * 提供离线数据缓存和同步功能
 */
export const useOfflineWarehouse = () => {
  const { currentStore } = useStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const syncQueueRef = useRef([]);

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // 网络恢复时自动同步
      syncPendingChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 获取离线存储键
  const getStorageKey = useCallback((key) => {
    return `warehouse_${currentStore?._id}_${key}`;
  }, [currentStore]);

  // 保存数据到本地存储
  const saveToLocalStorage = useCallback((key, data) => {
    try {
      const storageKey = getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        version: '1.0'
      }));
    } catch (error) {
      console.error('保存到本地存储失败:', error);
    }
  }, [getStorageKey]);

  // 从本地存储获取数据
  const getFromLocalStorage = useCallback((key) => {
    try {
      const storageKey = getStorageKey(key);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 检查数据是否过期（24小时）
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (error) {
      console.error('从本地存储获取数据失败:', error);
    }
    return null;
  }, [getStorageKey]);

  // 添加待同步的更改
  const addPendingChange = useCallback((change) => {
    const newChange = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      storeId: currentStore?._id,
      ...change
    };

    setPendingChanges(prev => [...prev, newChange]);
    syncQueueRef.current.push(newChange);

    // 保存到本地存储
    saveToLocalStorage('pendingChanges', [...pendingChanges, newChange]);

    // 如果在线，立即尝试同步
    if (isOnline) {
      syncPendingChanges();
    }
  }, [currentStore, pendingChanges, isOnline, saveToLocalStorage]);

  // 同步待处理的更改
  const syncPendingChanges = useCallback(async () => {
    if (!isOnline || syncQueueRef.current.length === 0) {
      return;
    }

    setSyncStatus('syncing');

    try {
      const changesToSync = [...syncQueueRef.current];
      const syncPromises = changesToSync.map(async (change) => {
        try {
          let response;
          
          switch (change.type) {
            case 'bulkUpdate':
              response = await fetch('/api/warehouse/bulk-update-stock', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-current-store-id': change.storeId,
                },
                body: JSON.stringify({ updates: change.updates }),
              });
              break;
              
            case 'singleUpdate':
              response = await fetch('/api/warehouse/stock', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'x-current-store-id': change.storeId,
                },
                body: JSON.stringify({
                  ingredientId: change.ingredientId,
                  newStock: change.newStock
                }),
              });
              break;
              
            default:
              throw new Error(`未知的更改类型: ${change.type}`);
          }

          if (!response.ok) {
            throw new Error(`同步失败: ${response.status}`);
          }

          return { success: true, changeId: change.id };
        } catch (error) {
          console.error('同步单个更改失败:', error);
          return { success: false, changeId: change.id, error: error.message };
        }
      });

      const results = await Promise.allSettled(syncPromises);
      
      // 处理同步结果
      const successfulChanges = [];
      const failedChanges = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successfulChanges.push(changesToSync[index].id);
        } else {
          failedChanges.push(changesToSync[index]);
        }
      });

      // 移除成功同步的更改
      if (successfulChanges.length > 0) {
        syncQueueRef.current = syncQueueRef.current.filter(
          change => !successfulChanges.includes(change.id)
        );
        
        setPendingChanges(prev => 
          prev.filter(change => !successfulChanges.includes(change.id))
        );

        // 更新本地存储
        saveToLocalStorage('pendingChanges', syncQueueRef.current);
        setLastSyncTime(Date.now());
      }

      setSyncStatus(failedChanges.length > 0 ? 'error' : 'idle');

    } catch (error) {
      console.error('同步过程失败:', error);
      setSyncStatus('error');
    }
  }, [isOnline, saveToLocalStorage]);

  // 强制同步
  const forcSync = useCallback(async () => {
    if (isOnline) {
      await syncPendingChanges();
    }
  }, [isOnline, syncPendingChanges]);

  // 清除所有离线数据
  const clearOfflineData = useCallback(() => {
    try {
      const keys = ['warehouseStock', 'pendingChanges', 'managers'];
      keys.forEach(key => {
        localStorage.removeItem(getStorageKey(key));
      });
      
      setPendingChanges([]);
      syncQueueRef.current = [];
      setLastSyncTime(null);
    } catch (error) {
      console.error('清除离线数据失败:', error);
    }
  }, [getStorageKey]);

  // 获取离线数据统计
  const getOfflineStats = useCallback(() => {
    return {
      isOnline,
      pendingChangesCount: pendingChanges.length,
      syncStatus,
      lastSyncTime,
      hasOfflineData: pendingChanges.length > 0,
      storageUsed: getStorageUsage()
    };
  }, [isOnline, pendingChanges.length, syncStatus, lastSyncTime]);

  // 计算存储使用量
  const getStorageUsage = useCallback(() => {
    try {
      let totalSize = 0;
      const keys = ['warehouseStock', 'pendingChanges', 'managers'];
      
      keys.forEach(key => {
        const storageKey = getStorageKey(key);
        const data = localStorage.getItem(storageKey);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      });
      
      return Math.round(totalSize / 1024); // KB
    } catch (error) {
      return 0;
    }
  }, [getStorageKey]);

  // 初始化时加载待同步的更改
  useEffect(() => {
    const storedChanges = getFromLocalStorage('pendingChanges');
    if (storedChanges && Array.isArray(storedChanges)) {
      setPendingChanges(storedChanges);
      syncQueueRef.current = storedChanges;
    }
  }, [getFromLocalStorage]);

  // 定期同步（每30秒）
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      if (syncQueueRef.current.length > 0) {
        syncPendingChanges();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, syncPendingChanges]);

  return {
    // 状态
    isOnline,
    pendingChanges,
    syncStatus,
    lastSyncTime,
    
    // 方法
    addPendingChange,
    syncPendingChanges,
    forcSync,
    clearOfflineData,
    getOfflineStats,
    
    // 存储方法
    saveToLocalStorage,
    getFromLocalStorage
  };
};

export default useOfflineWarehouse;
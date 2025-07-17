import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const StoreContext = createContext(null);

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const [stores, setStores] = useState([]);
  const [currentStore, setCurrentStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStores = useCallback(async () => {
    try {
      // 在真实应用中，这里应该是一个受保护的端点，返回当前用户有权访问的门店
      // 为简化，我们先创建一个公共的API来获取所有门店列表
      const response = await fetch('/api/stores'); // 假设我们将创建一个获取所有门店的API
      if (!response.ok) {
        throw new Error('获取门店列表失败');
      }
      const result = await response.json();
      if (result.success) {
        setStores(result.data);
        // 默认选择第一个门店
        if (result.data.length > 0) {
          setCurrentStore(result.data[0]);
        }
      } else {
        throw new Error(result.message || '获取门店列表失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const switchStore = (storeId) => {
    const store = stores.find(s => s._id === storeId);
    if (store) {
      setCurrentStore(store);
      // 在真实应用中，可能需要在这里更新后端的session或用户的默认门店设置
      console.log(`Switched to store: ${store.name}`);
    }
  };

  const value = {
    stores,
    currentStore,
    switchStore,
    loading,
    error,
    refetchStores: fetchStores, // 提供一个重新获取的方法
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}; 
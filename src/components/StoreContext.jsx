import React, { createContext, useState, useContext, useEffect } from 'react';

const StoreContext = createContext(null);

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const [stores, setStores] = useState([]);
  const [currentStore, setCurrentStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStoreLocked, setIsStoreLocked] = useState(false);

  useEffect(() => {
    const fetchStoresAndSetInitial = async () => {
      try {
        setLoading(true);

        const urlParams = new URLSearchParams(window.location.search);
        const storeIdFromUrl = urlParams.get('store');
        const storeIdFromSession = sessionStorage.getItem('lockedStoreId');

        // 确定是否要进入锁定模式
        const lockedStoreId = storeIdFromUrl || storeIdFromSession;
        if (lockedStoreId) {
          setIsStoreLocked(true);
          // 如果是通过URL参数新开启的会话，则更新sessionStorage
          if (storeIdFromUrl && storeIdFromUrl !== storeIdFromSession) {
            sessionStorage.setItem('lockedStoreId', storeIdFromUrl);
          }
        }

        const response = await fetch('/api/stores');
        if (!response.ok) throw new Error('获取门店列表失败');
        
        const result = await response.json();
        if (!result.success) throw new Error(result.message || '获取门店列表失败');

        const fetchedStores = result.data;
        setStores(fetchedStores);
        
        if (fetchedStores.length > 0) {
          let storeToSet;
          // 优先级 1: URL参数 或 Session中记住的锁定ID
          if (lockedStoreId) {
            storeToSet = fetchedStores.find(s => s._id === lockedStoreId);
            if (!storeToSet) {
              console.error(`锁定的门店ID "${lockedStoreId}" 无效，将使用默认门店。`);
              sessionStorage.removeItem('lockedStoreId'); // 清除无效的ID
              setIsStoreLocked(false);
              // Fallback to localStorage or nothing
              const savedStoreId = localStorage.getItem('currentStoreId');
              storeToSet = fetchedStores.find(s => s._id === savedStoreId);
            }
          } else {
            // 优先级 2: LocalStorage
            const savedStoreId = localStorage.getItem('currentStoreId');
            storeToSet = fetchedStores.find(s => s._id === savedStoreId); // No fallback to first item
          }
          
          setCurrentStore(storeToSet);

          // 仅在常规（未锁定）模式下，并且成功确定了门店的情况下，才同步localStorage
          if (!lockedStoreId && storeToSet && localStorage.getItem('currentStoreId') !== storeToSet._id) {
            localStorage.setItem('currentStoreId', storeToSet._id);
          }
        } else {
          // 如果没有门店，确保 currentStore 为 null
          setCurrentStore(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoresAndSetInitial();
  }, []);

  const switchStore = (storeId) => {
    if (isStoreLocked) {
      return;
    }

    const store = stores.find(s => s._id === storeId);
    if (store && store._id !== currentStore?._id) {
      localStorage.setItem('currentStoreId', store._id);
      window.location.reload();
    }
  };

  const value = {
    stores,
    currentStore,
    switchStore,
    loading,
    error,
    isStoreLocked,
    refetchStores: () => window.location.reload(),
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}; 
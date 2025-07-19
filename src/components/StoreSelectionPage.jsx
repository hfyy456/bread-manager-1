import React from 'react';
import { useStore } from './StoreContext';
import './StoreSelectionPage.css';

const StoreSelectionPage = () => {
  const { stores, switchStore, loading, error } = useStore();

  if (loading) {
    return <div className="store-selection-container"><h2>加载门店列表中...</h2></div>;
  }

  if (error) {
    return <div className="store-selection-container"><h2>加载失败: {error}</h2></div>;
  }

  return (
    <div className="store-selection-container">
      <div className="store-selection-box">
        <h1>请选择您的门店</h1>
        <div className="stores-list">
          {stores.map(store => (
            <button 
              key={store._id} 
              className="store-button"
              onClick={() => switchStore(store._id)}
            >
              {store.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoreSelectionPage; 
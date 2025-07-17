import React from 'react';
import ReactDOM from 'react-dom/client';
import MobileRequestPage from './components/MobileRequestPage';
import './App.css'; 

// This is the entry point for the mobile SPA

// A minimal theme provider or CSS baseline could be added here if needed
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MobileRequestPage />
  </React.StrictMode>
); 
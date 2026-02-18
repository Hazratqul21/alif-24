import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * MainPlatform Entry Point
 * Main application for alif24.uz
 */

// Global alert replacement for better UX
window.appAlert = function(message) {
  try {
    console.log("appAlert:", message);
    window.dispatchEvent(new CustomEvent('appAlert', { detail: { message } }));
  } catch (e) {
    console.log(message);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

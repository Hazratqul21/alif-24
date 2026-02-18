import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * CRM Platform Entry Point
 * Teacher-Student-Organization Management
 */

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

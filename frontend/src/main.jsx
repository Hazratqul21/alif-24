import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'

// Non-blocking global alert replacement to avoid native modal dialogs
window.appAlert = function(message) {
  try {
    // Prefer console + CustomEvent so UI can listen and show toasts if implemented
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

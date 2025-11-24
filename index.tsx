import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Safer polyfill for browser environments
if (typeof window !== 'undefined') {
  if (typeof process === 'undefined') {
    (window as any).process = { env: {} };
  } else if (!process.env) {
    (process as any).env = {};
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
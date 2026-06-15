import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // Design tokens + base styles

// React 19: createRoot (concurrent features)
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
import React from 'react';
import { createRoot } from 'react-dom/client';
import { KODAN_UI_VERSION } from '@kodan-apps/ui-core';

const App = () => {
  return (
    <div>
      <h1>kodanCRM</h1>
      <p>UI Core Versión: {KODAN_UI_VERSION}</p>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

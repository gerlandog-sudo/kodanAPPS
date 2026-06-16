import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kodan-apps/ui-core': path.resolve(__dirname, '../../packages/ui-core/src/index.ts')
    }
  },
  server: {
    port: 5175,
    host: true
  }
});

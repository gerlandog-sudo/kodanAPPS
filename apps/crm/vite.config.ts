import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@kodan-apps/ui-core': path.resolve(__dirname, '../../packages/ui-core/src/index.ts')
    }
  },
  server: {
    port: 5174,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-recharts': ['recharts'],
          'vendor-dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
});

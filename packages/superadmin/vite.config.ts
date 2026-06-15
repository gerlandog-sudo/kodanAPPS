import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-fonts',
      writeBundle() {
        const srcDir = path.resolve(__dirname, '../ui-core/public/fonts');
        const destDir = path.resolve(__dirname, 'dist/fonts');
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }
        const fonts = [
          'Montserrat-400-Latin.woff2',
          'Montserrat-500-Latin.woff2',
          'Montserrat-600-Latin.woff2',
          'Montserrat-700-Latin.woff2',
        ];
        fonts.forEach(f => {
          const src = path.join(srcDir, f);
          const dest = path.join(destDir, f);
          if (existsSync(src)) {
            copyFileSync(src, dest);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Aliases para desarrollo en caliente (Blueprint 1.F)
      '@kodan-apps/ui-core': path.resolve(__dirname, '../ui-core/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Cache busting automático via hash en nombres de archivo
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://api',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
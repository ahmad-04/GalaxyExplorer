import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/client',
    sourcemap: true,
    target: 'esnext',
    assetsDir: 'drawwitdrawing-assets',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'drawwitdrawing.html'),
      },
      output: {
        entryFileNames: `drawwitdrawing-assets/[name].js`,
        chunkFileNames: `drawwitdrawing-assets/[name]-[hash].js`,
        assetFileNames: `drawwitdrawing-assets/[name]-[hash][extname]`,
      },
    },
  },
});

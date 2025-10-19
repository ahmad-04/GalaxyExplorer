import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/client',
    sourcemap: true,
    target: 'esnext',
    assetsDir: 'drawwitInline-assets',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'drawwitInline.html'),
      },
      output: {
        entryFileNames: `drawwit-assets/[name].js`,
        chunkFileNames: `drawwit-assets/[name]-[hash].js`,
        assetFileNames: `drawwit-assets/[name]-[hash][extname]`,
      },
    },
  },
});

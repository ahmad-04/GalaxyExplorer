import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/client',
    sourcemap: true,
    target: 'esnext',
    assetsDir: 'guessitInline-assets',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'guessitInline.html'),
      },
      output: {
        entryFileNames: `guessit-assets/[name].js`,
        chunkFileNames: `guessit-assets/[name]-[hash].js`,
        assetFileNames: `guessit-assets/[name]-[hash][extname]`,
      },
    },
  },
});

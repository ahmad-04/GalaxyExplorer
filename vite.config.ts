import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/main.tsx',
      name: 'main',
      fileName: 'main',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['@devvit/public-api', '@devvit/public-api/jsx-runtime'],
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@devvit/public-api',
  },
});

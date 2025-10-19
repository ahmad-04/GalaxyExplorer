import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/main.jsx',
      name: 'main',
      fileName: 'main',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['@devvit/public-api', '@devvit/public-api/jsx-runtime'],
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@devvit/public-api',
  },
});

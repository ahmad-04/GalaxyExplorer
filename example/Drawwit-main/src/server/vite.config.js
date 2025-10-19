import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import path from 'node:path';

export default defineConfig({
  // 👉 fuerza a Vite a empaquetar TODAS las deps npm (express, @devvit/*, etc.)
  ssr: {
    noExternal: true,
  },
  build: {
    // usa tu entry JS
    ssr: path.resolve(__dirname, 'index.js'),
    outDir: '../../dist/server',
    // igual que el config que te funciona
    emptyOutDir: false,
    target: 'node22',
    sourcemap: true,
    rollupOptions: {
      // deja SOLO los módulos nativos de Node como externos
      external: [...builtinModules],
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
  },
});

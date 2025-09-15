import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

export default defineConfig(({ mode }) => ({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: 'index.ts',
    outDir: '../../dist/server',
    target: 'node22',
    // Disable sourcemaps during dev to reduce artifact size and upload time
    sourcemap: mode === 'production',
    rollupOptions: {
      external: [...builtinModules],

      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
  },
}));

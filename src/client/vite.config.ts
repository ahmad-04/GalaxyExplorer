import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  let resolvedOutDir = '';
  let resolvedPublicDir: string | null = null;

  const copyWithRetry = (src: string, dest: string, maxRetries = 8) => {
    let attempt = 0;
    // Ensure dest directory exists
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // Try copy with exponential backoff to avoid EBUSY on Windows
    // Errors we retry: EBUSY, EPERM, EACCES
    // Otherwise rethrow
    // Synchronous to simplify ordering during buildStart
    for (;;) {
      try {
        fs.copyFileSync(src, dest);
        return;
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code;
        if (attempt < maxRetries && (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES')) {
          const delay = Math.min(50 * Math.pow(2, attempt), 1000);
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
          attempt += 1;
          continue;
        }
        throw err;
      }
    }
  };

  const copyDirOncePlugin: Plugin = {
    name: 'copy-public-dir-once',
    apply: 'build',
    configResolved(config) {
      resolvedOutDir = path.resolve(config.root, config.build.outDir);
      // Vite sets publicDir to an absolute path or false; when copyPublicDir is false
      // we still can read config.publicDir for our own copying
      resolvedPublicDir = typeof config.publicDir === 'string' ? config.publicDir : null;
    },
    buildStart() {
      // Only copy once per process run to avoid races during watch rebuilds
      if (!resolvedPublicDir) return;
      try {
        // Mirror public dir to outDir
        const walk = (srcDir: string, destDir: string) => {
          const entries = fs.readdirSync(srcDir, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            if (entry.isDirectory()) {
              fs.mkdirSync(destPath, { recursive: true });
              walk(srcPath, destPath);
            } else if (entry.isFile()) {
              copyWithRetry(srcPath, destPath);
            }
          }
        };
        walk(resolvedPublicDir, resolvedOutDir);
      } catch (e) {
        // Log but do not hard-fail on watch; subsequent tries may succeed
        console.warn('[copy-public-dir-once] initial copy failed:', e);
      }
      // Remove hook so we only run once
      // @ts-expect-error - mutate to no-op after first run
      this.buildStart = () => {};
    },
  };

  return {
    build: {
      outDir: '../../dist/client',
      emptyOutDir: false,
      copyPublicDir: false,
      // Disable sourcemaps in dev to dramatically cut asset size and upload time
      sourcemap: mode === 'production',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
          },
        },
      },
      ...(mode === 'production' && {
        minify: 'terser',
        terserOptions: {
          compress: {
            passes: 2,
          },
          mangle: true,
          format: {
            comments: false,
          },
        },
      }),
    },
    plugins: [copyDirOncePlugin],
  };
});

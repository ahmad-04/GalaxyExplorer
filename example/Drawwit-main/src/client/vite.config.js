import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../dist/client', // 👈 cámbialo si quieres otra carpeta
    sourcemap: true,             // genera sourcemaps para depurar
    target: 'esnext',            // output moderno para navegadores
  },
});

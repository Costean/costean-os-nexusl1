import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
const WWW_VERSION = process.env.COSTEAN_VERSION || '1.0.4.4-costean.7';
// Hashed asset names: the firmware sends no Cache-Control, so a new www.bin must not reuse old file names (stale browser cache).
// Firmware file server only knows .html/.js/.css/.svg/.png/.json and serves "<path>.gz".
export default defineConfig({
  base: './',
  define: { __WWW_VERSION__: JSON.stringify(WWW_VERSION) },
  plugins: [svelte()],
  build: {
    outDir: 'dist/axe-os', emptyOutDir: true, assetsDir: 'assets', cssCodeSplit: false, modulePreload: false,
    rollupOptions: { output: { entryFileNames: 'assets/app-[hash].js', assetFileNames: 'assets/app-[hash][extname]', codeSplitting: false } },
  },
  server: { proxy: { '/api': { target: process.env.MINER || 'http://127.0.0.1:8099', ws: true } } },
  test: { environment: 'node', include: ['test/**/*.test.js'] },
});

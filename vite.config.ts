import { defineConfig } from 'vite';

// Em GitHub Pages o site fica em https://<user>.github.io/Osvaldo_app/
// Localmente (dev/preview) a base precisa ser "/".
const base = process.env.GITHUB_ACTIONS ? '/Osvaldo_app/' : '/';

export default defineConfig({
  base,
  build: {
    target: 'es2020',
    assetsInlineLimit: 8192,
  },
  server: {
    host: true,
    port: 5173,
  },
});

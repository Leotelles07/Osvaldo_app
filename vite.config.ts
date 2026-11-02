import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

export default defineConfig({
  // Versão do app gravada em cada partida salva no Firestore.
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Caminhos relativos: o mesmo build funciona servido na raiz (servidor local,
  // Vercel, Netlify) e dentro de um subdiretório (GitHub Pages, que publica em
  // /Osvaldo_app/). Sem isso, a página abriria em branco em um dos dois casos.
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 8192,
    rollupOptions: {
      input: {
        // O jogo e a página do Design System, que compartilham os mesmos tokens.
        main: resolve(__dirname, 'index.html'),
        designSystem: resolve(__dirname, 'design-system.html'),
      },
    },
  },
  server: {
    // Escuta também na rede local, para abrir o jogo no celular pelo IP da máquina.
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});

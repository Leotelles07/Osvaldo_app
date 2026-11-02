import { defineConfig } from 'vitest/config';

// Testes de firestore.rules contra o emulador do Firestore. Rode com
// `npm run test:rules`, que sobe o emulador, roda isto e desliga.
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    include: ['tests/rules/**/*.test.ts'],
    // Um arquivo por vez: todos compartilham o mesmo banco do emulador.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});

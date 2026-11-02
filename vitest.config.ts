import { defineConfig } from 'vitest/config';

// Testes rápidos (sem rede): regras do jogo, formulários, cores e dados.
// Os testes das regras do Firestore precisam do emulador e rodam à parte,
// com `npm run test:rules` (ver vitest.rules.config.ts).
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    include: ['src/**/*.test.ts'],
  },
});

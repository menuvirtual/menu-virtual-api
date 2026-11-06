import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Banco próprio dos testes (criado por docker/mysql-init.sql); o e2e aplica
    // as migrations e o seed nele. Requer `npm run db:up`.
    env: { DB_NAME: 'menu_test' },
    hookTimeout: 60_000,
    // Os arquivos compartilham o mesmo banco: um de cada vez
    fileParallelism: false,
  },
});

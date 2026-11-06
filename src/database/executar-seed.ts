/*
 * npm run db:seed
 * Aplica as migrations pendentes e grava os dados iniciais (ver seed.ts).
 */
import { DataSource } from 'typeorm';
import { opcoesBanco } from './opcoes-banco.js';
import { semearBanco } from './seed.js';

const dataSource = await new DataSource({
  ...opcoesBanco(),
  migrationsRun: false,
}).initialize();

try {
  await dataSource.runMigrations();
  await semearBanco(dataSource);
  console.log(
    `Seed concluído no banco "${String(dataSource.options.database)}".`,
  );
} finally {
  await dataSource.destroy();
}

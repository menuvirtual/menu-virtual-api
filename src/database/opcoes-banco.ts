import type { DataSourceOptions } from 'typeorm';
import { configuracao } from '../configuracao.js';
import { entidades } from './entidades.js';
import { migrations } from './migrations/index.js';

/**
 * Opções do TypeORM compartilhadas entre a API (app.module.ts), a CLI do
 * TypeORM (data-source.ts) e o seed.
 *
 * Entidades e migrations são registradas explicitamente (sem glob) para
 * funcionar igual no build (dist/) e nos testes (vitest, direto do .ts).
 */
export function opcoesBanco(): DataSourceOptions {
  const { banco } = configuracao;
  return {
    type: 'mysql',
    host: banco.host,
    port: banco.porta,
    username: banco.usuario,
    password: banco.senha,
    database: banco.nome,
    charset: 'utf8mb4_unicode_ci',
    entities: entidades,
    migrations,
    migrationsRun: banco.executarMigrations,
    // O schema é controlado só pelas migrations.
    synchronize: false,
    logging: banco.logging,
  };
}

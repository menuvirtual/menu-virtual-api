/*
 * DataSource usado pela CLI do TypeORM (roda sobre o build em dist/):
 *   npm run migration:run | migration:revert | migration:show
 *   npm run migration:generate -- src/database/migrations/NomeDaMigration
 */
import { DataSource } from 'typeorm';
import { opcoesBanco } from './opcoes-banco.js';

export default new DataSource({ ...opcoesBanco(), migrationsRun: false });

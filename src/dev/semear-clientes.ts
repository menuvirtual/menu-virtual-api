/*
 * npm run db:seed-clientes [-- --quantidade=15]
 *
 * Cadastra clientes com dados aleatórios em cada restaurante, completando até a quantidade
 * pedida (padrão: 15). Pode rodar várias vezes: quem já tem essa quantidade não recebe mais.
 * Os clientes valem para todos os menus do restaurante.
 */
import { DataSource } from 'typeorm';
import { opcoesBanco } from '../database/opcoes-banco.js';
import { semearClientes } from './clientes-aleatorios.js';

const argumento = process.argv.find((a) => a.startsWith('--quantidade='));
const quantidade = argumento ? Number(argumento.split('=')[1]) : 15;
if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 500) {
  console.error('Use --quantidade=<número inteiro de 1 a 500>.');
  process.exit(1);
}

const dataSource = await new DataSource({
  ...opcoesBanco(),
  migrationsRun: false,
}).initialize();

try {
  const resultados = await semearClientes(dataSource, { quantidade });
  if (!resultados.length)
    console.log('Nenhum restaurante cadastrado (rode `npm run db:seed`).');
  for (const r of resultados)
    console.log(
      `${r.restaurante}: ${r.criados} cliente(s) cadastrado(s) (já tinha ${r.existentes}; total ${r.existentes + r.criados})`,
    );
} finally {
  await dataSource.destroy();
}

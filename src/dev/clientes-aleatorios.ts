import type { DataSource } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity.js';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import { gerarClientes, type Aleatorio } from './gerador-clientes.js';

export interface ResultadoClientes {
  restaurante: string;
  /** Clientes que o restaurante já tinha */
  existentes: number;
  /** Clientes cadastrados agora */
  criados: number;
}

/**
 * Completa, para cada restaurante, o cadastro de clientes até `quantidade` (com dados
 * aleatórios, ver gerador-clientes.ts). Quem já tem `quantidade` ou mais não recebe nada,
 * então rodar de novo não duplica.
 *
 * Os clientes pertencem ao restaurante (Cliente.RestauranteId), não a um menu: valem para
 * todos os menus dele.
 */
export async function semearClientes(
  dataSource: DataSource,
  {
    quantidade,
    restauranteIds,
    aleatorio,
  }: { quantidade: number; restauranteIds?: number[]; aleatorio?: Aleatorio },
): Promise<ResultadoClientes[]> {
  const restaurantes = (
    await dataSource.getRepository(Restaurante).find({ order: { id: 'ASC' } })
  ).filter((r) => !restauranteIds || restauranteIds.includes(r.id));
  const resultados: ResultadoClientes[] = [];

  await dataSource.transaction(async (manager) => {
    const clientes = manager.getRepository(Cliente);
    for (const restaurante of restaurantes) {
      const existentes = await clientes.find({
        where: { restauranteId: restaurante.id },
      });
      const faltam = Math.max(0, quantidade - existentes.length);
      const novos = gerarClientes(faltam, {
        aleatorio,
        emailsExistentes: existentes.flatMap((c) => (c.email ? [c.email] : [])),
      });
      await clientes.save(
        novos.map((dados) =>
          clientes.create({ ...dados, restauranteId: restaurante.id }),
        ),
      );
      resultados.push({
        restaurante: restaurante.nome,
        existentes: existentes.length,
        criados: faltam,
      });
    }
  });
  return resultados;
}

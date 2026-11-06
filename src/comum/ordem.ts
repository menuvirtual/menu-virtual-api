import type { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

/** Próxima posição (maior Ordem + 1) entre os irmãos que atendem ao filtro. */
export async function proximaOrdem<T extends ObjectLiteral & { ordem: number }>(
  repositorio: Repository<T>,
  irmaos: FindOptionsWhere<T>,
): Promise<number> {
  const maior = await (repositorio as Repository<{ ordem: number }>).maximum(
    'ordem',
    irmaos as FindOptionsWhere<{ ordem: number }>,
  );
  return maior === null ? 1 : maior + 1;
}

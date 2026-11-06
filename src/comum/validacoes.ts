/*
 * Decorators de validação reutilizados pelos DTOs (mensagens em português).
 */
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

/** Combina vários decorators de propriedade em um. */
export const aplicar =
  (...decorators: PropertyDecorator[]): PropertyDecorator =>
  (alvo, prop) => {
    for (const decorator of decorators) decorator(alvo, prop);
  };

/** Id de um registro relacionado (inteiro >= 1), obrigatório. */
export const IdObrigatorio = () =>
  aplicar(
    IsNotEmpty({ message: '$property é obrigatório.' }),
    IsInt({ message: '$property deve ser um número inteiro.' }),
    Min(1, { message: '$property deve ser maior que zero.' }),
  );

/** Ordem de exibição (inteiro >= 0), opcional. Se omitida na criação, vai para o fim. */
export const OrdemOpcional = () =>
  aplicar(
    IsOptional(),
    IsInt({ message: '$property deve ser um número inteiro.' }),
    Min(0, { message: '$property não pode ser negativa.' }),
  );

/** Booleano opcional (true/false). */
export const BooleanoOpcional = () =>
  aplicar(
    IsOptional(),
    IsBoolean({ message: '$property deve ser true ou false.' }),
  );

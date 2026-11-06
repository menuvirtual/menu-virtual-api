import { registerDecorator, type ValidationOptions } from 'class-validator';

/** Data "AAAA-MM-DD" que existe no calendário (rejeita 2024-02-30) e não está no futuro. */
export function IsDataValida(opcoes?: ValidationOptions): PropertyDecorator {
  return (alvo, propriedade) =>
    registerDecorator({
      name: 'isDataValida',
      target: alvo.constructor,
      propertyName: propriedade as string,
      options: opcoes,
      validator: {
        validate(valor: unknown): boolean {
          if (typeof valor !== 'string') return false;
          const data = new Date(`${valor}T00:00:00Z`);
          return (
            !Number.isNaN(data.getTime()) &&
            data.toISOString().startsWith(valor) &&
            data.getTime() <= Date.now()
          );
        },
      },
    });
}

import { ValidationPipe, type ArgumentMetadata } from '@nestjs/common';

/**
 * ValidationPipe global: valida os DTOs (class-validator), remove propriedades
 * desconhecidas e devolve a instância transformada (aplica os @Transform).
 *
 * Não converte parâmetros primitivos de query/rota ("abc" -> NaN, "talvez" -> false):
 * isso fica a cargo de ParseIntPipe/ParseBoolPipe, que respondem 400 para valores inválidos.
 */
export class PipeValidacao extends ValidationPipe {
  constructor() {
    super({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  }

  protected override transformPrimitive(
    value: unknown,
    _metadata: ArgumentMetadata,
  ): unknown {
    return value;
  }
}

import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsOptional, Matches } from 'class-validator';
import {
  Aparar,
  TextoObrigatorio,
  TextoOpcional,
} from '../comum/idiomas.dto.js';
import { IdObrigatorio } from '../comum/validacoes.js';
import { IsDataValida } from './data-valida.validator.js';

export class CreateClienteDto {
  /** Restaurante do cliente */
  @IdObrigatorio()
  restauranteId: number;

  @TextoObrigatorio()
  nome: string;

  /**
   * Data de nascimento (AAAA-MM-DD)
   * @example "1990-05-23"
   */
  @Aparar()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataNascimento deve estar no formato AAAA-MM-DD.',
  })
  @IsDataValida({ message: 'dataNascimento não é uma data válida.' })
  dataNascimento?: string | null;

  /** @example "cliente@exemplo.com" */
  @TextoOpcional()
  @IsEmail({}, { message: 'email inválido.' })
  email?: string | null;

  /** @example "+55 11 99999-9999" */
  @TextoOpcional(30)
  phone?: string | null;
}

export class UpdateClienteDto extends PartialType(CreateClienteDto) {}

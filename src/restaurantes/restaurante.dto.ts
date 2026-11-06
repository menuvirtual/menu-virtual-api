import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Matches, MaxLength } from 'class-validator';
import { REGEX_SLUG } from '../cardapio/slug.pipe.js';
import { TextoObrigatorio } from '../comum/idiomas.dto.js';

export class CreateRestauranteDto {
  /** Nome do restaurante */
  @TextoObrigatorio(120)
  nome: string;

  /**
   * Chave usada na URL do cardápio (letras minúsculas, números e hífen)
   * @example "casa-lusitana"
   */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @MaxLength(60, { message: 'slug deve ter no máximo 60 caracteres.' })
  @Matches(REGEX_SLUG, {
    message:
      'slug inválido: use letras minúsculas, números e hífen (ex.: casa-lusitana).',
  })
  slug: string;
}

export class UpdateRestauranteDto extends PartialType(CreateRestauranteDto) {}

import { IntersectionType, PartialType } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt, IsOptional, Min } from 'class-validator';
import { DescricoesOpcionaisDto, NomesDto } from '../comum/idiomas.dto.js';
import {
  BooleanoOpcional,
  IdObrigatorio,
  OrdemOpcional,
} from '../comum/validacoes.js';

class DadosItemDto {
  /** Subcategoria do item */
  @IdObrigatorio()
  subCategoriaId: number;

  /** Posição dentro da subcategoria. Se omitida na criação, vai para o fim. */
  @OrdemOpcional()
  ordem?: number;

  /** false = escondido do cardápio. Padrão: true */
  @BooleanoOpcional()
  visivel?: boolean;

  /** Ids das tags do item (substitui a lista atual). Padrão: nenhuma */
  @IsOptional()
  @IsArray({ message: 'tagIds deve ser uma lista.' })
  @ArrayUnique({ message: 'tagIds não pode ter ids repetidos.' })
  @IsInt({ each: true, message: 'tagIds deve conter números inteiros.' })
  @Min(1, { each: true, message: 'tagIds deve conter ids maiores que zero.' })
  tagIds?: number[];
}

export class CreateItemDto extends IntersectionType(
  DadosItemDto,
  NomesDto,
  DescricoesOpcionaisDto,
) {}

export class UpdateItemDto extends PartialType(CreateItemDto) {}

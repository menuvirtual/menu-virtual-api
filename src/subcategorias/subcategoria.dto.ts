import { IntersectionType, PartialType } from '@nestjs/swagger';
import { DescricoesDto } from '../comum/idiomas.dto.js';
import { IdObrigatorio, OrdemOpcional } from '../comum/validacoes.js';

class DadosSubCategoriaDto {
  /** Categoria da subcategoria */
  @IdObrigatorio()
  categoriaId: number;

  /** Posição dentro da categoria. Se omitida na criação, vai para o fim. */
  @OrdemOpcional()
  ordem?: number;
}

export class CreateSubCategoriaDto extends IntersectionType(
  DadosSubCategoriaDto,
  DescricoesDto,
) {}

export class UpdateSubCategoriaDto extends PartialType(CreateSubCategoriaDto) {}

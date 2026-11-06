import { IntersectionType, PartialType } from '@nestjs/swagger';
import { DescricoesDto } from '../comum/idiomas.dto.js';
import { IdObrigatorio, OrdemOpcional } from '../comum/validacoes.js';

class DadosCategoriaDto {
  /** Menu da categoria */
  @IdObrigatorio()
  menuId: number;

  /** Posição no cardápio. Se omitida na criação, vai para o fim. */
  @OrdemOpcional()
  ordem?: number;
}

export class CreateCategoriaDto extends IntersectionType(
  DadosCategoriaDto,
  DescricoesDto,
) {}

export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {}

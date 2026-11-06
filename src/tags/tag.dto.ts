import { IntersectionType, PartialType } from '@nestjs/swagger';
import { DescricoesDto } from '../comum/idiomas.dto.js';
import { BooleanoOpcional } from '../comum/validacoes.js';

class DadosTagDto {
  /** true = aparece na lista de filtros do cardápio. Padrão: true */
  @BooleanoOpcional()
  visibleLista?: boolean;
}

export class CreateTagDto extends IntersectionType(
  DescricoesDto,
  DadosTagDto,
) {}

export class UpdateTagDto extends PartialType(CreateTagDto) {}

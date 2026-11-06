import { OmitType, PartialType } from '@nestjs/swagger';
import { TextoObrigatorio } from '../comum/idiomas.dto.js';
import { BooleanoOpcional, IdObrigatorio } from '../comum/validacoes.js';

/**
 * Os JSON do menu (Payload e PayloadPreview) não são enviados pelo usuário: o preview é
 * gerado a partir das tabelas e a publicação é feita em POST /admin/menus/:id/publicar.
 */
export class CreateMenuDto {
  /** Restaurante dono do menu (não pode ser alterado depois) */
  @IdObrigatorio()
  restauranteId: number;

  /**
   * Nome do menu, só para identificá-lo no admin (não aparece no cardápio). Único por restaurante.
   * @example "Menu noite"
   */
  @TextoObrigatorio(80)
  nome: string;

  /**
   * Menu ativo/publicado. Padrão: false.
   * Ativar um menu desativa o que estava ativo no mesmo restaurante.
   */
  @BooleanoOpcional()
  isAtivo?: boolean;
}

export class UpdateMenuDto extends PartialType(
  OmitType(CreateMenuDto, ['restauranteId'] as const),
) {}

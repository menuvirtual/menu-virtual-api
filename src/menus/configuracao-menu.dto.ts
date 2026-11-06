import { OmitType, PartialType } from '@nestjs/swagger';
import { BooleanoOpcional, IdObrigatorio } from '../comum/validacoes.js';

export class CreateConfiguracaoMenuDto {
  /** Menu configurado (cada menu tem no máximo uma configuração; não pode ser alterado depois) */
  @IdObrigatorio()
  menuId: number;

  /** Padrão: true */
  @BooleanoOpcional()
  habilitaPT?: boolean;

  @BooleanoOpcional()
  habilitaEN?: boolean;

  @BooleanoOpcional()
  habilitaES?: boolean;

  @BooleanoOpcional()
  habilitaFR?: boolean;

  @BooleanoOpcional()
  habilitaPL?: boolean;

  @BooleanoOpcional()
  habilitaDE?: boolean;

  /** Exibe a pesquisa/cadastro do cliente no cardápio */
  @BooleanoOpcional()
  habilitaPesquisaCliente?: boolean;

  @BooleanoOpcional()
  habilitaPesquisaClienteNome?: boolean;

  @BooleanoOpcional()
  habilitaPesquisaClienteDataNiver?: boolean;

  @BooleanoOpcional()
  habilitaPesquisaClienteEmail?: boolean;

  @BooleanoOpcional()
  habilitaPesquisaClientePhone?: boolean;
}

export class UpdateConfiguracaoMenuDto extends PartialType(
  OmitType(CreateConfiguracaoMenuDto, ['menuId'] as const),
) {}

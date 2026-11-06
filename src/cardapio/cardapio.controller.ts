import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseBoolPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Publica } from '../auth/usuario-autenticado.js';
import { CardapioService } from './cardapio.service.js';
import { MenuPayload } from './cardapio.types.js';
import { SlugPipe } from './slug.pipe.js';

@ApiTags('Cardápio (público)')
@Publica()
@Controller('menu')
export class CardapioController {
  constructor(private readonly cardapio: CardapioService) {}

  /**
   * GET /menu?restaurante=casa-lusitana[&preview=true]
   * Retorna, em um único payload, tudo para montar o cardápio: restaurante, moeda,
   * idiomas, textos da interface, filtros, redes sociais, categorias, subcategorias,
   * itens, preços e URLs das imagens.
   */
  @Get()
  @ApiOperation({
    summary: 'Cardápio completo de um restaurante',
    description:
      'Retorna em um único payload tudo para montar o cardápio: restaurante, moeda, idiomas, textos da ' +
      'interface, filtros, redes sociais, categorias, subcategorias, itens, preços e URLs das imagens.',
  })
  @ApiQuery({
    name: 'restaurante',
    required: true,
    example: 'casa-lusitana',
    description: 'Chave do restaurante (letras minúsculas, números e hífen)',
  })
  @ApiQuery({
    name: 'preview',
    required: false,
    type: Boolean,
    example: false,
    description:
      'true = versão de pré-visualização do menu ativo (PayloadPreview); false (padrão) = versão publicada (Payload)',
  })
  @ApiOkResponse({ type: MenuPayload })
  @ApiBadRequestResponse({
    description:
      'Parâmetro "restaurante" ausente ou inválido, ou "preview" diferente de true/false',
  })
  @ApiNotFoundResponse({
    description: 'Restaurante não cadastrado ou sem menu ativo',
  })
  obter(
    @Query('restaurante', SlugPipe) restaurante: string,
    @Query('preview', new DefaultValuePipe(false), ParseBoolPipe)
    preview: boolean,
  ): Promise<MenuPayload> {
    return this.cardapio.obterPayload(restaurante, preview);
  }
}

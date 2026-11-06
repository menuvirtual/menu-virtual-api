import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../auth/usuario-autenticado.js';
import { CreateMenuDto, UpdateMenuDto } from './menu.dto.js';
import { Menu } from './menu.entity.js';
import { MenusService } from './menus.service.js';

@ApiTags('Admin: Menus')
@ApiBearerAuth()
@Controller('admin/menus')
export class MenusController {
  constructor(private readonly servico: MenusService) {}

  /** Lista os menus (sem os payloads) */
  @Get()
  @ApiQuery({ name: 'restauranteId', required: false, type: Number })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('restauranteId', new ParseIntPipe({ optional: true }))
    restauranteId?: number,
  ): Promise<Menu[]> {
    return this.servico.listar(usuario, restauranteId);
  }

  /** Busca um menu (com os payloads publicado e de preview) */
  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Menu> {
    return this.servico.obter(id, usuario);
  }

  /**
   * Cria um menu vazio; o JSON (publicado e preview) é gerado pela API, não enviado pelo
   * usuário. Se ativo, desativa o menu que estava ativo no restaurante.
   */
  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateMenuDto,
  ): Promise<Menu> {
    return this.servico.criar(dto, usuario);
  }

  /** Altera a situação do menu (ativo/inativo); os JSON não são editáveis */
  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuDto,
  ): Promise<Menu> {
    return this.servico.atualizar(id, dto, usuario);
  }

  /**
   * Publica as atualizações: copia o PayloadPreview para o Payload (a versão que o
   * GET /menu devolve quando o menu está ativo) e desliga contemAtualizacaoParaPublicar.
   * 409 se não houver atualizações para publicar.
   */
  @Post(':id/publicar')
  @HttpCode(200)
  publicar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Menu> {
    return this.servico.publicar(id, usuario);
  }

  /** Exclui um menu e, em cascata, a configuração, categorias, subcategorias, itens e mídias */
  @Delete(':id')
  @HttpCode(204)
  remover(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.servico.remover(id, usuario);
  }
}

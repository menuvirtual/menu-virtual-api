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
import {
  CreateConfiguracaoMenuDto,
  UpdateConfiguracaoMenuDto,
} from './configuracao-menu.dto.js';
import { ConfiguracaoMenu } from './configuracao-menu.entity.js';
import { ConfiguracoesMenuService } from './configuracoes-menu.service.js';

@ApiTags('Admin: Configurações de menu')
@ApiBearerAuth()
@Controller('admin/configuracoes-menu')
export class ConfiguracoesMenuController {
  constructor(private readonly servico: ConfiguracoesMenuService) {}

  /** Lista as configurações (filtre por menuId para obter a de um menu) */
  @Get()
  @ApiQuery({ name: 'menuId', required: false, type: Number })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('menuId', new ParseIntPipe({ optional: true })) menuId?: number,
  ): Promise<ConfiguracaoMenu[]> {
    return this.servico.listar(usuario, menuId);
  }

  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ConfiguracaoMenu> {
    return this.servico.obter(id, usuario);
  }

  /** Cria a configuração de um menu (409 se o menu já tiver uma) */
  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateConfiguracaoMenuDto,
  ): Promise<ConfiguracaoMenu> {
    return this.servico.criar(dto, usuario);
  }

  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfiguracaoMenuDto,
  ): Promise<ConfiguracaoMenu> {
    return this.servico.atualizar(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(204)
  remover(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.servico.remover(id, usuario);
  }
}

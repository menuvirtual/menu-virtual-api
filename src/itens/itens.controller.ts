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
import { CreateItemDto, UpdateItemDto } from './item.dto.js';
import { Item } from './item.entity.js';
import { ItensService } from './itens.service.js';

@ApiTags('Admin: Itens')
@ApiBearerAuth()
@Controller('admin/itens')
export class ItensController {
  constructor(private readonly servico: ItensService) {}

  /** Lista os itens (por ordem, com as tags), por subcategoria, categoria ou menu */
  @Get()
  @ApiQuery({ name: 'subCategoriaId', required: false, type: Number })
  @ApiQuery({ name: 'categoriaId', required: false, type: Number })
  @ApiQuery({ name: 'menuId', required: false, type: Number })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('subCategoriaId', new ParseIntPipe({ optional: true }))
    subCategoriaId?: number,
    @Query('categoriaId', new ParseIntPipe({ optional: true }))
    categoriaId?: number,
    @Query('menuId', new ParseIntPipe({ optional: true })) menuId?: number,
  ): Promise<Item[]> {
    return this.servico.listar(usuario, {
      subCategoriaId,
      categoriaId,
      menuId,
    });
  }

  /** Busca um item (com as tags) */
  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Item> {
    return this.servico.obter(id, usuario);
  }

  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateItemDto,
  ): Promise<Item> {
    return this.servico.criar(dto, usuario);
  }

  /** Altera um item; se tagIds vier, substitui as tags */
  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ): Promise<Item> {
    return this.servico.atualizar(id, dto, usuario);
  }

  /** Exclui o item e, em cascata, as mídias e as ligações com tags */
  @Delete(':id')
  @HttpCode(204)
  remover(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.servico.remover(id, usuario);
  }
}

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
import { CreateCategoriaDto, UpdateCategoriaDto } from './categoria.dto.js';
import { Categoria } from './categoria.entity.js';
import { CategoriasService } from './categorias.service.js';

@ApiTags('Admin: Categorias')
@ApiBearerAuth()
@Controller('admin/categorias')
export class CategoriasController {
  constructor(private readonly servico: CategoriasService) {}

  /** Lista as categorias (por ordem), opcionalmente de um menu */
  @Get()
  @ApiQuery({ name: 'menuId', required: false, type: Number })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('menuId', new ParseIntPipe({ optional: true })) menuId?: number,
  ): Promise<Categoria[]> {
    return this.servico.listar(usuario, menuId);
  }

  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Categoria> {
    return this.servico.obter(id, usuario);
  }

  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateCategoriaDto,
  ): Promise<Categoria> {
    return this.servico.criar(dto, usuario);
  }

  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
  ): Promise<Categoria> {
    return this.servico.atualizar(id, dto, usuario);
  }

  /** Exclui a categoria e, em cascata, as subcategorias e itens dela */
  @Delete(':id')
  @HttpCode(204)
  remover(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.servico.remover(id, usuario);
  }
}

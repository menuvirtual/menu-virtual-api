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
  CreateSubCategoriaDto,
  UpdateSubCategoriaDto,
} from './subcategoria.dto.js';
import { SubCategoria } from './subcategoria.entity.js';
import { SubCategoriasService } from './subcategorias.service.js';

@ApiTags('Admin: Subcategorias')
@ApiBearerAuth()
@Controller('admin/subcategorias')
export class SubCategoriasController {
  constructor(private readonly servico: SubCategoriasService) {}

  /** Lista as subcategorias (por ordem), opcionalmente de uma categoria ou de um menu */
  @Get()
  @ApiQuery({ name: 'categoriaId', required: false, type: Number })
  @ApiQuery({ name: 'menuId', required: false, type: Number })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('categoriaId', new ParseIntPipe({ optional: true }))
    categoriaId?: number,
    @Query('menuId', new ParseIntPipe({ optional: true })) menuId?: number,
  ): Promise<SubCategoria[]> {
    return this.servico.listar(usuario, { categoriaId, menuId });
  }

  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SubCategoria> {
    return this.servico.obter(id, usuario);
  }

  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateSubCategoriaDto,
  ): Promise<SubCategoria> {
    return this.servico.criar(dto, usuario);
  }

  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubCategoriaDto,
  ): Promise<SubCategoria> {
    return this.servico.atualizar(id, dto, usuario);
  }

  /** Exclui a subcategoria e, em cascata, os itens dela */
  @Delete(':id')
  @HttpCode(204)
  remover(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.servico.remover(id, usuario);
  }
}

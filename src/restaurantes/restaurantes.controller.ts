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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../auth/usuario-autenticado.js';
import {
  CreateRestauranteDto,
  UpdateRestauranteDto,
} from './restaurante.dto.js';
import { Restaurante } from './restaurante.entity.js';
import { RestaurantesService } from './restaurantes.service.js';

@ApiTags('Admin: Restaurantes')
@ApiBearerAuth()
@Controller('admin/restaurantes')
export class RestaurantesController {
  constructor(private readonly servico: RestaurantesService) {}

  /** Lista os restaurantes (ordem alfabética) */
  @Get()
  listar(@UsuarioAtual() usuario: UsuarioAutenticado): Promise<Restaurante[]> {
    return this.servico.listar(usuario);
  }

  /** Busca um restaurante */
  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Restaurante> {
    return this.servico.obter(id, usuario);
  }

  /** Cria um restaurante (409 se o slug já existir) */
  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateRestauranteDto,
  ): Promise<Restaurante> {
    return this.servico.criar(dto, usuario);
  }

  /** Altera um restaurante */
  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestauranteDto,
  ): Promise<Restaurante> {
    return this.servico.atualizar(id, dto, usuario);
  }

  /** Exclui um restaurante (409 se tiver menus ou clientes) */
  @Delete(':id')
  @HttpCode(204)
  remover(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.servico.remover(id, usuario);
  }
}

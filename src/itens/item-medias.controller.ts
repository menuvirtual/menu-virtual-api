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
import { CreateItemMediaDto, UpdateItemMediaDto } from './item-media.dto.js';
import { ItemMedia } from './item-media.entity.js';
import { ItemMediasService } from './item-medias.service.js';

@ApiTags('Admin: Mídias dos itens')
@ApiBearerAuth()
@Controller('admin/item-medias')
export class ItemMediasController {
  constructor(private readonly servico: ItemMediasService) {}

  /** Lista as mídias (por ordem), opcionalmente de um item */
  @Get()
  @ApiQuery({ name: 'itemId', required: false, type: Number })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('itemId', new ParseIntPipe({ optional: true })) itemId?: number,
  ): Promise<ItemMedia[]> {
    return this.servico.listar(usuario, itemId);
  }

  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ItemMedia> {
    return this.servico.obter(id, usuario);
  }

  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateItemMediaDto,
  ): Promise<ItemMedia> {
    return this.servico.criar(dto, usuario);
  }

  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemMediaDto,
  ): Promise<ItemMedia> {
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

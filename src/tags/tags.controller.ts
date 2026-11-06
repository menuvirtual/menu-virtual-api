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
import { CreateTagDto, UpdateTagDto } from './tag.dto.js';
import { Tag } from './tag.entity.js';
import { TagsService } from './tags.service.js';

@ApiTags('Admin: Tags')
@ApiBearerAuth()
@Controller('admin/tags')
export class TagsController {
  constructor(private readonly servico: TagsService) {}

  /** Lista as tags (ordem alfabética) */
  @Get()
  listar(): Promise<Tag[]> {
    return this.servico.listar();
  }

  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Tag> {
    return this.servico.obter(id, usuario);
  }

  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateTagDto,
  ): Promise<Tag> {
    return this.servico.criar(dto, usuario);
  }

  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTagDto,
  ): Promise<Tag> {
    return this.servico.atualizar(id, dto, usuario);
  }

  /** Exclui a tag (e a remove dos itens que a usavam) */
  @Delete(':id')
  @HttpCode(204)
  remover(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.servico.remover(id, usuario);
  }
}

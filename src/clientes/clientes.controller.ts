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
import { CreateClienteDto, UpdateClienteDto } from './cliente.dto.js';
import { Cliente } from './cliente.entity.js';
import { ClientesService } from './clientes.service.js';

@ApiTags('Admin: Clientes')
@ApiBearerAuth()
@Controller('admin/clientes')
export class ClientesController {
  constructor(private readonly servico: ClientesService) {}

  /** Lista os clientes (ordem alfabética), por restaurante e/ou busca no nome, e-mail ou telefone */
  @Get()
  @ApiQuery({ name: 'restauranteId', required: false, type: Number })
  @ApiQuery({ name: 'busca', required: false, type: String })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('restauranteId', new ParseIntPipe({ optional: true }))
    restauranteId?: number,
    @Query('busca') busca?: string,
  ): Promise<Cliente[]> {
    return this.servico.listar(usuario, {
      restauranteId,
      busca: typeof busca === 'string' ? busca : undefined,
    });
  }

  @Get(':id')
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Cliente> {
    return this.servico.obter(id, usuario);
  }

  @Post()
  criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: CreateClienteDto,
  ): Promise<Cliente> {
    return this.servico.criar(dto, usuario);
  }

  @Patch(':id')
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClienteDto,
  ): Promise<Cliente> {
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

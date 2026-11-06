import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, type FindOptionsWhere, type Repository } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import type { CreateClienteDto, UpdateClienteDto } from './cliente.dto.js';
import { Cliente } from './cliente.entity.js';

export interface FiltroClientes {
  restauranteId?: number;
  /** Trecho do nome, e-mail ou telefone */
  busca?: string;
}

@Injectable()
export class ClientesService extends ServicoCrud<Cliente> {
  constructor(
    @InjectRepository(Cliente) repositorio: Repository<Cliente>,
    acesso: AcessoService,
    eventos: MenuEventos,
  ) {
    super(repositorio, 'Cliente', acesso, 'cliente', eventos);
  }

  async listar(
    usuario: UsuarioAutenticado,
    { restauranteId, busca }: FiltroClientes,
  ): Promise<Cliente[]> {
    if (restauranteId) this.acesso.exigirRestaurante(usuario, restauranteId);
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    if (!restauranteId && permitidos && !permitidos.length) return [];
    const base: FindOptionsWhere<Cliente> = restauranteId
      ? { restauranteId }
      : permitidos
        ? { restauranteId: In(permitidos) }
        : {};
    const termo = busca?.trim();
    const where = termo
      ? (['nome', 'email', 'phone'] as const).map((campo) => ({
          ...base,
          [campo]: Like(`%${termo.replace(/[\\%_]/g, '\\$&')}%`),
        }))
      : base;
    return this.repositorio.find({ where, order: { nome: 'ASC', id: 'ASC' } });
  }

  async criar(
    dto: CreateClienteDto,
    usuario: UsuarioAutenticado,
  ): Promise<Cliente> {
    await this.acesso.exigir(usuario, 'restaurante', dto.restauranteId);
    return this.repositorio.save(this.repositorio.create(dto));
  }

  async atualizar(
    id: number,
    dto: UpdateClienteDto,
    usuario: UsuarioAutenticado,
  ): Promise<Cliente> {
    await this.exigirAcesso(id, usuario);
    const cliente = await this.buscar(id);
    if (
      dto.restauranteId !== undefined &&
      dto.restauranteId !== cliente.restauranteId
    )
      await this.acesso.exigir(usuario, 'restaurante', dto.restauranteId);
    return this.repositorio.save(this.repositorio.merge(cliente, dto));
  }
}

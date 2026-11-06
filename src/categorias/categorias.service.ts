import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { proximaOrdem } from '../comum/ordem.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import type {
  CreateCategoriaDto,
  UpdateCategoriaDto,
} from './categoria.dto.js';
import { Categoria } from './categoria.entity.js';

@Injectable()
export class CategoriasService extends ServicoCrud<Categoria> {
  constructor(
    @InjectRepository(Categoria) repositorio: Repository<Categoria>,
    acesso: AcessoService,
    eventos: MenuEventos,
  ) {
    super(repositorio, 'Categoria', acesso, 'categoria', eventos);
  }

  async listar(
    usuario: UsuarioAutenticado,
    menuId?: number,
  ): Promise<Categoria[]> {
    if (menuId) await this.acesso.exigir(usuario, 'menu', menuId);
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    if (!menuId && permitidos && !permitidos.length) return [];
    return this.repositorio.find({
      where: menuId
        ? { menuId }
        : permitidos
          ? { menu: { restauranteId: In(permitidos) } }
          : {},
      order: { menuId: 'ASC', ordem: 'ASC', id: 'ASC' },
    });
  }

  async criar(
    dto: CreateCategoriaDto,
    usuario: UsuarioAutenticado,
  ): Promise<Categoria> {
    await this.acesso.exigir(usuario, 'menu', dto.menuId);
    const categoria = this.repositorio.create(dto);
    categoria.ordem =
      dto.ordem ??
      (await proximaOrdem(this.repositorio, { menuId: dto.menuId }));
    const salva = await this.repositorio.save(categoria);
    await this.notificarMenus(salva.menuId);
    return salva;
  }

  async atualizar(
    id: number,
    dto: UpdateCategoriaDto,
    usuario: UsuarioAutenticado,
  ): Promise<Categoria> {
    await this.exigirAcesso(id, usuario);
    const menuAntes = await this.menuDoRegistro(id);
    const categoria = await this.buscar(id);
    // Mudar de menu: o novo menu também precisa ser de um restaurante do usuário
    if (dto.menuId !== undefined && dto.menuId !== categoria.menuId)
      await this.acesso.exigir(usuario, 'menu', dto.menuId);
    const salva = await this.repositorio.save(
      this.repositorio.merge(categoria, dto),
    );
    await this.notificarMenus(menuAntes, salva.menuId);
    return salva;
  }
}

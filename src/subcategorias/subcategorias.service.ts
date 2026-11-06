import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type FindOptionsWhere, type Repository } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { proximaOrdem } from '../comum/ordem.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import type {
  CreateSubCategoriaDto,
  UpdateSubCategoriaDto,
} from './subcategoria.dto.js';
import { SubCategoria } from './subcategoria.entity.js';

export interface FiltroSubCategorias {
  categoriaId?: number;
  menuId?: number;
}

@Injectable()
export class SubCategoriasService extends ServicoCrud<SubCategoria> {
  constructor(
    @InjectRepository(SubCategoria) repositorio: Repository<SubCategoria>,
    acesso: AcessoService,
    eventos: MenuEventos,
  ) {
    super(repositorio, 'Subcategoria', acesso, 'subCategoria', eventos);
  }

  async listar(
    usuario: UsuarioAutenticado,
    { categoriaId, menuId }: FiltroSubCategorias,
  ): Promise<SubCategoria[]> {
    if (categoriaId)
      await this.acesso.exigir(usuario, 'categoria', categoriaId);
    if (menuId) await this.acesso.exigir(usuario, 'menu', menuId);
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    const where: FindOptionsWhere<SubCategoria> = {};
    if (categoriaId) where.categoriaId = categoriaId;
    if (menuId) where.categoria = { menuId };
    else if (!categoriaId && permitidos) {
      if (!permitidos.length) return [];
      where.categoria = { menu: { restauranteId: In(permitidos) } };
    }
    return this.repositorio.find({
      where,
      order: { categoriaId: 'ASC', ordem: 'ASC', id: 'ASC' },
    });
  }

  async criar(
    dto: CreateSubCategoriaDto,
    usuario: UsuarioAutenticado,
  ): Promise<SubCategoria> {
    await this.acesso.exigir(usuario, 'categoria', dto.categoriaId);
    const subCategoria = this.repositorio.create(dto);
    subCategoria.ordem =
      dto.ordem ??
      (await proximaOrdem(this.repositorio, { categoriaId: dto.categoriaId }));
    const salva = await this.repositorio.save(subCategoria);
    await this.notificarMenus(await this.menuDoRegistro(salva.id));
    return salva;
  }

  async atualizar(
    id: number,
    dto: UpdateSubCategoriaDto,
    usuario: UsuarioAutenticado,
  ): Promise<SubCategoria> {
    await this.exigirAcesso(id, usuario);
    const menuAntes = await this.menuDoRegistro(id);
    const subCategoria = await this.buscar(id);
    if (
      dto.categoriaId !== undefined &&
      dto.categoriaId !== subCategoria.categoriaId
    )
      await this.acesso.exigir(usuario, 'categoria', dto.categoriaId);
    const salva = await this.repositorio.save(
      this.repositorio.merge(subCategoria, dto),
    );
    await this.notificarMenus(menuAntes, await this.menuDoRegistro(id));
    return salva;
  }
}

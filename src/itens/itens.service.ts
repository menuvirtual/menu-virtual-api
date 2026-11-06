import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type FindOptionsWhere, type Repository } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { proximaOrdem } from '../comum/ordem.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import { Tag } from '../tags/tag.entity.js';
import type { CreateItemDto, UpdateItemDto } from './item.dto.js';
import { Item } from './item.entity.js';

export interface FiltroItens {
  subCategoriaId?: number;
  categoriaId?: number;
  menuId?: number;
}

@Injectable()
export class ItensService extends ServicoCrud<Item> {
  constructor(
    @InjectRepository(Item) repositorio: Repository<Item>,
    acesso: AcessoService,
    eventos: MenuEventos,
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
  ) {
    super(repositorio, 'Item', acesso, 'item', eventos, { tags: true });
  }

  /** Lista os itens (com as tags), por subcategoria, categoria ou menu. */
  async listar(
    usuario: UsuarioAutenticado,
    { subCategoriaId, categoriaId, menuId }: FiltroItens,
  ): Promise<Item[]> {
    if (subCategoriaId)
      await this.acesso.exigir(usuario, 'subCategoria', subCategoriaId);
    if (categoriaId)
      await this.acesso.exigir(usuario, 'categoria', categoriaId);
    if (menuId) await this.acesso.exigir(usuario, 'menu', menuId);
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    const semFiltro = !subCategoriaId && !categoriaId && !menuId;
    if (semFiltro && permitidos && !permitidos.length) return [];

    const where: FindOptionsWhere<Item> = {};
    if (subCategoriaId) where.subCategoriaId = subCategoriaId;
    if (categoriaId || menuId)
      where.subCategoria = {
        ...(categoriaId ? { categoriaId } : {}),
        ...(menuId ? { categoria: { menuId } } : {}),
      };
    if (semFiltro && permitidos)
      where.subCategoria = {
        categoria: { menu: { restauranteId: In(permitidos) } },
      };
    return this.repositorio.find({
      where,
      relations: { tags: true },
      order: {
        subCategoriaId: 'ASC',
        ordem: 'ASC',
        id: 'ASC',
        tags: { id: 'ASC' },
      },
    });
  }

  async criar(dto: CreateItemDto, usuario: UsuarioAutenticado): Promise<Item> {
    await this.acesso.exigir(usuario, 'subCategoria', dto.subCategoriaId);
    const item = this.repositorio.create(dto);
    item.ordem =
      dto.ordem ??
      (await proximaOrdem(this.repositorio, {
        subCategoriaId: dto.subCategoriaId,
      }));
    item.tags = await this.buscarTags(dto.tagIds ?? []);
    const { id } = await this.repositorio.save(item);
    await this.notificarMenus(await this.menuDoRegistro(id));
    return this.buscar(id);
  }

  async atualizar(
    id: number,
    dto: UpdateItemDto,
    usuario: UsuarioAutenticado,
  ): Promise<Item> {
    await this.exigirAcesso(id, usuario);
    const menuAntes = await this.menuDoRegistro(id);
    const item = await this.buscar(id);
    if (
      dto.subCategoriaId !== undefined &&
      dto.subCategoriaId !== item.subCategoriaId
    )
      await this.acesso.exigir(usuario, 'subCategoria', dto.subCategoriaId);
    this.repositorio.merge(item, dto);
    if (dto.tagIds !== undefined) item.tags = await this.buscarTags(dto.tagIds);
    await this.repositorio.save(item);
    await this.notificarMenus(menuAntes, await this.menuDoRegistro(id));
    return this.buscar(id);
  }

  /** Carrega as tags pelos ids; 400 se algum id não existir. */
  private async buscarTags(ids: number[]): Promise<Tag[]> {
    if (!ids.length) return [];
    const tags = await this.tags.findBy({ id: In(ids) });
    const faltando = ids.filter((id) => !tags.some((t) => t.id === id));
    if (faltando.length)
      throw new BadRequestException(
        `Tag(s) não encontrada(s): ${faltando.join(', ')}.`,
      );
    return tags;
  }
}

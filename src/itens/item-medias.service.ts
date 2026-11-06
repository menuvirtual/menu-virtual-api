import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { proximaOrdem } from '../comum/ordem.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import type {
  CreateItemMediaDto,
  UpdateItemMediaDto,
} from './item-media.dto.js';
import { ItemMedia } from './item-media.entity.js';

@Injectable()
export class ItemMediasService extends ServicoCrud<ItemMedia> {
  constructor(
    @InjectRepository(ItemMedia) repositorio: Repository<ItemMedia>,
    acesso: AcessoService,
    eventos: MenuEventos,
  ) {
    super(repositorio, 'Mídia', acesso, 'itemMedia', eventos);
  }

  async listar(
    usuario: UsuarioAutenticado,
    itemId?: number,
  ): Promise<ItemMedia[]> {
    if (itemId) await this.acesso.exigir(usuario, 'item', itemId);
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    if (!itemId && permitidos && !permitidos.length) return [];
    return this.repositorio.find({
      where: itemId
        ? { itemId }
        : permitidos
          ? {
              item: {
                subCategoria: {
                  categoria: { menu: { restauranteId: In(permitidos) } },
                },
              },
            }
          : {},
      order: { itemId: 'ASC', ordem: 'ASC', id: 'ASC' },
    });
  }

  async criar(
    dto: CreateItemMediaDto,
    usuario: UsuarioAutenticado,
  ): Promise<ItemMedia> {
    await this.acesso.exigir(usuario, 'item', dto.itemId);
    const media = this.repositorio.create(dto);
    media.ordem =
      dto.ordem ??
      (await proximaOrdem(this.repositorio, { itemId: dto.itemId }));
    const salva = await this.repositorio.save(media);
    await this.notificarMenus(await this.menuDoRegistro(salva.id));
    return salva;
  }

  async atualizar(
    id: number,
    dto: UpdateItemMediaDto,
    usuario: UsuarioAutenticado,
  ): Promise<ItemMedia> {
    await this.exigirAcesso(id, usuario);
    const menuAntes = await this.menuDoRegistro(id);
    const media = await this.buscar(id);
    if (dto.itemId !== undefined && dto.itemId !== media.itemId)
      await this.acesso.exigir(usuario, 'item', dto.itemId);
    const salva = await this.repositorio.save(
      this.repositorio.merge(media, dto),
    );
    await this.notificarMenus(menuAntes, await this.menuDoRegistro(id));
    return salva;
  }
}

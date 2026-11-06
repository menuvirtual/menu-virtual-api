import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import type { CreateTagDto, UpdateTagDto } from './tag.dto.js';
import { Tag } from './tag.entity.js';

/**
 * Tags são globais (compartilhadas por todos os restaurantes): qualquer usuário
 * logado lê, mas só superusuários criam, alteram e excluem. Alterar ou excluir uma
 * tag muda o JSON de todos os menus que têm itens com ela.
 */
@Injectable()
export class TagsService extends ServicoCrud<Tag> {
  constructor(
    @InjectRepository(Tag) repositorio: Repository<Tag>,
    acesso: AcessoService,
    eventos: MenuEventos,
  ) {
    super(repositorio, 'Tag', acesso, null, eventos);
  }

  listar(): Promise<Tag[]> {
    return this.repositorio.find({ order: { descricaoPT: 'ASC', id: 'ASC' } });
  }

  criar(dto: CreateTagDto, usuario: UsuarioAutenticado): Promise<Tag> {
    this.acesso.exigirSuperUsuario(usuario, 'cadastrar tags');
    return this.repositorio.save(this.repositorio.create(dto));
  }

  async atualizar(
    id: number,
    dto: UpdateTagDto,
    usuario: UsuarioAutenticado,
  ): Promise<Tag> {
    this.acesso.exigirSuperUsuario(usuario, 'alterar tags');
    const tag = await this.buscar(id);
    const salva = await this.repositorio.save(this.repositorio.merge(tag, dto));
    await this.notificarMenus(...(await this.eventos.menusDaTag(id)));
    return salva;
  }

  override async remover(
    id: number,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    this.acesso.exigirSuperUsuario(usuario, 'excluir tags');
    // os menus precisam ser descobertos antes: a exclusão desfaz os vínculos com os itens
    const menus = await this.eventos.menusDaTag(id);
    await super.remover(id, usuario);
    await this.notificarMenus(...menus);
  }
}

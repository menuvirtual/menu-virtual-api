import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import type {
  CreateConfiguracaoMenuDto,
  UpdateConfiguracaoMenuDto,
} from './configuracao-menu.dto.js';
import { ConfiguracaoMenu } from './configuracao-menu.entity.js';

@Injectable()
export class ConfiguracoesMenuService extends ServicoCrud<ConfiguracaoMenu> {
  constructor(
    @InjectRepository(ConfiguracaoMenu)
    repositorio: Repository<ConfiguracaoMenu>,
    acesso: AcessoService,
    eventos: MenuEventos,
  ) {
    super(
      repositorio,
      'Configuração de menu',
      acesso,
      'configuracaoMenu',
      eventos,
    );
  }

  async listar(
    usuario: UsuarioAutenticado,
    menuId?: number,
  ): Promise<ConfiguracaoMenu[]> {
    if (menuId) await this.acesso.exigir(usuario, 'menu', menuId);
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    if (!menuId && permitidos && !permitidos.length) return [];
    return this.repositorio.find({
      where: menuId
        ? { menuId }
        : permitidos
          ? { menu: { restauranteId: In(permitidos) } }
          : {},
      order: { menuId: 'ASC' },
    });
  }

  async criar(
    dto: CreateConfiguracaoMenuDto,
    usuario: UsuarioAutenticado,
  ): Promise<ConfiguracaoMenu> {
    await this.acesso.exigir(usuario, 'menu', dto.menuId);
    if (await this.repositorio.existsBy({ menuId: dto.menuId }))
      throw new ConflictException('Esse menu já possui configuração.');
    const salva = await this.repositorio.save(this.repositorio.create(dto));
    await this.notificarMenus(salva.menuId);
    return salva;
  }

  async atualizar(
    id: number,
    dto: UpdateConfiguracaoMenuDto,
    usuario: UsuarioAutenticado,
  ): Promise<ConfiguracaoMenu> {
    await this.exigirAcesso(id, usuario);
    const configuracao = await this.buscar(id);
    const salva = await this.repositorio.save(
      this.repositorio.merge(configuracao, dto),
    );
    await this.notificarMenus(salva.menuId);
    return salva;
  }
}

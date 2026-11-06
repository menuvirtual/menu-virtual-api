import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, type Repository } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { Cliente } from '../clientes/cliente.entity.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import { Menu } from '../menus/menu.entity.js';
import type {
  CreateRestauranteDto,
  UpdateRestauranteDto,
} from './restaurante.dto.js';
import { Restaurante } from './restaurante.entity.js';

/**
 * Restaurantes. Cada usuário vê e altera só os que administra; criar e excluir
 * restaurantes é só para superusuários.
 */
@Injectable()
export class RestaurantesService extends ServicoCrud<Restaurante> {
  constructor(
    @InjectRepository(Restaurante) repositorio: Repository<Restaurante>,
    acesso: AcessoService,
    eventos: MenuEventos,
    private readonly dataSource: DataSource,
  ) {
    super(repositorio, 'Restaurante', acesso, 'restaurante', eventos);
  }

  async listar(usuario: UsuarioAutenticado): Promise<Restaurante[]> {
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    if (permitidos && !permitidos.length) return [];
    return this.repositorio.find({
      where: permitidos ? { id: In(permitidos) } : {},
      order: { nome: 'ASC', id: 'ASC' },
    });
  }

  async criar(
    dto: CreateRestauranteDto,
    usuario: UsuarioAutenticado,
  ): Promise<Restaurante> {
    this.acesso.exigirSuperUsuario(usuario, 'cadastrar restaurantes');
    await this.exigirSlugLivre(dto.slug);
    return this.repositorio.save(this.repositorio.create(dto));
  }

  async atualizar(
    id: number,
    dto: UpdateRestauranteDto,
    usuario: UsuarioAutenticado,
  ): Promise<Restaurante> {
    await this.exigirAcesso(id, usuario);
    const restaurante = await this.buscar(id);
    if (dto.slug !== undefined && dto.slug !== restaurante.slug)
      await this.exigirSlugLivre(dto.slug);
    const nomeAntes = restaurante.nome;
    const salvo = await this.repositorio.save(
      this.repositorio.merge(restaurante, dto),
    );
    // o nome do restaurante faz parte do JSON de todos os menus dele
    if (salvo.nome !== nomeAntes)
      await this.notificarMenus(...(await this.eventos.menusDoRestaurante(id)));
    return salvo;
  }

  /** Só superusuários; só exclui restaurantes sem menus e sem clientes (409 caso contrário). */
  override async remover(
    id: number,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    this.acesso.exigirSuperUsuario(usuario, 'excluir restaurantes');
    await this.exigirAcesso(id, usuario);
    const [menus, clientes] = await Promise.all([
      this.dataSource.getRepository(Menu).countBy({ restauranteId: id }),
      this.dataSource.getRepository(Cliente).countBy({ restauranteId: id }),
    ]);
    if (menus || clientes)
      throw new ConflictException(
        `O restaurante possui ${menus} menu(s) e ${clientes} cliente(s); exclua-os antes.`,
      );
    await super.remover(id, usuario);
  }

  private async exigirSlugLivre(slug: string): Promise<void> {
    if (await this.repositorio.existsBy({ slug }))
      throw new ConflictException('Já existe um restaurante com esse slug.');
  }
}

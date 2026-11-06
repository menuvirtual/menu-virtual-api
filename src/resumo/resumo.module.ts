import {
  Controller,
  Get,
  Injectable,
  Module,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource, In, type FindOperator } from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../auth/usuario-autenticado.js';
import { Categoria } from '../categorias/categoria.entity.js';
import { Cliente } from '../clientes/cliente.entity.js';
import { Item } from '../itens/item.entity.js';
import { Menu } from '../menus/menu.entity.js';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import { SubCategoria } from '../subcategorias/subcategoria.entity.js';
import { Tag } from '../tags/tag.entity.js';
import { Resumo, type ResumoRestaurante } from './resumo.dto.js';

@Injectable()
export class ResumoService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly acesso: AcessoService,
  ) {}

  /**
   * Totais de um restaurante ou de todos os que o usuário administra (tags são
   * globais e sempre contam todas).
   */
  async obter(
    usuario: UsuarioAutenticado,
    restauranteId?: number,
  ): Promise<Resumo> {
    if (restauranteId) this.acesso.exigirRestaurante(usuario, restauranteId);
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    // Filtro de restaurante: um só, os permitidos, ou nenhum (superusuário)
    const filtro: number | FindOperator<number> | undefined = restauranteId
      ? restauranteId
      : permitidos
        ? In(permitidos.length ? permitidos : [0])
        : undefined;
    const ds = this.dataSource;
    const doRestaurante = filtro === undefined ? {} : { restauranteId: filtro };
    const doMenu = filtro === undefined ? {} : { menu: doRestaurante };
    const daCategoria = filtro === undefined ? {} : { categoria: doMenu };
    const daSubCategoria =
      filtro === undefined ? {} : { subCategoria: daCategoria };
    const idsSql = restauranteId ? [restauranteId] : permitidos;
    const [
      restaurantes,
      menus,
      categorias,
      subCategorias,
      itens,
      itensOcultos,
      clientes,
      tags,
      porRestaurante,
    ] = await Promise.all([
      ds
        .getRepository(Restaurante)
        .countBy(filtro === undefined ? {} : { id: filtro }),
      ds.getRepository(Menu).countBy(doRestaurante),
      ds.getRepository(Categoria).count({ where: doMenu }),
      ds.getRepository(SubCategoria).count({ where: daCategoria }),
      ds.getRepository(Item).count({ where: daSubCategoria }),
      ds
        .getRepository(Item)
        .count({ where: { ...daSubCategoria, visivel: false } }),
      ds.getRepository(Cliente).countBy(doRestaurante),
      ds.getRepository(Tag).count(),
      ds
        .getRepository(Restaurante)
        .createQueryBuilder('r')
        .select(['r.id AS id', 'r.nome AS nome', 'r.slug AS slug'])
        .addSelect(
          (q) =>
            q
              .select('COUNT(*)')
              .from(Menu, 'm')
              .where('m.restauranteId = r.id'),
          'menus',
        )
        .addSelect(
          (q) =>
            q
              .select('m.id')
              .from(Menu, 'm')
              .where('m.restauranteId = r.id AND m.isAtivo = 1'),
          'menuAtivoId',
        )
        .addSelect(
          (q) =>
            q
              .select('COUNT(*)')
              .from(Cliente, 'c')
              .where('c.restauranteId = r.id'),
          'clientes',
        )
        .where(idsSql ? 'r.id IN (:...ids)' : '1 = 1', {
          ids: idsSql?.length ? idsSql : [0],
        })
        .orderBy('r.nome')
        .getRawMany<Record<keyof ResumoRestaurante, string | number | null>>(),
    ]);

    return {
      restaurantes,
      menus,
      categorias,
      subCategorias,
      itens,
      itensOcultos,
      clientes,
      tags,
      porRestaurante: porRestaurante.map((r) => ({
        id: Number(r.id),
        nome: String(r.nome),
        slug: String(r.slug),
        menus: Number(r.menus),
        menuAtivoId: r.menuAtivoId === null ? null : Number(r.menuAtivoId),
        clientes: Number(r.clientes),
      })),
    };
  }
}

@ApiTags('Admin: Resumo')
@ApiBearerAuth()
@Controller('admin/resumo')
export class ResumoController {
  constructor(private readonly servico: ResumoService) {}

  /** Totais para o dashboard do admin (de todos os restaurantes ou de um) */
  @Get()
  @ApiOkResponse({ type: Resumo })
  @ApiQuery({ name: 'restauranteId', required: false, type: Number })
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('restauranteId', new ParseIntPipe({ optional: true }))
    restauranteId?: number,
  ): Promise<Resumo> {
    return this.servico.obter(usuario, restauranteId);
  }
}

@Module({
  controllers: [ResumoController],
  providers: [ResumoService],
})
export class ResumoModule {}

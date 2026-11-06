import {
  ForbiddenException,
  Global,
  Injectable,
  Module,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';

/** Registros cujo acesso depende do restaurante a que pertencem. */
export type Alvo =
  | 'restaurante'
  | 'menu'
  | 'configuracaoMenu'
  | 'categoria'
  | 'subCategoria'
  | 'item'
  | 'itemMedia'
  | 'cliente';

/** SQL que devolve o restaurante dono de cada tipo de registro. */
const RESTAURANTE_DO_REGISTRO: Record<Alvo, string> = {
  restaurante: 'SELECT r.Id AS restauranteId FROM Restaurante r WHERE r.Id = ?',
  menu: 'SELECT m.RestauranteId AS restauranteId FROM Menu m WHERE m.Id = ?',
  configuracaoMenu:
    'SELECT m.RestauranteId AS restauranteId FROM ConfiguracaoMenu x JOIN Menu m ON m.Id = x.MenuId WHERE x.Id = ?',
  categoria:
    'SELECT m.RestauranteId AS restauranteId FROM Categoria c JOIN Menu m ON m.Id = c.MenuId WHERE c.Id = ?',
  subCategoria:
    'SELECT m.RestauranteId AS restauranteId FROM SubCategoria s JOIN Categoria c ON c.Id = s.CategoriaId JOIN Menu m ON m.Id = c.MenuId WHERE s.Id = ?',
  item: 'SELECT m.RestauranteId AS restauranteId FROM Item i JOIN SubCategoria s ON s.Id = i.SubCategoriaId JOIN Categoria c ON c.Id = s.CategoriaId JOIN Menu m ON m.Id = c.MenuId WHERE i.Id = ?',
  itemMedia:
    'SELECT m.RestauranteId AS restauranteId FROM ItemMedia x JOIN Item i ON i.Id = x.ItemId JOIN SubCategoria s ON s.Id = i.SubCategoriaId JOIN Categoria c ON c.Id = s.CategoriaId JOIN Menu m ON m.Id = c.MenuId WHERE x.Id = ?',
  cliente:
    'SELECT c.RestauranteId AS restauranteId FROM Cliente c WHERE c.Id = ?',
};

const NOMES: Record<Alvo, string> = {
  restaurante: 'Restaurante',
  menu: 'Menu',
  configuracaoMenu: 'Configuração de menu',
  categoria: 'Categoria',
  subCategoria: 'Subcategoria',
  item: 'Item',
  itemMedia: 'Mídia',
  cliente: 'Cliente',
};

/**
 * Regras de acesso do admin: cada usuário só lê e altera os registros dos
 * restaurantes que administra (tabela UsuarioRestaurante); superusuários
 * acessam todos.
 */
@Injectable()
export class AcessoService {
  constructor(private readonly dataSource: DataSource) {}

  podeAcessar(usuario: UsuarioAutenticado, restauranteId: number): boolean {
    return (
      usuario.superUsuario || usuario.restauranteIds.includes(restauranteId)
    );
  }

  /**
   * Restaurantes que o usuário pode ver, para filtrar listagens.
   * null = sem restrição (superusuário).
   */
  restaurantesPermitidos(usuario: UsuarioAutenticado): number[] | null {
    return usuario.superUsuario ? null : usuario.restauranteIds;
  }

  /** 403 se o usuário não administra o restaurante. */
  exigirRestaurante(usuario: UsuarioAutenticado, restauranteId: number): void {
    if (!this.podeAcessar(usuario, restauranteId))
      throw new ForbiddenException('Você não tem acesso a este restaurante.');
  }

  /**
   * Garante que o registro existe (404) e é de um restaurante do usuário (403).
   * Devolve o id do restaurante dono.
   */
  async exigir(
    usuario: UsuarioAutenticado,
    alvo: Alvo,
    id: number,
  ): Promise<number> {
    const [linha] = (await this.dataSource.query(
      RESTAURANTE_DO_REGISTRO[alvo],
      [id],
    )) as {
      restauranteId: number;
    }[];
    if (!linha)
      throw new NotFoundException(`${NOMES[alvo]} ${id} não encontrado(a).`);
    this.exigirRestaurante(usuario, Number(linha.restauranteId));
    return Number(linha.restauranteId);
  }

  /** 403 se não for superusuário. */
  exigirSuperUsuario(usuario: UsuarioAutenticado, acao: string): void {
    if (!usuario.superUsuario)
      throw new ForbiddenException(`Somente superusuários podem ${acao}.`);
  }
}

@Global()
@Module({
  providers: [AcessoService],
  exports: [AcessoService],
})
export class AcessoModule {}

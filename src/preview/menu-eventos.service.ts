import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import type { Alvo } from '../acesso/acesso.service.js';
import { MENU_ALTERADO, MenuAlteradoEvent } from './menu-alterado.event.js';

/** SQL que devolve o menu a que cada tipo de registro pertence. */
const MENU_DO_REGISTRO: Partial<Record<Alvo, string>> = {
  configuracaoMenu:
    'SELECT x.MenuId AS menuId FROM ConfiguracaoMenu x WHERE x.Id = ?',
  categoria: 'SELECT c.MenuId AS menuId FROM Categoria c WHERE c.Id = ?',
  subCategoria:
    'SELECT c.MenuId AS menuId FROM SubCategoria s JOIN Categoria c ON c.Id = s.CategoriaId WHERE s.Id = ?',
  item: 'SELECT c.MenuId AS menuId FROM Item i JOIN SubCategoria s ON s.Id = i.SubCategoriaId JOIN Categoria c ON c.Id = s.CategoriaId WHERE i.Id = ?',
  itemMedia:
    'SELECT c.MenuId AS menuId FROM ItemMedia x JOIN Item i ON i.Id = x.ItemId JOIN SubCategoria s ON s.Id = i.SubCategoriaId JOIN Categoria c ON c.Id = s.CategoriaId WHERE x.Id = ?',
};

/**
 * Emite o evento menu.alterado e descobre a que menus cada registro pertence.
 *
 * Os serviços chamam `notificar` depois de gravar. O evento é aguardado (emitAsync):
 * quando a requisição responde, o preview já foi regenerado, então a tela que recarrega
 * em seguida já vê a mudança.
 */
@Injectable()
export class MenuEventos {
  constructor(
    private readonly emissor: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  /** Menu do registro (null se o tipo não pertence a um menu ou o registro não existe). */
  async menuDe(alvo: Alvo, id: number): Promise<number | null> {
    const sql = MENU_DO_REGISTRO[alvo];
    if (!sql) return null;
    const [linha] = (await this.dataSource.query(sql, [id])) as {
      menuId: number;
    }[];
    return linha ? Number(linha.menuId) : null;
  }

  /** Menus que têm itens com a tag. */
  async menusDaTag(tagId: number): Promise<number[]> {
    const linhas = (await this.dataSource.query(
      'SELECT DISTINCT c.MenuId AS menuId FROM ItemTag t JOIN Item i ON i.Id = t.ItemId JOIN SubCategoria s ON s.Id = i.SubCategoriaId JOIN Categoria c ON c.Id = s.CategoriaId WHERE t.TagId = ?',
      [tagId],
    )) as { menuId: number }[];
    return linhas.map((l) => Number(l.menuId));
  }

  async menusDoRestaurante(restauranteId: number): Promise<number[]> {
    const linhas = (await this.dataSource.query(
      'SELECT Id AS menuId FROM Menu WHERE RestauranteId = ?',
      [restauranteId],
    )) as { menuId: number }[];
    return linhas.map((l) => Number(l.menuId));
  }

  /** Avisa que esses menus mudaram (ignora vazios e repetidos). */
  async notificar(menuIds: (number | null)[], origem: string): Promise<void> {
    const ids = [...new Set(menuIds.filter((id): id is number => id !== null))];
    if (ids.length)
      await this.emissor.emitAsync(
        MENU_ALTERADO,
        new MenuAlteradoEvent(ids, origem),
      );
  }
}

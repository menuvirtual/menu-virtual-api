import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, In } from 'typeorm';
import { Categoria } from '../categorias/categoria.entity.js';
import { ItemMedia } from '../itens/item-media.entity.js';
import { Item } from '../itens/item.entity.js';
import { ConfiguracaoMenu } from '../menus/configuracao-menu.entity.js';
import { Menu } from '../menus/menu.entity.js';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import { SubCategoria } from '../subcategorias/subcategoria.entity.js';
import { MENU_ALTERADO, MenuAlteradoEvent } from './menu-alterado.event.js';
import { montarPayload, type DadosMenu } from './montador-payload.js';

/**
 * Handler do evento menu.alterado: lê o estado atual do menu nas tabelas, monta o JSON
 * (ver montarPayload), grava em Menu.PayloadPreview e liga ContemAtualizacaoParaPublicar.
 *
 * Roda dentro de uma transação que trava a linha do menu *antes* de ler as tabelas:
 * duas escritas simultâneas no mesmo menu são tratadas uma de cada vez, e a última
 * sempre enxerga o resultado da anterior (não sobrescreve um preview mais novo).
 *
 * Se falhar, a escrita que originou o evento já foi gravada: o erro é registrado no log
 * (não derruba a requisição) e a próxima escrita no menu regenera o preview.
 */
@Injectable()
export class AtualizadorPreview {
  private readonly logger = new Logger(AtualizadorPreview.name);

  constructor(private readonly dataSource: DataSource) {}

  @OnEvent(MENU_ALTERADO)
  async aoAlterarMenu(evento: MenuAlteradoEvent): Promise<void> {
    for (const menuId of evento.menuIds)
      try {
        await this.atualizar(menuId);
      } catch (erro) {
        this.logger.error(
          `Falha ao atualizar o preview do menu ${menuId} (origem: ${evento.origem}): ${(erro as Error).message}`,
          (erro as Error).stack,
        );
      }
  }

  async atualizar(menuId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const menu = await manager.findOne(Menu, {
        where: { id: menuId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!menu) return; // menu excluído

      const restaurante = await manager.findOneByOrFail(Restaurante, {
        id: menu.restauranteId,
      });
      const itens = await manager.find(Item, {
        where: { subCategoria: { categoria: { menuId } } },
        relations: { tags: true },
      });
      const dados: DadosMenu = {
        restauranteNome: restaurante.nome,
        configuracao: await manager.findOneBy(ConfiguracaoMenu, { menuId }),
        categorias: await manager.find(Categoria, { where: { menuId } }),
        subCategorias: await manager.find(SubCategoria, {
          where: { categoria: { menuId } },
        }),
        itens,
        medias: itens.length
          ? await manager.find(ItemMedia, {
              where: { itemId: In(itens.map((i) => i.id)) },
            })
          : [],
      };

      menu.payloadPreview = montarPayload(dados, menu.payloadPreview);
      menu.contemAtualizacaoParaPublicar = true;
      await manager.save(menu);
    });
  }
}

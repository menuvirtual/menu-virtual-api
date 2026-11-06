import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Menu } from '../menus/menu.entity.js';
import type { MenuPayload } from './cardapio.types.js';

/**
 * Leitura do payload publicado/preview de um restaurante.
 *
 * É uma classe abstrata para que a implementação possa ser trocada (ex.: em
 * testes) sem mexer no resto da API; o provider fica em cardapio.module.ts.
 */
export abstract class CardapioRepository {
  /**
   * Retorna o payload do menu ativo do restaurante (pelo slug) ou null se não existir.
   * @param preview true = versão de pré-visualização (PayloadPreview); false = publicada (Payload)
   */
  abstract buscarPayload(
    restaurante: string,
    preview: boolean,
  ): Promise<MenuPayload | null>;
}

/**
 * Implementação com TypeORM (MySQL):
 *
 *   SELECT m.Payload | m.PayloadPreview FROM Menu m
 *   INNER JOIN Restaurante r ON r.Id = m.RestauranteId
 *   WHERE r.Slug = ? AND m.IsAtivo = 1
 */
@Injectable()
export class CardapioTypeOrmRepository extends CardapioRepository {
  constructor(
    @InjectRepository(Menu)
    private readonly menus: Repository<Menu>,
  ) {
    super();
  }

  async buscarPayload(
    restaurante: string,
    preview: boolean,
  ): Promise<MenuPayload | null> {
    const linha = await this.menus
      .createQueryBuilder('m')
      .innerJoin('m.restaurante', 'r')
      .select(['m.id', preview ? 'm.payloadPreview' : 'm.payload'])
      .where('r.slug = :restaurante', { restaurante })
      .andWhere('m.isAtivo = 1')
      .getOne();
    return (preview ? linha?.payloadPreview : linha?.payload) ?? null;
  }
}

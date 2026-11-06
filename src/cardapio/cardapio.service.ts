import { Injectable, NotFoundException } from '@nestjs/common';
import { CardapioRepository } from './cardapio.repository.js';
import type { MenuPayload } from './cardapio.types.js';

@Injectable()
export class CardapioService {
  constructor(private readonly cardapios: CardapioRepository) {}

  /**
   * Devolve o payload do menu ativo do restaurante como está gravado; 404 se não existir.
   * @param preview true = versão de pré-visualização; false (padrão) = versão publicada
   */
  async obterPayload(
    restaurante: string,
    preview = false,
  ): Promise<MenuPayload> {
    const payload = await this.cardapios.buscarPayload(restaurante, preview);
    if (!payload)
      throw new NotFoundException(
        `Restaurante "${restaurante}" não encontrado ou sem menu ativo.`,
      );
    return payload;
  }
}

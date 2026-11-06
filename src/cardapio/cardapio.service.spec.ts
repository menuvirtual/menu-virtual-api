import { NotFoundException } from '@nestjs/common';
import type { CardapioRepository } from './cardapio.repository.js';
import { CardapioService } from './cardapio.service.js';
import type { MenuPayload } from './cardapio.types.js';

describe('CardapioService', () => {
  const ativo = {
    restaurante: { nome: { pt: 'Casa Teste' }, slogan: null },
  } as unknown as MenuPayload;
  const preview = {
    restaurante: { nome: { pt: 'Casa Teste (rascunho)' }, slogan: null },
  } as unknown as MenuPayload;
  const repositorio: CardapioRepository = {
    buscarPayload: async (restaurante: string, isPreview: boolean) => {
      if (restaurante !== 'casa-teste') return null;
      return isPreview ? preview : ativo;
    },
  };
  const servico = new CardapioService(repositorio);

  it('devolve a versão publicada do menu ativo por padrão, sem alterações', async () => {
    await expect(servico.obterPayload('casa-teste')).resolves.toBe(ativo);
  });

  it('devolve a versão de pré-visualização quando preview = true', async () => {
    await expect(servico.obterPayload('casa-teste', true)).resolves.toBe(
      preview,
    );
  });

  it('404 quando o restaurante não existe', async () => {
    await expect(servico.obterPayload('outro')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

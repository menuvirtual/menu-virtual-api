/** Nome do evento emitido depois de gravar no banco algo que faz parte de um menu. */
export const MENU_ALTERADO = 'menu.alterado';

/**
 * Algo que faz parte de um ou mais menus foi criado, alterado ou excluído (categoria,
 * subcategoria, item, mídia, configuração, tag usada em itens, nome do restaurante).
 * O handler (AtualizadorPreview) regenera o PayloadPreview desses menus.
 */
export class MenuAlteradoEvent {
  constructor(
    public readonly menuIds: number[],
    /** O que mudou, para log (ex.: "Item") */
    public readonly origem: string,
  ) {}
}

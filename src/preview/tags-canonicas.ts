/**
 * Tags dos payloads de exemplo que correspondem a uma tag padrão do domínio
 * (id usado no JSON -> descrição em português da tag). O seed usa para ligar o JSON às
 * tags; o montador do payload usa o inverso para manter os mesmos ids no JSON.
 */
export const TAG_PADRAO_POR_ID_PAYLOAD: Record<string, string> = {
  semGluten: 'Sem glúten',
  vegano: 'Vegano',
  chefRecomenda: 'Aprovado pelo chef',
};

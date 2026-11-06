import type { MenuPayload } from '../cardapio/cardapio.types.js';
import type { Categoria } from '../categorias/categoria.entity.js';
import type { ItemMedia } from '../itens/item-media.entity.js';
import type { Item } from '../itens/item.entity.js';
import type { ConfiguracaoMenu } from '../menus/configuracao-menu.entity.js';
import type { SubCategoria } from '../subcategorias/subcategoria.entity.js';
import type { Tag } from '../tags/tag.entity.js';
import { montarPayload, type DadosMenu } from './montador-payload.js';

const base = (): MenuPayload => ({
  restaurante: {
    nome: { pt: 'Casa Antiga', en: 'Casa Antiga' },
    slogan: { pt: 'Slogan antigo' },
  },
  moeda: { codigo: 'BRL', simbolo: 'R$', locale: 'pt-BR' },
  idiomas: [{ codigo: 'pt', rotulo: 'PT', nome: 'Português', locale: 'pt-BR' }],
  idiomaPadrao: 'pt',
  textos: { 'filtro.dica': { pt: 'Mostrar só:' } },
  filtros: [],
  redesSociais: {
    instagram: 'https://instagram.com/x',
    facebook: null,
    avaliacaoGoogle: null,
  },
  categorias: [
    {
      id: 'bebidas',
      icone: 'bi-cup-straw',
      nome: { pt: 'Bebidas' },
      subcategorias: [
        {
          id: 'vinhos',
          nome: { pt: 'Vinhos' },
          colunas: [{ pt: 'Taça' }, { pt: 'Garrafa' }],
          itens: [
            {
              id: 'tinto',
              nome: { pt: 'Tinto da Casa' },
              descricao: null,
              precos: [30, 150],
              fotos: [],
              dieta: [],
              tags: [],
            },
            {
              id: 'item-9',
              nome: { pt: 'Nome antigo' },
              descricao: null,
              precos: [40, 200],
              fotos: [],
              dieta: [],
              tags: [],
            },
          ],
        },
      ],
    },
  ],
});

const categoria = (dados: Partial<Categoria>) =>
  ({
    ordem: 0,
    descricaoEN: null,
    descricaoES: null,
    ...dados,
  }) as unknown as Categoria;
const sub = (dados: Partial<SubCategoria>) =>
  ({
    ordem: 0,
    descricaoEN: null,
    descricaoES: null,
    ...dados,
  }) as unknown as SubCategoria;
const item = (dados: Partial<Item>) =>
  ({
    ordem: 0,
    visivel: true,
    nomeEN: null,
    nomeES: null,
    descricaoPT: null,
    descricaoEN: null,
    descricaoES: null,
    tags: [],
    ...dados,
  }) as unknown as Item;
const tag = (dados: Partial<Tag>) =>
  ({ descricaoEN: null, descricaoES: null, ...dados }) as unknown as Tag;

const dadosBase = (): DadosMenu => ({
  restauranteNome: 'Casa Nova',
  configuracao: null,
  categorias: [
    categoria({ id: 1, descricaoPT: 'Bebidas', descricaoEN: 'Drinks' }),
  ],
  subCategorias: [sub({ id: 2, categoriaId: 1, descricaoPT: 'Vinhos' })],
  itens: [],
  medias: [],
});

describe('montarPayload', () => {
  it('monta categorias, subcategorias e itens das tabelas, na ordem, só com os itens visíveis', () => {
    const dados: DadosMenu = {
      ...dadosBase(),
      categorias: [
        categoria({ id: 2, ordem: 2, descricaoPT: 'Sobremesas' }),
        categoria({
          id: 1,
          ordem: 1,
          descricaoPT: 'Bebidas',
          descricaoEN: 'Drinks',
        }),
      ],
      subCategorias: [sub({ id: 5, categoriaId: 1, descricaoPT: 'Vinhos' })],
      itens: [
        item({
          id: 11,
          subCategoriaId: 5,
          ordem: 2,
          nomePT: 'Branco',
          descricaoPT: 'Seco',
        }),
        item({
          id: 10,
          subCategoriaId: 5,
          ordem: 1,
          nomePT: 'Tinto',
          nomeEN: 'Red',
        }),
        item({
          id: 12,
          subCategoriaId: 5,
          ordem: 3,
          nomePT: 'Oculto',
          visivel: false,
        }),
      ],
      medias: [
        { itemId: 10, tipo: 'I', url: 'http://x/b.jpg', ordem: 2, id: 2 },
        { itemId: 10, tipo: 'I', url: 'http://x/a.jpg', ordem: 1, id: 1 },
        { itemId: 10, tipo: 'V', url: 'http://x/v.mp4', ordem: 0, id: 3 },
      ] as ItemMedia[],
    };
    const { categorias } = montarPayload(dados, base());

    expect(categorias.map((c) => c.nome)).toEqual([
      { pt: 'Bebidas', en: 'Drinks' },
      { pt: 'Sobremesas' },
    ]);
    expect(categorias[0].subcategorias[0].itens.map((i) => i.nome)).toEqual([
      { pt: 'Tinto', en: 'Red' },
      { pt: 'Branco' },
    ]);
    const [tinto, branco] = categorias[0].subcategorias[0].itens;
    expect(tinto.fotos).toEqual(['http://x/a.jpg', 'http://x/b.jpg']); // só imagens, em ordem
    expect(tinto.descricao).toBeNull();
    expect(branco.descricao).toEqual({ pt: 'Seco' });
    expect(categorias[1].subcategorias).toEqual([]);
  });

  it('usa o nome do restaurante das tabelas e mantém o resto do JSON anterior', () => {
    const anterior = base();
    const novo = montarPayload(dadosBase(), anterior);
    expect(novo.restaurante).toEqual({
      nome: { pt: 'Casa Nova', en: 'Casa Nova' },
      slogan: { pt: 'Slogan antigo' },
    });
    expect(novo.moeda).toEqual(anterior.moeda);
    expect(novo.textos).toEqual(anterior.textos);
    expect(novo.redesSociais).toEqual(anterior.redesSociais);
  });

  it('preserva preços, colunas e ícone: por id (item-N) e, na primeira vez, pelo nome', () => {
    const dados: DadosMenu = {
      ...dadosBase(),
      itens: [
        item({ id: 9, subCategoriaId: 2, ordem: 1, nomePT: 'Renomeado' }), // acha por id "item-9"
        item({ id: 20, subCategoriaId: 2, ordem: 2, nomePT: 'Tinto da Casa' }), // acha pelo nome
        item({ id: 21, subCategoriaId: 2, ordem: 3, nomePT: 'Item novo' }),
      ],
    };
    const [c] = montarPayload(dados, base()).categorias;
    expect(c.icone).toBe('bi-cup-straw');
    const [s] = c.subcategorias;
    expect(s.colunas).toEqual([{ pt: 'Taça' }, { pt: 'Garrafa' }]);
    expect(s.itens.map((i) => i.precos)).toEqual([[40, 200], [30, 150], []]);
  });

  it('nó do JSON anterior vale para um registro só; sem correspondência, usa os padrões', () => {
    const dados: DadosMenu = {
      ...dadosBase(),
      categorias: [
        categoria({ id: 1, descricaoPT: 'Bebidas' }),
        categoria({ id: 3, ordem: 1, descricaoPT: 'Bebidas' }), // mesmo nome: não reaproveita o ícone
      ],
      subCategorias: [sub({ id: 4, categoriaId: 3, descricaoPT: 'Sucos' })],
    };
    const { categorias } = montarPayload(dados, base());
    expect(categorias.map((c) => c.icone)).toEqual(['bi-cup-straw', null]);
    expect(categorias[1].subcategorias[0].colunas).toEqual([
      { pt: 'Preço', en: 'Price', es: 'Precio' },
    ]);
  });

  it('tags de filtro viram dieta + filtros; as demais viram rótulos', () => {
    const vegano = tag({ id: 4, descricaoPT: 'Vegano', visibleLista: true });
    const picante = tag({
      id: 30,
      descricaoPT: 'Picante',
      descricaoEN: 'Spicy',
      visibleLista: false,
    });
    const sem = tag({ id: 31, descricaoPT: 'Sem lactose', visibleLista: true });
    const dados: DadosMenu = {
      ...dadosBase(),
      itens: [
        item({
          id: 1,
          subCategoriaId: 2,
          nomePT: 'A',
          tags: [picante, vegano],
        }),
        item({ id: 2, subCategoriaId: 2, nomePT: 'B', tags: [sem, vegano] }),
      ],
    };
    const payload = montarPayload(dados, base());
    const [a, b] = payload.categorias[0].subcategorias[0].itens;
    expect(a.dieta).toEqual(['vegano']); // id do JSON de exemplo para a tag padrão
    expect(a.tags).toEqual([
      { id: 'tag-30', nome: { pt: 'Picante', en: 'Spicy' } },
    ]);
    expect(b.dieta).toEqual(['vegano', 'tag-31']);
    expect(payload.filtros.map((f) => f.id)).toEqual(['vegano', 'tag-31']);
  });

  it('idiomas vêm da configuração do menu (PT como padrão); sem configuração, mantém os anteriores', () => {
    const flags = {
      habilitaPT: true,
      habilitaEN: true,
      habilitaES: false,
      habilitaFR: true,
      habilitaPL: false,
      habilitaDE: false,
    };
    const configuracao = flags as ConfiguracaoMenu;
    const com = montarPayload({ ...dadosBase(), configuracao }, base());
    expect(com.idiomas.map((i) => i.codigo)).toEqual(['pt', 'en', 'fr']);
    expect(com.idiomas[2]).toEqual({
      codigo: 'fr',
      rotulo: 'FR',
      nome: 'Français',
      locale: 'fr',
    });
    expect(com.idiomaPadrao).toBe('pt');

    const semPt = montarPayload(
      {
        ...dadosBase(),
        configuracao: { ...flags, habilitaPT: false } as ConfiguracaoMenu,
      },
      base(),
    );
    expect(semPt.idiomaPadrao).toBe('en');

    const sem = montarPayload(dadosBase(), base());
    expect(sem.idiomas).toEqual(base().idiomas);
  });
});

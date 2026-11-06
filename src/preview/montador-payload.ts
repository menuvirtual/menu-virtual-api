import type {
  MenuPayload,
  PayloadCategoria,
  PayloadItem,
  PayloadRotulo,
  PayloadSubcategoria,
  Traducao,
} from '../cardapio/cardapio.types.js';
import type { Categoria } from '../categorias/categoria.entity.js';
import type { ItemMedia } from '../itens/item-media.entity.js';
import type { Item } from '../itens/item.entity.js';
import type { ConfiguracaoMenu } from '../menus/configuracao-menu.entity.js';
import type { SubCategoria } from '../subcategorias/subcategoria.entity.js';
import type { Tag } from '../tags/tag.entity.js';
import { TAG_PADRAO_POR_ID_PAYLOAD } from './tags-canonicas.js';

/** Registros do menu, como estão nas tabelas, que viram o JSON. */
export interface DadosMenu {
  restauranteNome: string;
  configuracao: ConfiguracaoMenu | null;
  categorias: Categoria[];
  subCategorias: SubCategoria[];
  /** Itens com as tags carregadas */
  itens: Item[];
  medias: ItemMedia[];
}

const IDIOMAS = [
  {
    campo: 'habilitaPT',
    codigo: 'pt',
    rotulo: 'PT',
    nome: 'Português',
    locale: 'pt-BR',
  },
  {
    campo: 'habilitaEN',
    codigo: 'en',
    rotulo: 'EN',
    nome: 'English',
    locale: 'en',
  },
  {
    campo: 'habilitaES',
    codigo: 'es',
    rotulo: 'ES',
    nome: 'Español',
    locale: 'es',
  },
  {
    campo: 'habilitaFR',
    codigo: 'fr',
    rotulo: 'FR',
    nome: 'Français',
    locale: 'fr',
  },
  {
    campo: 'habilitaPL',
    codigo: 'pl',
    rotulo: 'PL',
    nome: 'Polski',
    locale: 'pl',
  },
  {
    campo: 'habilitaDE',
    codigo: 'de',
    rotulo: 'DE',
    nome: 'Deutsch',
    locale: 'de',
  },
] as const;

const SUFIXOS = [
  ['PT', 'pt'],
  ['EN', 'en'],
  ['ES', 'es'],
  ['FR', 'fr'],
  ['PL', 'pl'],
  ['DE', 'de'],
] as const;

/** Rótulo da coluna de preço quando a subcategoria ainda não tem colunas definidas */
const COLUNA_PADRAO: Traducao = { pt: 'Preço', en: 'Price', es: 'Precio' };

/** id da tag no JSON -> o inverso de TAG_PADRAO_POR_ID_PAYLOAD */
const ID_POR_TAG_PADRAO = Object.fromEntries(
  Object.entries(TAG_PADRAO_POR_ID_PAYLOAD).map(([id, descricao]) => [
    descricao,
    id,
  ]),
);

/** nomePT/nomeEN... ou descricaoPT/descricaoEN... -> { pt, en, ... } (só os idiomas preenchidos) */
function traduzir(entidade: object, prefixo: 'nome' | 'descricao'): Traducao {
  const dados = entidade as Record<string, string | null | undefined>;
  const traducao: Traducao = {};
  for (const [sufixo, codigo] of SUFIXOS) {
    const texto = dados[`${prefixo}${sufixo}`];
    if (texto?.trim()) traducao[codigo] = texto;
  }
  return traducao;
}

const porOrdem = <T extends { ordem: number; id: number }>(a: T, b: T) =>
  a.ordem - b.ordem || a.id - b.id;

function agrupar<T>(lista: T[], chave: (item: T) => number): Map<number, T[]> {
  const grupos = new Map<number, T[]>();
  for (const item of lista)
    grupos.set(chave(item), [...(grupos.get(chave(item)) ?? []), item]);
  return grupos;
}

/**
 * Localiza, no JSON anterior, o nó que corresponde a um registro do banco, para
 * reaproveitar o que as tabelas não guardam (preços, colunas, ícones). Procura pelo id
 * gerado (cat-1, sub-2, item-3) e, se o JSON ainda não tiver esses ids (ex.: veio do seed),
 * pelo nome em português entre os candidatos. Cada nó anterior é usado uma vez.
 */
class NosAnteriores<T extends { id: string; nome: Traducao }> {
  private readonly usados = new Set<T>();

  constructor(private readonly todos: T[]) {}

  achar(
    id: string,
    nomePt: string,
    candidatos: T[] = this.todos,
  ): T | undefined {
    const livre = (no: T) => !this.usados.has(no);
    const achado =
      this.todos.find((no) => no.id === id && livre(no)) ??
      candidatos.find((no) => no.nome.pt === nomePt && livre(no));
    if (achado) this.usados.add(achado);
    return achado;
  }
}

/**
 * Monta o JSON do cardápio (MenuPayload) a partir das tabelas do menu.
 *
 * - Vem das tabelas: nome do restaurante, idiomas (ConfiguracaoMenu), categorias,
 *   subcategorias, itens visíveis (nomes, descrições, ordem, fotos, tags).
 * - Vem do JSON anterior (`base`), porque ainda não existe nas tabelas: moeda, textos da
 *   interface, redes sociais, slogan, ícone das categorias, colunas de preço das
 *   subcategorias e preços dos itens (item novo = sem preço).
 * - Tags: as de lista de filtros (VisibleLista) viram `dieta` do item e entram em `filtros`;
 *   as demais viram `tags` (rótulos). Vídeos (ItemMedia tipo V) não entram: o JSON só tem fotos.
 */
export function montarPayload(
  dados: DadosMenu,
  base: MenuPayload,
): MenuPayload {
  const categoriasBase = base.categorias ?? [];
  const subsBase = new NosAnteriores(
    categoriasBase.flatMap((c) => c.subcategorias),
  );
  const itensBase = new NosAnteriores(
    categoriasBase.flatMap((c) => c.subcategorias.flatMap((s) => s.itens)),
  );
  const catsBase = new NosAnteriores(categoriasBase);

  const subsDaCategoria = agrupar(dados.subCategorias, (s) => s.categoriaId);
  const itensDaSub = agrupar(
    dados.itens.filter((i) => i.visivel),
    (i) => i.subCategoriaId,
  );
  const fotosDoItem = agrupar(
    dados.medias.filter((m) => m.tipo === 'I'),
    (m) => m.itemId,
  );
  const filtros = new Map<number, PayloadRotulo>();

  const categorias = [...dados.categorias]
    .sort(porOrdem)
    .map((c): PayloadCategoria => {
      const idCategoria = `cat-${c.id}`;
      const categoriaBase = catsBase.achar(idCategoria, c.descricaoPT);
      const subcategorias = [...(subsDaCategoria.get(c.id) ?? [])]
        .sort(porOrdem)
        .map((s): PayloadSubcategoria => {
          const idSub = `sub-${s.id}`;
          const subBase = subsBase.achar(
            idSub,
            s.descricaoPT,
            categoriaBase?.subcategorias,
          );
          const itens = [...(itensDaSub.get(s.id) ?? [])]
            .sort(porOrdem)
            .map((i): PayloadItem => {
              const idItem = `item-${i.id}`;
              const itemBase = itensBase.achar(
                idItem,
                i.nomePT,
                subBase?.itens,
              );
              const dieta: string[] = [];
              const tags: PayloadRotulo[] = [];
              for (const tag of [...(i.tags ?? [])].sort(
                (a, b) => a.id - b.id,
              )) {
                const rotulo = {
                  id: idDaTag(tag),
                  nome: traduzir(tag, 'descricao'),
                };
                if (tag.visibleLista) {
                  dieta.push(rotulo.id);
                  filtros.set(tag.id, rotulo);
                } else tags.push(rotulo);
              }
              const descricao = traduzir(i, 'descricao');
              return {
                id: idItem,
                nome: traduzir(i, 'nome'),
                descricao: Object.keys(descricao).length ? descricao : null,
                precos: itemBase?.precos ?? [],
                fotos: [...(fotosDoItem.get(i.id) ?? [])]
                  .sort(porOrdem)
                  .map((m) => m.url),
                dieta,
                tags,
              };
            });
          return {
            id: idSub,
            nome: traduzir(s, 'descricao'),
            colunas: subBase?.colunas?.length
              ? subBase.colunas
              : [COLUNA_PADRAO],
            itens,
          };
        });
      return {
        id: idCategoria,
        nome: traduzir(c, 'descricao'),
        icone: categoriaBase?.icone ?? null,
        subcategorias,
      };
    });

  const habilitados = dados.configuracao
    ? IDIOMAS.filter((idioma) => dados.configuracao![idioma.campo])
    : [];
  const codigosNome = Object.keys(base.restaurante?.nome ?? {});

  return {
    restaurante: {
      // o nome do restaurante é o mesmo em todos os idiomas
      nome: Object.fromEntries(
        (codigosNome.length ? codigosNome : ['pt']).map((codigo) => [
          codigo,
          dados.restauranteNome,
        ]),
      ),
      slogan: base.restaurante?.slogan ?? null,
    },
    moeda: base.moeda,
    idiomas: habilitados.length
      ? habilitados.map(({ codigo, rotulo, nome, locale }) => ({
          codigo,
          rotulo,
          nome,
          locale,
        }))
      : base.idiomas,
    idiomaPadrao: habilitados.length
      ? (habilitados.find((i) => i.codigo === 'pt') ?? habilitados[0]).codigo
      : base.idiomaPadrao,
    textos: base.textos,
    filtros: [...filtros.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, rotulo]) => rotulo),
    redesSociais: base.redesSociais,
    categorias,
  };
}

/** Id da tag no JSON: o dos payloads de exemplo para as tags padrão, senão tag-<id>. */
function idDaTag(tag: Tag): string {
  return ID_POR_TAG_PADRAO[tag.descricaoPT] ?? `tag-${tag.id}`;
}

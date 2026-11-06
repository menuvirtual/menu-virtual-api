import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { DataSource, DeepPartial, EntityManager } from 'typeorm';
import { UsuarioRestaurante } from '../acesso/usuario-restaurante.entity.js';
import type { MenuPayload, Traducao } from '../cardapio/cardapio.types.js';
import { TAG_PADRAO_POR_ID_PAYLOAD } from '../preview/tags-canonicas.js';
import { Categoria } from '../categorias/categoria.entity.js';
import { configuracao } from '../configuracao.js';
import { ItemMedia } from '../itens/item-media.entity.js';
import { Item } from '../itens/item.entity.js';
import { ConfiguracaoMenu } from '../menus/configuracao-menu.entity.js';
import { Menu } from '../menus/menu.entity.js';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import { SubCategoria } from '../subcategorias/subcategoria.entity.js';
import { Tag } from '../tags/tag.entity.js';

type Descricoes = Pick<
  Tag,
  | 'descricaoPT'
  | 'descricaoEN'
  | 'descricaoES'
  | 'descricaoFR'
  | 'descricaoPL'
  | 'descricaoDE'
>;

/** Tags obrigatórias do domínio (aparecem na lista de filtros). */
export const TAGS_PADRAO: Descricoes[] = [
  [
    'Sem glúten',
    'Gluten-free',
    'Sin gluten',
    'Sans gluten',
    'Bezglutenowe',
    'Glutenfrei',
  ],
  [
    'Sem conservantes',
    'Preservative-free',
    'Sin conservantes',
    'Sans conservateurs',
    'Bez konserwantów',
    'Ohne Konservierungsstoffe',
  ],
  [
    'Sem leite',
    'Dairy-free',
    'Sin leche',
    'Sans lait',
    'Bez mleka',
    'Ohne Milch',
  ],
  ['Vegano', 'Vegan', 'Vegano', 'Végan', 'Wegańskie', 'Vegan'],
  [
    'Aprovado pelo chef',
    'Chef approved',
    'Aprobado por el chef',
    'Approuvé par le chef',
    'Polecane przez szefa kuchni',
    'Vom Küchenchef empfohlen',
  ],
  [
    'Sem amendoim',
    'Peanut-free',
    'Sin cacahuete',
    'Sans arachides',
    'Bez orzeszków ziemnych',
    'Ohne Erdnüsse',
  ],
  ['Sem ovo', 'Egg-free', 'Sin huevo', 'Sans œuf', 'Bez jajek', 'Ohne Ei'],
  [
    'Sem alimentos do mar',
    'Seafood-free',
    'Sin mariscos',
    'Sans fruits de mer',
    'Bez owoców morza',
    'Ohne Meeresfrüchte',
  ],
].map(([pt, en, es, fr, pl, de]) => ({
  descricaoPT: pt,
  descricaoEN: en,
  descricaoES: es,
  descricaoFR: fr,
  descricaoPL: pl,
  descricaoDE: de,
}));

/**
 * Restaurantes (slugs) de cada usuário de teste do Cognito (ver
 * src/dev/configurar-cognito-local.ts). O SUPERUSER não precisa: pelo grupo
 * SuperUsuario, acessa todos.
 */
export const ACESSOS_TESTE: Record<string, string[]> = {
  USER1: ['casa-lusitana', 'chapa-quente'],
  USER2: ['casa-italiana'],
};

/** Nome (só para o admin) do menu ativo de cada restaurante de exemplo */
const NOME_MENU_ATIVO = 'Menu principal';

/** Nome do menu inativo de cada restaurante de exemplo (ver data/payloads/inativos) */
const NOME_MENU_INATIVO: Record<string, string> = {
  'casa-lusitana': 'Menu inverno',
  'chapa-quente': 'Menu brunch',
  'casa-italiana': 'Menu degustação',
};

/**
 * Dados iniciais:
 * 1. Tags: as 8 tags padrão e as tags/filtros usados nos payloads (só cria as que
 *    faltam, comparando pela DescricaoPT; não altera as existentes).
 * 2. Para cada data/payloads/<slug>.json: cria/atualiza o restaurante, **apaga os
 *    menus dele** (e, em cascata, toda a estrutura) e recria:
 *    - o menu ativo ("Menu principal"), com o JSON de data/payloads/<slug>.json;
 *    - um menu inativo (ex.: "Menu inverno"), com o JSON de data/payloads/inativos/<slug>.json
 *      (se existir; outra versão do cardápio, com outros textos).
 *    Em ambos o PayloadPreview começa igual ao Payload. Cada menu ganha configuração,
 *    categorias, subcategorias, itens (com tags) e mídias convertidas do payload.
 *
 * 3. Vincula os usuários de teste aos restaurantes (ACESSOS_TESTE), sem remover
 *    outros vínculos.
 *
 * Pode rodar várias vezes. Clientes não são alterados.
 */
export async function semearBanco(
  dataSource: DataSource,
  diretorioPayloads = join(configuracao.diretorioDados, 'payloads'),
): Promise<void> {
  const arquivos = (await readdir(diretorioPayloads))
    .filter((arquivo) => arquivo.endsWith('.json'))
    .sort();
  const lerPayload = async (caminho: string) =>
    JSON.parse(await readFile(caminho, 'utf8')) as MenuPayload;
  const payloads = await Promise.all(
    arquivos.map(async (arquivo) => {
      const inativo = join(diretorioPayloads, 'inativos', arquivo);
      return {
        slug: basename(arquivo, '.json'),
        payload: await lerPayload(join(diretorioPayloads, arquivo)),
        payloadInativo: existsSync(inativo) ? await lerPayload(inativo) : null,
      };
    }),
  );

  await dataSource.transaction(async (manager) => {
    const tagsPorIdPayload = await semearTags(
      manager,
      payloads.flatMap((p) =>
        p.payloadInativo ? [p.payload, p.payloadInativo] : [p.payload],
      ),
    );
    for (const { slug, payload, payloadInativo } of payloads)
      await semearRestaurante(
        manager,
        slug,
        payload,
        payloadInativo,
        tagsPorIdPayload,
      );
    await semearAcessos(manager);
  });
}

async function semearAcessos(manager: EntityManager): Promise<void> {
  const restaurantes = await manager.find(Restaurante);
  const idPorSlug = new Map(restaurantes.map((r) => [r.slug, r.id]));
  const vinculos = Object.entries(ACESSOS_TESTE).flatMap(([usuario, slugs]) =>
    slugs
      .filter((slug) => idPorSlug.has(slug))
      .map((slug) => ({ usuario, restauranteId: idPorSlug.get(slug)! })),
  );
  if (vinculos.length)
    await manager
      .createQueryBuilder()
      .insert()
      .into(UsuarioRestaurante)
      .values(vinculos)
      .orIgnore()
      .execute();
}

/** Cria as tags que faltam; devolve as tags indexadas pelo id usado nos payloads. */
async function semearTags(
  manager: EntityManager,
  payloads: MenuPayload[],
): Promise<Map<string, Tag>> {
  const repositorio = manager.getRepository(Tag);
  const porDescricao = new Map(
    (await repositorio.find()).map((tag) => [tag.descricaoPT, tag]),
  );
  const garantir = async (dados: Descricoes, visibleLista: boolean) => {
    let tag = porDescricao.get(dados.descricaoPT);
    if (!tag) {
      tag = await repositorio.save(
        repositorio.create({ ...dados, visibleLista }),
      );
      porDescricao.set(tag.descricaoPT, tag);
    }
    return tag;
  };

  for (const dados of TAGS_PADRAO) await garantir(dados, true);

  // Filtros (aparecem na lista) e tags dos itens de todos os payloads
  const idsFiltro = new Set(
    payloads.flatMap((p) => p.filtros.map((f) => f.id)),
  );
  const rotulos = new Map<string, Traducao>();
  for (const payload of payloads) {
    for (const filtro of payload.filtros) rotulos.set(filtro.id, filtro.nome);
    for (const categoria of payload.categorias)
      for (const sub of categoria.subcategorias)
        for (const item of sub.itens)
          for (const tag of item.tags) rotulos.set(tag.id, tag.nome);
  }

  const porIdPayload = new Map<string, Tag>();
  for (const [id, nome] of rotulos) {
    const padrao = TAG_PADRAO_POR_ID_PAYLOAD[id];
    const tag = padrao
      ? porDescricao.get(padrao)!
      : await garantir(
          {
            descricaoPT: nome.pt,
            descricaoEN: nome.en ?? null,
            descricaoES: nome.es ?? null,
            descricaoFR: nome.fr ?? null,
            descricaoPL: nome.pl ?? null,
            descricaoDE: nome.de ?? null,
          },
          idsFiltro.has(id),
        );
    porIdPayload.set(id, tag);
  }
  return porIdPayload;
}

async function semearRestaurante(
  manager: EntityManager,
  slug: string,
  payload: MenuPayload,
  payloadInativo: MenuPayload | null,
  tagsPorIdPayload: Map<string, Tag>,
): Promise<void> {
  const restaurantes = manager.getRepository(Restaurante);
  const restaurante =
    (await restaurantes.findOneBy({ slug })) ?? restaurantes.create({ slug });
  restaurante.nome =
    payload.restaurante.nome[payload.idiomaPadrao] ??
    Object.values(payload.restaurante.nome)[0] ??
    slug;
  await restaurantes.save(restaurante);

  await manager.delete(Menu, { restauranteId: restaurante.id });
  const versoes = [{ nome: NOME_MENU_ATIVO, conteudo: payload, isAtivo: true }];
  if (payloadInativo)
    versoes.push({
      nome: NOME_MENU_INATIVO[slug] ?? 'Menu alternativo',
      conteudo: payloadInativo,
      isAtivo: false,
    });
  for (const { nome, conteudo, isAtivo } of versoes) {
    const menu = await manager.save(
      manager.create(Menu, {
        restauranteId: restaurante.id,
        nome,
        payload: conteudo,
        payloadPreview: conteudo,
        isAtivo,
      }),
    );
    await semearEstrutura(manager, menu, conteudo, tagsPorIdPayload);
  }
}

/** Converte o payload em ConfiguracaoMenu, Categoria, SubCategoria, Item e ItemMedia. */
async function semearEstrutura(
  manager: EntityManager,
  menu: Menu,
  payload: MenuPayload,
  tagsPorIdPayload: Map<string, Tag>,
): Promise<void> {
  const idiomas = new Set(payload.idiomas.map((i) => i.codigo.toLowerCase()));
  const pesquisa = 'cadastro.titulo' in payload.textos;
  await manager.save(
    manager.create(ConfiguracaoMenu, {
      menuId: menu.id,
      habilitaPT: idiomas.has('pt'),
      habilitaEN: idiomas.has('en'),
      habilitaES: idiomas.has('es'),
      habilitaFR: idiomas.has('fr'),
      habilitaPL: idiomas.has('pl'),
      habilitaDE: idiomas.has('de'),
      habilitaPesquisaCliente: pesquisa,
      habilitaPesquisaClienteNome: 'cadastro.nome' in payload.textos,
      habilitaPesquisaClienteDataNiver:
        'cadastro.aniversario' in payload.textos,
      habilitaPesquisaClienteEmail: 'cadastro.email' in payload.textos,
      habilitaPesquisaClientePhone: 'cadastro.telefone' in payload.textos,
    }),
  );

  for (const [iCategoria, c] of payload.categorias.entries()) {
    const categoria = await manager.save(
      manager.create(Categoria, {
        menuId: menu.id,
        ordem: iCategoria + 1,
        ...traduzir('descricao', c.nome),
      } as DeepPartial<Categoria>),
    );
    for (const [iSub, s] of c.subcategorias.entries()) {
      const subCategoria = await manager.save(
        manager.create(SubCategoria, {
          categoriaId: categoria.id,
          ordem: iSub + 1,
          ...traduzir('descricao', s.nome),
        } as DeepPartial<SubCategoria>),
      );
      for (const [iItem, i] of s.itens.entries()) {
        const tags = [...new Set([...i.dieta, ...i.tags.map((t) => t.id)])]
          .map((id) => tagsPorIdPayload.get(id))
          .filter((tag): tag is Tag => !!tag);
        const item = await manager.save(
          manager.create(Item, {
            subCategoriaId: subCategoria.id,
            ordem: iItem + 1,
            visivel: true,
            ...traduzir('nome', i.nome),
            ...traduzir('descricao', i.descricao ?? {}),
            tags: [...new Map(tags.map((t) => [t.id, t])).values()],
          } as DeepPartial<Item>),
        );
        await manager.save(
          i.fotos.map((url, iFoto) =>
            manager.create(ItemMedia, {
              itemId: item.id,
              tipo: 'I',
              url,
              ordem: iFoto + 1,
            }),
          ),
        );
      }
    }
  }
}

/**
 * { pt: "Bebidas", en: "Drinks" } -> { descricaoPT: "Bebidas", descricaoEN: "Drinks", descricaoES: null, ... }
 * Sem "pt", o PT recebe o primeiro texto disponível (null se não houver nenhum).
 */
function traduzir<P extends 'nome' | 'descricao'>(
  prefixo: P,
  texto: Traducao,
): Record<`${P}${'PT' | 'EN' | 'ES' | 'FR' | 'PL' | 'DE'}`, string | null> {
  const valor = (codigo: string) => texto[codigo] ?? null;
  return {
    [`${prefixo}PT`]: valor('pt') ?? Object.values(texto)[0] ?? null,
    [`${prefixo}EN`]: valor('en'),
    [`${prefixo}ES`]: valor('es'),
    [`${prefixo}FR`]: valor('fr'),
    [`${prefixo}PL`]: valor('pl'),
    [`${prefixo}DE`]: valor('de'),
  } as Record<`${P}${'PT' | 'EN' | 'ES' | 'FR' | 'PL' | 'DE'}`, string | null>;
}

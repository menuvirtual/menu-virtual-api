import type { NestExpressApplication } from '@nestjs/platform-express';
import type { DataSource } from 'typeorm';
import type { MenuPayload } from './../src/cardapio/cardapio.types.js';
import { semearBanco } from './../src/database/seed.js';
import { semearClientes } from './../src/dev/clientes-aleatorios.js';
import { gerarClientes } from './../src/dev/gerador-clientes.js';
import { Restaurante } from './../src/restaurantes/restaurante.entity.js';
import { comToken, criarAppTeste, entrar } from './app-teste.js';

/** Menu como a API devolve em GET /admin/menus/:id (com os dois JSON) */
interface MenuCompleto {
  id: number;
  nome: string;
  isAtivo: boolean;
  contemAtualizacaoParaPublicar: boolean;
  payload: MenuPayload;
  payloadPreview: MenuPayload;
}

/** Nome de menu único por chamada (o nome é obrigatório e único por restaurante) */
let contadorMenu = 0;
const nomeMenu = () => `Menu de teste ${++contadorMenu}`;

// CRUDs feitos como SUPERUSER (acessa todos os restaurantes); as regras de acesso
// por usuário estão em auth.e2e-spec.ts.
describe('Admin /admin/... (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let token: string;
  const api = () => comToken(app, token);

  beforeAll(async () => {
    ({ app, dataSource } = await criarAppTeste());
    token = await entrar(app, 'SUPERUSER');
    await limparRestaurantesDeTeste();
  });

  afterAll(async () => {
    await limparRestaurantesDeTeste();
    await app.close();
  });

  /** Remove os restaurantes "teste-*" criados por estes testes (e seus menus/clientes) */
  async function limparRestaurantesDeTeste(): Promise<void> {
    const ids = (
      await dataSource
        .getRepository(Restaurante)
        .createQueryBuilder('r')
        .where('r.slug LIKE :p', { p: 'teste-%' })
        .getMany()
    ).map((r) => r.id);
    if (!ids.length) return;
    await dataSource.query('DELETE FROM `Menu` WHERE `RestauranteId` IN (?)', [
      ids,
    ]);
    await dataSource.query(
      'DELETE FROM `Cliente` WHERE `RestauranteId` IN (?)',
      [ids],
    );
    await dataSource.query('DELETE FROM `Restaurante` WHERE `Id` IN (?)', [
      ids,
    ]);
  }

  async function criarRestaurante(slug: string): Promise<Restaurante> {
    return (
      await api()
        .post('/admin/restaurantes')
        .send({ nome: `Restaurante ${slug}`, slug })
        .expect(201)
    ).body as Restaurante;
  }

  describe('Restaurantes', () => {
    it('CRUD completo', async () => {
      const criado = await criarRestaurante('teste-crud');
      expect(criado).toMatchObject({
        nome: 'Restaurante teste-crud',
        slug: 'teste-crud',
      });

      const lista = (await api().get('/admin/restaurantes').expect(200)).body;
      expect(lista.map((r: Restaurante) => r.slug)).toContain('teste-crud');

      const alterado = (
        await api()
          .patch(`/admin/restaurantes/${criado.id}`)
          .send({ nome: '  Novo nome  ' })
          .expect(200)
      ).body;
      expect(alterado).toMatchObject({ nome: 'Novo nome', slug: 'teste-crud' });

      await api().delete(`/admin/restaurantes/${criado.id}`).expect(204);
      await api().get(`/admin/restaurantes/${criado.id}`).expect(404);
    });

    it('409 para slug repetido; 400 para slug inválido ou campo desconhecido', async () => {
      await criarRestaurante('teste-slug');
      const dup = await api()
        .post('/admin/restaurantes')
        .send({ nome: 'X', slug: 'teste-slug' })
        .expect(409);
      expect(dup.body.message).toContain('slug');
      await api()
        .post('/admin/restaurantes')
        .send({ nome: 'X', slug: 'Slug Inválido' })
        .expect(400);
      const desconhecido = await api()
        .post('/admin/restaurantes')
        .send({ nome: 'X', slug: 'teste-x', outro: 1 })
        .expect(400);
      expect(JSON.stringify(desconhecido.body.message)).toContain('outro');
      const vazio = await api()
        .post('/admin/restaurantes')
        .send({ nome: '   ', slug: 'teste-y' })
        .expect(400);
      expect(vazio.body.message).toContain('nome é obrigatório.');
    });

    it('400 para id inválido e 404 para id inexistente', async () => {
      await api().get('/admin/restaurantes/abc').expect(400);
      await api().get('/admin/restaurantes/999999').expect(404);
    });

    it('409 ao excluir restaurante com menus ou clientes', async () => {
      const r = await criarRestaurante('teste-vinculos');
      const menu = (
        await api()
          .post('/admin/menus')
          .send({ restauranteId: r.id, nome: nomeMenu() })
          .expect(201)
      ).body;
      const res = await api().delete(`/admin/restaurantes/${r.id}`).expect(409);
      expect(res.body.message).toContain('1 menu(s)');
      await api().delete(`/admin/menus/${menu.id}`).expect(204);
      await api().delete(`/admin/restaurantes/${r.id}`).expect(204);
    });
  });

  describe('Menus: regras de negócio', () => {
    let restaurante: Restaurante;

    beforeAll(async () => {
      restaurante = await criarRestaurante('teste-menus');
    });

    const criarMenu = (dados: object = {}) =>
      api()
        .post('/admin/menus')
        .send({ restauranteId: restaurante.id, nome: nomeMenu(), ...dados });

    it('nome: obrigatório, só para o admin (fora do JSON do cardápio), único por restaurante', async () => {
      const semNome = await api()
        .post('/admin/menus')
        .send({ restauranteId: restaurante.id })
        .expect(400);
      expect(JSON.stringify(semNome.body.message)).toContain(
        'nome é obrigatório',
      );
      await criarMenu({ nome: '   ' }).expect(400);
      await criarMenu({ nome: 'x'.repeat(81) }).expect(400);

      const dia = (await criarMenu({ nome: '  Menu dia  ' }).expect(201))
        .body as MenuCompleto;
      expect(dia.nome).toBe('Menu dia'); // aparado
      expect(JSON.stringify(dia.payload)).not.toContain('Menu dia');
      expect(JSON.stringify(dia.payloadPreview)).not.toContain('Menu dia');

      const repetido = await criarMenu({ nome: 'Menu dia' }).expect(409);
      expect(repetido.body.message).toContain('Menu dia');

      const noite = (await criarMenu({ nome: 'Menu noite' }).expect(201))
        .body as MenuCompleto;
      await api()
        .patch(`/admin/menus/${noite.id}`)
        .send({ nome: 'Menu dia' })
        .expect(409);
      const renomeado = (
        await api()
          .patch(`/admin/menus/${noite.id}`)
          .send({ nome: 'Menu drinks' })
          .expect(200)
      ).body as MenuCompleto;
      expect(renomeado.nome).toBe('Menu drinks');
      // regravar o próprio nome não conflita, e renomear não é "algo a publicar"
      await api()
        .patch(`/admin/menus/${noite.id}`)
        .send({ nome: 'Menu drinks' })
        .expect(200);
      expect(renomeado.contemAtualizacaoParaPublicar).toBe(false);
      await api()
        .patch(`/admin/menus/${noite.id}`)
        .send({ nome: '' })
        .expect(400);

      const lista = (
        await api()
          .get(`/admin/menus?restauranteId=${restaurante.id}`)
          .expect(200)
      ).body as { id: number; nome: string }[];
      expect(lista.find((m) => m.id === noite.id)?.nome).toBe('Menu drinks');

      // o mesmo nome pode existir em outro restaurante
      const outro = await criarRestaurante('teste-nome-menu');
      await api()
        .post('/admin/menus')
        .send({ restauranteId: outro.id, nome: 'Menu dia' })
        .expect(201);
    });

    it('o menu nasce vazio, com o JSON gerado pela API (publicado = preview) e nada a publicar', async () => {
      const menu = (await criarMenu().expect(201)).body as MenuCompleto;
      expect(menu).toMatchObject({
        isAtivo: false,
        contemAtualizacaoParaPublicar: false,
      });
      expect(menu).not.toHaveProperty('isPreview');
      expect(menu.payloadPreview).toEqual(menu.payload);
      expect(menu.payload.restaurante.nome.pt).toBe('Restaurante teste-menus');
      expect(menu.payload.categorias).toEqual([]);
      expect(Object.keys(menu.payload.textos).length).toBeGreaterThan(10); // textos da interface
    });

    it('o JSON não é editável pelo usuário: payload e payloadPreview são recusados (400)', async () => {
      await criarMenu({ payload: { restaurante: {} } }).expect(400);
      await criarMenu({ payloadPreview: { restaurante: {} } }).expect(400);
      await criarMenu({ isPreview: true }).expect(400);
      const menu = (await criarMenu().expect(201)).body as MenuCompleto;
      for (const campo of ['payload', 'payloadPreview'])
        await api()
          .patch(`/admin/menus/${menu.id}`)
          .send({ [campo]: { restaurante: {} } })
          .expect(400);
      await api()
        .patch(`/admin/menus/${menu.id}`)
        .send({ contemAtualizacaoParaPublicar: true })
        .expect(400);
    });

    it('vários menus, só 1 ativo: ativar um desativa o anterior', async () => {
      const m1 = (await criarMenu({ isAtivo: true }).expect(201)).body;
      const m2 = (await criarMenu({ isAtivo: true }).expect(201)).body;

      const lista = (
        await api()
          .get(`/admin/menus?restauranteId=${restaurante.id}`)
          .expect(200)
      ).body as {
        id: number;
        isAtivo: boolean;
        contemAtualizacaoParaPublicar: boolean;
      }[];
      expect(lista.filter((m) => m.isAtivo).map((m) => m.id)).toEqual([m2.id]);
      expect(lista[0]).not.toHaveProperty('payload'); // listagem sem os payloads
      expect(lista[0]).not.toHaveProperty('payloadPreview');
      expect(lista[0]).toHaveProperty('contemAtualizacaoParaPublicar', false);
      expect(lista[0]).toHaveProperty('restaurante.slug', 'teste-menus');
      await api().get('/menu?restaurante=teste-menus').expect(200);

      await api()
        .patch(`/admin/menus/${m1.id}`)
        .send({ isAtivo: true })
        .expect(200);
      const m2Agora = (await api().get(`/admin/menus/${m2.id}`).expect(200))
        .body;
      expect(m2Agora.isAtivo).toBe(false);
      const m1Agora = (await api().get(`/admin/menus/${m1.id}`).expect(200))
        .body;
      expect(m1Agora.isAtivo).toBe(true);
    });

    it('não permite trocar o restaurante do menu', async () => {
      const m = (await criarMenu().expect(201)).body;
      await api()
        .patch(`/admin/menus/${m.id}`)
        .send({ restauranteId: 1 })
        .expect(400);
    });

    it('404 para restaurante inexistente', async () => {
      await api()
        .post('/admin/menus')
        .send({ restauranteId: 999999, nome: 'Qualquer' })
        .expect(404);
    });
  });

  describe('Preview e publicação', () => {
    let restaurante: Restaurante;
    let menuId: number;
    let veganoId: number;
    const menu = async () =>
      (await api().get(`/admin/menus/${menuId}`).expect(200))
        .body as MenuCompleto;
    const publicar = () => api().post(`/admin/menus/${menuId}/publicar`);
    const publico = async (preview: boolean) =>
      (
        await api()
          .get(
            `/menu?restaurante=teste-preview${preview ? '&preview=true' : ''}`,
          )
          .expect(200)
      ).body as MenuPayload;

    beforeAll(async () => {
      restaurante = await criarRestaurante('teste-preview');
      menuId = (
        await api()
          .post('/admin/menus')
          .send({
            restauranteId: restaurante.id,
            nome: 'Menu do preview',
            isAtivo: true,
          })
          .expect(201)
      ).body.id;
      const tags = (await api().get('/admin/tags').expect(200)).body as {
        id: number;
        descricaoPT: string;
      }[];
      veganoId = tags.find((t) => t.descricaoPT === 'Vegano')!.id;
    });

    it('cada escrita no menu regenera o preview e liga a flag; o publicado não muda', async () => {
      expect((await menu()).contemAtualizacaoParaPublicar).toBe(false);

      const categoria = (
        await api()
          .post('/admin/categorias')
          .send({ menuId, descricaoPT: 'Entradas', descricaoEN: 'Starters' })
          .expect(201)
      ).body;
      // a resposta só volta depois do preview regenerado
      let atual = await menu();
      expect(atual.contemAtualizacaoParaPublicar).toBe(true);
      expect(atual.payloadPreview.categorias.map((c) => c.nome)).toEqual([
        { pt: 'Entradas', en: 'Starters' },
      ]);
      expect(atual.payload.categorias).toEqual([]);

      const sub = (
        await api()
          .post('/admin/subcategorias')
          .send({ categoriaId: categoria.id, descricaoPT: 'Frios' })
          .expect(201)
      ).body;
      const item = (
        await api()
          .post('/admin/itens')
          .send({
            subCategoriaId: sub.id,
            nomePT: 'Queijo',
            descricaoPT: 'Curado',
            tagIds: [veganoId],
          })
          .expect(201)
      ).body;
      await api()
        .post('/admin/item-medias')
        .send({
          itemId: item.id,
          tipo: 'I',
          url: 'http://localhost:3000/imagens/q.jpg',
        })
        .expect(201);
      await api()
        .post('/admin/item-medias')
        .send({
          itemId: item.id,
          tipo: 'V',
          url: 'http://localhost:3000/videos/q.mp4',
        })
        .expect(201);

      atual = await menu();
      const [categoriaJson] = atual.payloadPreview.categorias;
      expect(categoriaJson).toMatchObject({
        id: `cat-${categoria.id}`,
        icone: null,
      });
      const [subJson] = categoriaJson.subcategorias;
      expect(subJson.nome.pt).toBe('Frios');
      expect(subJson.colunas).toEqual([
        { pt: 'Preço', en: 'Price', es: 'Precio' },
      ]);
      expect(subJson.itens).toEqual([
        {
          id: `item-${item.id}`,
          nome: { pt: 'Queijo' },
          descricao: { pt: 'Curado' },
          precos: [],
          fotos: ['http://localhost:3000/imagens/q.jpg'], // o vídeo não entra
          dieta: ['vegano'],
          tags: [],
        },
      ]);
      expect(atual.payloadPreview.filtros.map((f) => f.id)).toEqual(['vegano']);
      expect(atual.payload.categorias).toEqual([]);

      // GET /menu devolve o publicado; preview=true, a prévia
      expect((await publico(false)).categorias).toEqual([]);
      expect((await publico(true)).categorias).toHaveLength(1);
    });

    it('publicar copia o preview para o payload, desliga a flag e o GET /menu já mostra', async () => {
      const antes = await menu();
      const res = await publicar().expect(200);
      expect(res.body).toMatchObject({
        id: menuId,
        contemAtualizacaoParaPublicar: false,
      });
      const depois = await menu();
      expect(depois.payload).toEqual(antes.payloadPreview);
      expect(depois.payloadPreview).toEqual(antes.payloadPreview);
      expect((await publico(false)).categorias).toHaveLength(1);

      const lista = (
        await api()
          .get(`/admin/menus?restauranteId=${restaurante.id}`)
          .expect(200)
      ).body as { id: number; contemAtualizacaoParaPublicar: boolean }[];
      expect(
        lista.find((m) => m.id === menuId)?.contemAtualizacaoParaPublicar,
      ).toBe(false);

      const repetido = await publicar().expect(409);
      expect(repetido.body.message).toContain('não tem atualizações');
      await api().post('/admin/menus/999999/publicar').expect(404);
    });

    it('alterar, ocultar, excluir e configurar também atualizam o preview e ligam a flag', async () => {
      const [categoria] = (await menu()).payloadPreview.categorias;
      const itemId = Number(
        categoria.subcategorias[0].itens[0].id.replace('item-', ''),
      );
      const subId = Number(categoria.subcategorias[0].id.replace('sub-', ''));
      const categoriaId = Number(categoria.id.replace('cat-', ''));
      const preview = async () => (await menu()).payloadPreview;
      const aposPublicar = async () => {
        expect((await menu()).contemAtualizacaoParaPublicar).toBe(true);
        await publicar().expect(200);
      };

      await api()
        .patch(`/admin/itens/${itemId}`)
        .send({ nomePT: 'Queijo curado', nomeEN: 'Cured cheese' })
        .expect(200);
      expect(
        (await preview()).categorias[0].subcategorias[0].itens[0].nome,
      ).toEqual({
        pt: 'Queijo curado',
        en: 'Cured cheese',
      });
      await aposPublicar();

      await api()
        .patch(`/admin/itens/${itemId}`)
        .send({ visivel: false })
        .expect(200);
      expect((await preview()).categorias[0].subcategorias[0].itens).toEqual(
        [],
      );
      await aposPublicar();

      await api()
        .patch(`/admin/subcategorias/${subId}`)
        .send({ descricaoPT: 'Frios e queijos' })
        .expect(200);
      expect((await preview()).categorias[0].subcategorias[0].nome.pt).toBe(
        'Frios e queijos',
      );
      await aposPublicar();

      await api()
        .patch(`/admin/categorias/${categoriaId}`)
        .send({ descricaoPT: 'Aperitivos' })
        .expect(200);
      expect((await preview()).categorias[0].nome.pt).toBe('Aperitivos');
      await aposPublicar();

      // idiomas vêm da configuração do menu
      const config = (
        await api()
          .post('/admin/configuracoes-menu')
          .send({ menuId, habilitaEN: true })
          .expect(201)
      ).body;
      expect((await preview()).idiomas.map((i) => i.codigo)).toEqual([
        'pt',
        'en',
      ]);
      await aposPublicar();
      await api()
        .patch(`/admin/configuracoes-menu/${config.id}`)
        .send({ habilitaFR: true })
        .expect(200);
      expect((await preview()).idiomas.map((i) => i.codigo)).toEqual([
        'pt',
        'en',
        'fr',
      ]);
      await aposPublicar();

      await api().delete(`/admin/itens/${itemId}`).expect(204);
      expect((await preview()).categorias[0].subcategorias[0].itens).toEqual(
        [],
      );
      await aposPublicar();
      await api().delete(`/admin/categorias/${categoriaId}`).expect(204);
      expect((await preview()).categorias).toEqual([]);
      await aposPublicar();
    });

    it('tag alterada/excluída (superusuário) atualiza os menus que a usam', async () => {
      const tag = (
        await api()
          .post('/admin/tags')
          .send({
            descricaoPT: 'Teste preview',
            descricaoEN: 'Preview test',
            visibleLista: false,
          })
          .expect(201)
      ).body;
      const categoria = (
        await api()
          .post('/admin/categorias')
          .send({ menuId, descricaoPT: 'C' })
          .expect(201)
      ).body;
      const sub = (
        await api()
          .post('/admin/subcategorias')
          .send({ categoriaId: categoria.id, descricaoPT: 'S' })
          .expect(201)
      ).body;
      await api()
        .post('/admin/itens')
        .send({ subCategoriaId: sub.id, nomePT: 'I', tagIds: [tag.id] })
        .expect(201);
      await publicar().expect(200);
      const tagsDoItem = async () =>
        (await menu()).payloadPreview.categorias[0].subcategorias[0].itens[0]
          .tags;
      expect(await tagsDoItem()).toEqual([
        {
          id: `tag-${tag.id}`,
          nome: { pt: 'Teste preview', en: 'Preview test' },
        },
      ]);

      // criar uma tag não afeta nenhum menu
      const outra = (
        await api()
          .post('/admin/tags')
          .send({ descricaoPT: 'Sem uso' })
          .expect(201)
      ).body;
      expect((await menu()).contemAtualizacaoParaPublicar).toBe(false);
      await api().delete(`/admin/tags/${outra.id}`).expect(204);
      expect((await menu()).contemAtualizacaoParaPublicar).toBe(false);

      await api()
        .patch(`/admin/tags/${tag.id}`)
        .send({ descricaoPT: 'Renomeada' })
        .expect(200);
      expect((await menu()).contemAtualizacaoParaPublicar).toBe(true);
      expect((await tagsDoItem())[0].nome.pt).toBe('Renomeada');
      await publicar().expect(200);

      await api().delete(`/admin/tags/${tag.id}`).expect(204);
      expect((await menu()).contemAtualizacaoParaPublicar).toBe(true);
      expect(await tagsDoItem()).toEqual([]);
      await publicar().expect(200);
    });

    it('renomear o restaurante atualiza o nome no preview (só quando o nome muda)', async () => {
      await api()
        .patch(`/admin/restaurantes/${restaurante.id}`)
        .send({ slug: 'teste-preview' })
        .expect(200);
      expect((await menu()).contemAtualizacaoParaPublicar).toBe(false);

      await api()
        .patch(`/admin/restaurantes/${restaurante.id}`)
        .send({ nome: 'Restaurante Renomeado' })
        .expect(200);
      const atual = await menu();
      expect(atual.contemAtualizacaoParaPublicar).toBe(true);
      expect(atual.payloadPreview.restaurante.nome.pt).toBe(
        'Restaurante Renomeado',
      );
      expect(atual.payload.restaurante.nome.pt).toBe(
        'Restaurante teste-preview',
      );
      await publicar().expect(200);
      expect((await publico(false)).restaurante.nome.pt).toBe(
        'Restaurante Renomeado',
      );
    });

    it('menu do seed: o preview regenerado mantém preços, colunas e ícones do JSON anterior', async () => {
      try {
        const restauranteSeed = (
          (await api().get('/admin/restaurantes').expect(200)).body as {
            id: number;
            slug: string;
          }[]
        ).find((r) => r.slug === 'casa-lusitana')!;
        const ativo = (
          (
            await api()
              .get(`/admin/menus?restauranteId=${restauranteSeed.id}`)
              .expect(200)
          ).body as {
            id: number;
            isAtivo: boolean;
          }[]
        ).find((m) => m.isAtivo)!;
        const seed = (await api().get(`/admin/menus/${ativo.id}`).expect(200))
          .body as MenuCompleto;
        const primeiroSeed =
          seed.payload.categorias[0].subcategorias[0].itens[0];
        expect(primeiroSeed.precos).toEqual([32.9, 58.9]);

        const itens = (
          await api().get(`/admin/itens?menuId=${ativo.id}`).expect(200)
        ).body as {
          id: number;
          nomePT: string;
          subCategoriaId: number;
        }[];
        const primeiro = itens.find((i) => i.nomePT === primeiroSeed.nome.pt)!;
        await api()
          .patch(`/admin/itens/${primeiro.id}`)
          .send({ descricaoPT: 'Nova descrição' })
          .expect(200);
        const novo = await api()
          .post('/admin/itens')
          .send({
            subCategoriaId: primeiro.subCategoriaId,
            nomePT: 'Item sem preço',
          })
          .expect(201);

        const { payloadPreview, payload } = (
          await api().get(`/admin/menus/${ativo.id}`).expect(200)
        ).body as MenuCompleto;
        const [categoria] = payloadPreview.categorias;
        const [sub] = categoria.subcategorias;
        expect(categoria.icone).toBe('bi-basket');
        expect(sub.colunas.map((c) => c.pt)).toEqual(['Meia', 'Inteira']);
        const regenerado = sub.itens.find(
          (i) => i.id === `item-${primeiro.id}`,
        )!;
        expect(regenerado.precos).toEqual([32.9, 58.9]);
        expect(regenerado.descricao?.pt).toBe('Nova descrição');
        expect(
          sub.itens.find((i) => i.id === `item-${novo.body.id}`)?.precos,
        ).toEqual([]);
        // textos da interface, moeda e redes sociais continuam
        expect(payloadPreview.textos).toEqual(seed.payload.textos);
        expect(payloadPreview.moeda).toEqual(seed.payload.moeda);
        // o publicado continua o do seed
        expect(payload).toEqual(seed.payload);
      } finally {
        await semearBanco(dataSource);
      }
    });
  });

  describe('Estrutura do menu', () => {
    let menuId: number;
    let tagIds: number[];

    beforeAll(async () => {
      const r = await criarRestaurante('teste-estrutura');
      menuId = (
        await api()
          .post('/admin/menus')
          .send({ restauranteId: r.id, nome: 'Menu da estrutura' })
          .expect(201)
      ).body.id;
      const tags = (await api().get('/admin/tags').expect(200)).body as {
        id: number;
        descricaoPT: string;
      }[];
      tagIds = tags
        .filter((t) => ['Vegano', 'Sem glúten'].includes(t.descricaoPT))
        .map((t) => t.id);
      expect(tagIds).toHaveLength(2);
    });

    it('configuração 1:1 com o menu', async () => {
      const conf = (
        await api()
          .post('/admin/configuracoes-menu')
          .send({ menuId, habilitaEN: true })
          .expect(201)
      ).body;
      expect(conf).toMatchObject({
        habilitaPT: true,
        habilitaEN: true,
        habilitaDE: false,
      });
      await api()
        .post('/admin/configuracoes-menu')
        .send({ menuId })
        .expect(409);
      const alterada = (
        await api()
          .patch(`/admin/configuracoes-menu/${conf.id}`)
          .send({
            habilitaPesquisaCliente: true,
            habilitaPesquisaClienteEmail: true,
          })
          .expect(200)
      ).body;
      expect(alterada).toMatchObject({
        habilitaEN: true,
        habilitaPesquisaClienteEmail: true,
      });
      const porMenu = (
        await api()
          .get(`/admin/configuracoes-menu?menuId=${menuId}`)
          .expect(200)
      ).body;
      expect(porMenu.map((c: { id: number }) => c.id)).toEqual([conf.id]);
    });

    it('categoria > subcategoria > item > mídia, com ordem automática e tags', async () => {
      const c1 = (
        await api()
          .post('/admin/categorias')
          .send({
            menuId,
            descricaoPT: 'Entradas',
            descricaoEN: 'Starters',
            descricaoFR: '',
          })
          .expect(201)
      ).body;
      const c2 = (
        await api()
          .post('/admin/categorias')
          .send({ menuId, descricaoPT: 'Pratos' })
          .expect(201)
      ).body;
      expect([c1.ordem, c2.ordem]).toEqual([1, 2]);
      expect(c1.descricaoFR).toBeNull(); // texto vazio vira null

      const sub = (
        await api()
          .post('/admin/subcategorias')
          .send({ categoriaId: c1.id, descricaoPT: 'Frios' })
          .expect(201)
      ).body;

      const item = (
        await api()
          .post('/admin/itens')
          .send({ subCategoriaId: sub.id, nomePT: 'Queijo', tagIds })
          .expect(201)
      ).body;
      expect(item).toMatchObject({
        ordem: 1,
        visivel: true,
        descricaoPT: null,
      });
      const crescente = (a: number, b: number) => a - b;
      expect(
        item.tags.map((t: { id: number }) => t.id).sort(crescente),
      ).toEqual([...tagIds].sort(crescente));

      const semTags = (
        await api()
          .patch(`/admin/itens/${item.id}`)
          .send({ tagIds: [tagIds[0]], visivel: false })
          .expect(200)
      ).body;
      expect(semTags.tags.map((t: { id: number }) => t.id)).toEqual([
        tagIds[0],
      ]);
      expect(semTags.visivel).toBe(false);
      // sem tagIds no PATCH, as tags não mudam
      const mesmoTags = (
        await api()
          .patch(`/admin/itens/${item.id}`)
          .send({ nomeEN: 'Cheese' })
          .expect(200)
      ).body;
      expect(mesmoTags.tags).toHaveLength(1);

      await api()
        .post('/admin/itens')
        .send({ subCategoriaId: sub.id, nomePT: 'X', tagIds: [999999] })
        .expect(400);

      const media = (
        await api()
          .post('/admin/item-medias')
          .send({
            itemId: item.id,
            tipo: 'I',
            url: 'http://localhost:3000/imagens/x.jpg',
          })
          .expect(201)
      ).body;
      expect(media.ordem).toBe(1);
      await api()
        .post('/admin/item-medias')
        .send({ itemId: item.id, tipo: 'X', url: 'http://a/b.jpg' })
        .expect(400);
      await api()
        .post('/admin/item-medias')
        .send({ itemId: item.id, tipo: 'V', url: 'não é url' })
        .expect(400);

      // filtros das listagens
      const subsDoMenu = (
        await api().get(`/admin/subcategorias?menuId=${menuId}`).expect(200)
      ).body;
      expect(subsDoMenu.map((s: { id: number }) => s.id)).toEqual([sub.id]);
      const itensDoMenu = (
        await api().get(`/admin/itens?menuId=${menuId}`).expect(200)
      ).body;
      expect(itensDoMenu.map((i: { id: number }) => i.id)).toEqual([item.id]);
      const itensDaCategoria = (
        await api().get(`/admin/itens?categoriaId=${c2.id}`).expect(200)
      ).body;
      expect(itensDaCategoria).toEqual([]);

      // excluir a categoria apaga subcategorias, itens e mídias
      await api().delete(`/admin/categorias/${c1.id}`).expect(204);
      await api().get(`/admin/subcategorias/${sub.id}`).expect(404);
      await api().get(`/admin/itens/${item.id}`).expect(404);
      await api().get(`/admin/item-medias/${media.id}`).expect(404);
    });

    it('404 quando o pai não existe', async () => {
      await api()
        .post('/admin/categorias')
        .send({ menuId: 999999, descricaoPT: 'X' })
        .expect(404);
      await api()
        .post('/admin/subcategorias')
        .send({ categoriaId: 999999, descricaoPT: 'X' })
        .expect(404);
      await api()
        .post('/admin/itens')
        .send({ subCategoriaId: 999999, nomePT: 'X' })
        .expect(404);
    });
  });

  describe('Clientes aleatórios (db:seed-clientes)', () => {
    it('completa cada restaurante até a quantidade, sem duplicar, e a API aceita os dados', async () => {
      const r1 = await criarRestaurante('teste-aleatorio-1');
      const r2 = await criarRestaurante('teste-aleatorio-2');
      const ids = [r1.id, r2.id];
      // r1 já tem 2 clientes; r2 nenhum
      await api()
        .post('/admin/clientes')
        .send({
          restauranteId: r1.id,
          nome: 'Já existia 1',
          email: 'existia1@exemplo.com',
        })
        .expect(201);
      await api()
        .post('/admin/clientes')
        .send({ restauranteId: r1.id, nome: 'Já existia 2' })
        .expect(201);

      const primeira = await semearClientes(dataSource, {
        quantidade: 6,
        restauranteIds: ids,
      });
      expect(primeira.map((r) => [r.existentes, r.criados])).toEqual([
        [2, 4],
        [0, 6],
      ]);
      const segunda = await semearClientes(dataSource, {
        quantidade: 6,
        restauranteIds: ids,
      });
      expect(segunda.map((r) => r.criados)).toEqual([0, 0]); // idempotente

      for (const restauranteId of ids) {
        const lista = (
          await api()
            .get(`/admin/clientes?restauranteId=${restauranteId}`)
            .expect(200)
        ).body as {
          nome: string;
          email: string | null;
          dataNascimento: string | null;
        }[];
        expect(lista).toHaveLength(6);
        const emails = lista.flatMap((c) => (c.email ? [c.email] : []));
        expect(new Set(emails).size).toBe(emails.length);
      }
      // os clientes do restaurante que já tinha dados continuam lá
      const doR1 = (
        await api().get(`/admin/clientes?restauranteId=${r1.id}`).expect(200)
      ).body as {
        nome: string;
      }[];
      expect(doR1.map((c) => c.nome)).toEqual(
        expect.arrayContaining(['Já existia 1', 'Já existia 2']),
      );

      // os dados gerados passam na validação da própria API (mesmo formato de uma criação)
      const [exemplo] = gerarClientes(1);
      await api()
        .post('/admin/clientes')
        .send({ restauranteId: r2.id, ...exemplo })
        .expect(201);
    });
  });

  describe('Clientes', () => {
    it('CRUD, validações e busca', async () => {
      const r = await criarRestaurante('teste-clientes');
      const cliente = (
        await api()
          .post('/admin/clientes')
          .send({
            restauranteId: r.id,
            nome: 'Maria Silva',
            dataNascimento: '1990-05-23',
            email: 'maria@exemplo.com',
            phone: '+55 11 99999-9999',
          })
          .expect(201)
      ).body;
      expect(cliente.dataNascimento).toBe('1990-05-23');

      await api()
        .post('/admin/clientes')
        .send({ restauranteId: r.id, nome: 'X', email: 'invalido' })
        .expect(400);
      await api()
        .post('/admin/clientes')
        .send({ restauranteId: r.id, nome: 'X', dataNascimento: '1990-02-30' })
        .expect(400);

      const busca = (
        await api()
          .get(`/admin/clientes?restauranteId=${r.id}&busca=exemplo.com`)
          .expect(200)
      ).body;
      expect(busca.map((c: { id: number }) => c.id)).toEqual([cliente.id]);
      const nada = (
        await api()
          .get(`/admin/clientes?restauranteId=${r.id}&busca=%25`)
          .expect(200)
      ).body;
      expect(nada).toEqual([]); // "%" é literal, não curinga

      const alterado = (
        await api()
          .patch(`/admin/clientes/${cliente.id}`)
          .send({ email: null, dataNascimento: null })
          .expect(200)
      ).body;
      expect(alterado).toMatchObject({ email: null, dataNascimento: null });

      await api().delete(`/admin/restaurantes/${r.id}`).expect(409);
      await api().delete(`/admin/clientes/${cliente.id}`).expect(204);
    });
  });

  describe('Tags', () => {
    it('seed tem as 8 tags obrigatórias', async () => {
      const tags = (await api().get('/admin/tags').expect(200)).body as {
        descricaoPT: string;
        visibleLista: boolean;
      }[];
      expect(tags.map((t) => t.descricaoPT)).toEqual(
        expect.arrayContaining([
          'Sem glúten',
          'Sem conservantes',
          'Sem leite',
          'Vegano',
          'Aprovado pelo chef',
          'Sem amendoim',
          'Sem ovo',
          'Sem alimentos do mar',
        ]),
      );
    });

    it('CRUD; excluir a tag a remove dos itens', async () => {
      const tag = (
        await api()
          .post('/admin/tags')
          .send({ descricaoPT: 'Teste tag', visibleLista: false })
          .expect(201)
      ).body;
      expect(tag).toMatchObject({
        descricaoPT: 'Teste tag',
        visibleLista: false,
        descricaoEN: null,
      });
      await api()
        .post('/admin/tags')
        .send({ descricaoEN: 'Sem PT' })
        .expect(400);

      const itens = (await api().get('/admin/itens').expect(200)).body as {
        id: number;
      }[];
      const itemId = itens[0].id;
      const antes = (await api().get(`/admin/itens/${itemId}`).expect(200))
        .body;
      await api()
        .patch(`/admin/itens/${itemId}`)
        .send({
          tagIds: [...antes.tags.map((t: { id: number }) => t.id), tag.id],
        })
        .expect(200);

      await api().delete(`/admin/tags/${tag.id}`).expect(204);
      const depois = (await api().get(`/admin/itens/${itemId}`).expect(200))
        .body;
      expect(depois.tags.map((t: { id: number }) => t.id)).toEqual(
        antes.tags.map((t: { id: number }) => t.id),
      );
    });
  });

  it('resumo para o dashboard', async () => {
    const resumo = (await api().get('/admin/resumo').expect(200)).body;
    expect(resumo.itens).toBeGreaterThan(0);
    const casa = resumo.porRestaurante.find(
      (r: { slug: string }) => r.slug === 'casa-lusitana',
    );
    expect(casa).toMatchObject({ menus: 2, nome: 'Casa Lusitana' });
    expect(casa.menuAtivoId).toEqual(expect.any(Number));
    expect(casa).not.toHaveProperty('menuPreviewId');

    // só de um restaurante (o seed cria o menu ativo e um inativo)
    const doCasa = (
      await api().get(`/admin/resumo?restauranteId=${casa.id}`).expect(200)
    ).body;
    expect(doCasa).toMatchObject({
      restaurantes: 1,
      menus: 2,
      tags: resumo.tags,
    });
    expect(doCasa.porRestaurante.map((r: { id: number }) => r.id)).toEqual([
      casa.id,
    ]);
    expect(doCasa.categorias).toBe(8); // 4 + 4
    expect(doCasa.itens).toBe(32); // 21 no ativo + 11 no inativo
    expect(doCasa.itens).toBeLessThan(resumo.itens);
    await api().get('/admin/resumo?restauranteId=abc').expect(400);
  });

  it('CORS libera os métodos do admin', async () => {
    const res = await api()
      .options('/admin/restaurantes/1')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'PATCH')
      .expect(204);
    expect(res.headers['access-control-allow-methods']).toContain('PATCH');
  });
});

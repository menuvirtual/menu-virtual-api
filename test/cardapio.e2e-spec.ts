import type { NestExpressApplication } from '@nestjs/platform-express';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { In, type DataSource } from 'typeorm';
import type { MenuPayload } from './../src/cardapio/cardapio.types.js';
import { semearBanco } from './../src/database/seed.js';
import { Menu } from './../src/menus/menu.entity.js';
import { Restaurante } from './../src/restaurantes/restaurante.entity.js';
import { criarAppTeste } from './app-teste.js';

describe('GET /menu - cardápio público (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await criarAppTeste());
  });

  afterAll(async () => {
    await app.close();
  });

  it('o seed grava 2 menus por restaurante: o ativo e um inativo (outros textos)', async () => {
    const menus = await dataSource.getRepository(Menu).find({
      where: { restaurante: { slug: In(['casa-lusitana', 'chapa-quente']) } },
      relations: { restaurante: true },
      order: { restauranteId: 'ASC', isAtivo: 'DESC' },
    });
    expect(
      menus.map((m) => [
        m.restaurante!.slug,
        m.nome,
        m.isAtivo,
        m.payload.restaurante.slogan?.pt,
      ]),
    ).toEqual([
      ['casa-lusitana', 'Menu principal', true, 'Cozinha portuguesa & vinhos'],
      [
        'casa-lusitana',
        'Menu inverno',
        false,
        'Menu de inverno: pratos de tacho e vinhos do Porto',
      ],
      [
        'chapa-quente',
        'Menu principal',
        true,
        'Smash burgers, batatas & shakes',
      ],
      [
        'chapa-quente',
        'Menu brunch',
        false,
        'Brunch de domingo: panquecas, ovos & café',
      ],
    ]);
    // a versão de preview começa igual à publicada
    for (const m of menus) expect(m.payloadPreview).toEqual(m.payload);
  });

  it.each(['casa-lusitana', 'chapa-quente'])(
    'retorna exatamente o payload gravado de %s (publicado e preview)',
    async (restaurante) => {
      const gravado = JSON.parse(
        await readFile(`data/payloads/${restaurante}.json`, 'utf8'),
      ) as MenuPayload;
      const res = await request(app.getHttpServer())
        .get(`/menu?restaurante=${restaurante}`)
        .expect(200);
      expect(res.body).toEqual(gravado);
      expect(res.headers['access-control-allow-origin']).toBe('*');

      const preview = await request(app.getHttpServer())
        .get(`/menu?restaurante=${restaurante}&preview=true`)
        .expect(200);
      expect(preview.body).toEqual(gravado);
    },
  );

  it('preview=true devolve a versão de pré-visualização (PayloadPreview) do menu ativo', async () => {
    const menus = dataSource.getRepository(Menu);
    const ativo = await menus.findOneOrFail({
      where: { restaurante: { slug: 'casa-lusitana' }, isAtivo: true },
    });
    ativo.payloadPreview.restaurante.nome.pt = 'Casa Lusitana (rascunho)';
    await menus.save(ativo);

    try {
      const doPreview = (
        await request(app.getHttpServer())
          .get('/menu?restaurante=casa-lusitana&preview=true')
          .expect(200)
      ).body as MenuPayload;
      const publicado = (
        await request(app.getHttpServer())
          .get('/menu?restaurante=casa-lusitana&preview=false')
          .expect(200)
      ).body as MenuPayload;
      expect(doPreview.restaurante.nome.pt).toBe('Casa Lusitana (rascunho)');
      expect(publicado.restaurante.nome.pt).toBe('Casa Lusitana');
    } finally {
      await semearBanco(dataSource);
    }
  });

  it('404 quando o restaurante não tem menu ativo', async () => {
    const restaurante = await dataSource
      .getRepository(Restaurante)
      .findOneByOrFail({ slug: 'casa-lusitana' });
    await dataSource
      .getRepository(Menu)
      .update({ restauranteId: restaurante.id }, { isAtivo: false });
    try {
      const res = await request(app.getHttpServer())
        .get('/menu?restaurante=casa-lusitana')
        .expect(404);
      expect(res.body.message).toContain('sem menu ativo');
      // o preview também é do menu ativo
      await request(app.getHttpServer())
        .get('/menu?restaurante=casa-lusitana&preview=true')
        .expect(404);
    } finally {
      await semearBanco(dataSource);
    }
  });

  it('400 para preview inválido', async () => {
    await request(app.getHttpServer())
      .get('/menu?restaurante=casa-lusitana&preview=talvez')
      .expect(400);
  });

  it('cada restaurante tem o seu conteúdo', async () => {
    const casa = (
      await request(app.getHttpServer()).get('/menu?restaurante=casa-lusitana')
    ).body as MenuPayload;
    const burger = (
      await request(app.getHttpServer()).get('/menu?restaurante=chapa-quente')
    ).body as MenuPayload;
    expect(casa.restaurante.nome.pt).toBe('Casa Lusitana');
    expect(burger.restaurante.nome.pt).toBe('Chapa Quente');
    expect(casa.categorias.map((c) => c.id)).toEqual([
      'entradas',
      'pratos',
      'bebidas',
      'sobremesas',
    ]);
    expect(burger.categorias.map((c) => c.id)).toEqual([
      'burgers',
      'acompanhamentos',
      'bebidas',
      'sobremesas',
    ]);
    expect(burger.textos['cadastro.titulo'].pt).not.toBe(
      casa.textos['cadastro.titulo'].pt,
    );
  });

  it('as fotos de exemplo do payload são servidas', async () => {
    const menu = (
      await request(app.getHttpServer()).get('/menu?restaurante=casa-lusitana')
    ).body as MenuPayload;
    const url = new URL(menu.categorias[0].subcategorias[0].itens[0].fotos[0]);
    const img = await request(app.getHttpServer())
      .get(url.pathname)
      .expect(200);
    expect(img.headers['content-type']).toBe('image/jpeg');
  });

  it('aceita o nome com maiúsculas/espaços em volta', async () => {
    await request(app.getHttpServer())
      .get('/menu?restaurante=%20Casa-Lusitana%20')
      .expect(200);
  });

  it('404 para restaurante inexistente', async () => {
    const res = await request(app.getHttpServer())
      .get('/menu?restaurante=nao-existe')
      .expect(404);
    expect(res.body.message).toContain('nao-existe');
  });

  it.each(['', '../x', 'casa_lusitana', 'a/b'])(
    '400 para restaurante inválido: "%s"',
    async (v) => {
      await request(app.getHttpServer())
        .get(`/menu?restaurante=${v}`)
        .expect(400);
    },
  );

  it('400 sem o parâmetro', async () => {
    await request(app.getHttpServer()).get('/menu').expect(400);
  });

  it('não expõe os payloads pela rota de imagens', async () => {
    await request(app.getHttpServer())
      .get('/imagens/../payloads/casa-lusitana.json')
      .expect(404);
    await request(app.getHttpServer())
      .get('/imagens/..%2Fpayloads%2Fcasa-lusitana.json')
      .expect(404);
  });

  it('Swagger: interface em /docs e rotas documentadas em /docs-json', async () => {
    await request(app.getHttpServer())
      .get('/docs')
      .expect(200)
      .expect('Content-Type', /html/);
    const spec = (
      await request(app.getHttpServer()).get('/docs-json').expect(200)
    ).body;
    const op = spec.paths['/menu'].get;
    expect(op.parameters[0]).toMatchObject({
      name: 'restaurante',
      in: 'query',
      required: true,
    });
    expect(Object.keys(op.responses).sort()).toEqual(['200', '400', '404']);
    expect(Object.keys(spec.components.schemas)).toEqual(
      expect.arrayContaining([
        'MenuPayload',
        'PayloadCategoria',
        'PayloadSubcategoria',
        'PayloadItem',
        'PayloadIdioma',
        'PayloadMoeda',
      ]),
    );
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        '/admin/restaurantes',
        '/admin/restaurantes/{id}',
        '/admin/menus',
        '/admin/configuracoes-menu',
        '/admin/categorias',
        '/admin/subcategorias',
        '/admin/itens',
        '/admin/item-medias',
        '/admin/clientes',
        '/admin/tags',
        '/admin/resumo',
      ]),
    );
  });
});

import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { configuracao } from './../src/configuracao.js';
import { Restaurante } from './../src/restaurantes/restaurante.entity.js';
import {
  comToken,
  criarAppTeste,
  entrar,
  // resolverCaptcha,
} from './app-teste.js';

interface Perfil {
  usuario: string;
  superUsuario: boolean;
  restaurantes: { id: number; slug: string }[];
}

describe('Login e acesso por usuário (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  const tokens: Record<string, string> = {};
  const ids: Record<string, number> = {};
  const publico = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, dataSource } = await criarAppTeste());
    for (const usuario of ['USER1', 'USER2', 'SUPERUSER'])
      tokens[usuario] = await entrar(app, usuario);
    for (const r of await dataSource.getRepository(Restaurante).find())
      ids[r.slug] = r.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('devolve a sessão sem captcha (access token, refresh token, validade e usuário)', async () => {
      const res = await publico()
        .post('/auth/login')
        .send({
          usuario: 'USER1',
          senha: 'Menu@12345',
          // captcha: await resolverCaptcha(app),
        })
        .expect(200);
      expect(res.body.sessao).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiraEm: expect.any(Number),
        usuario: 'USER1',
      });
      expect(res.body.sessao.expiraEm).toBeGreaterThan(Date.now() / 1000);
    });

    //     it('exige o captcha; captcha inválido ou reutilizado dá 400', async () => {
    //       const semCaptcha = await publico()
    //         .post('/auth/login')
    //         .send({ usuario: 'USER1', senha: 'Menu@12345' })
    //         .expect(400);
    //       expect(JSON.stringify(semCaptcha.body.message)).toContain(
    //         'não é um robô',
    //       );
    //       await publico()
    //         .post('/auth/login')
    //         .send({ usuario: 'USER1', senha: 'Menu@12345', captcha: 'bGl4bw==' })
    //         .expect(400);
    //
    //       const captcha = await resolverCaptcha(app);
    //       await publico()
    //         .post('/auth/login')
    //         .send({ usuario: 'USER1', senha: 'Menu@12345', captcha })
    //         .expect(200);
    //       const repetido = await publico()
    //         .post('/auth/login')
    //         .send({ usuario: 'USER1', senha: 'Menu@12345', captcha })
    //         .expect(400);
    //       expect(repetido.body.message).toContain(
    //         'Verificação de segurança inválida',
    //       );
    //     });
    //
    //
    it('continua exigindo usuário e senha quando o captcha está desativado', async () => {
      for (const dados of [{ usuario: 'USER1' }, { senha: 'Menu@12345' }, {}])
        await publico().post('/auth/login').send(dados).expect(400);
      await publico().post('/auth/esqueci-senha').send({}).expect(400);
    });

    it('senha errada e usuário inexistente dão a mesma resposta (401)', async () => {
      for (const [usuario, senha] of [
        ['USER1', 'Errada@123'],
        ['NAO-EXISTE', 'Errada@123'],
      ]) {
        const res = await publico()
          .post('/auth/login')
          .send({ usuario, senha })
          .expect(401);
        expect(res.body.message).toBe('Usuário ou senha inválidos.');
      }
    });

    it('renova o access token com o refresh token', async () => {
      const login = await publico()
        .post('/auth/login')
        .send({
          usuario: 'USER2',
          senha: 'Menu@12345',
          // captcha: await resolverCaptcha(app),
        })
        .expect(200);
      const renovado = await publico()
        .post('/auth/renovar')
        .send({
          usuario: 'USER2',
          refreshToken: login.body.sessao.refreshToken,
        })
        .expect(200);
      await comToken(app, renovado.body.accessToken)
        .get('/admin/eu')
        .expect(200);
      await publico()
        .post('/auth/renovar')
        .send({ usuario: 'USER2', refreshToken: 'invalido' })
        .expect(401);
    });

    it('primeiro acesso: exige trocar a senha temporária (política de senha forte)', async () => {
      const cognito = new CognitoIdentityProviderClient({
        endpoint: configuracao.cognito.endpoint,
        region: configuracao.cognito.regiao,
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      });
      const usuario = `NOVO${Date.now()}`;
      const UserPoolId = configuracao.cognito.userPoolId;
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId,
          Username: usuario,
          TemporaryPassword: 'Temp@12345',
          MessageAction: 'SUPPRESS',
        }),
      );
      try {
        const login = await publico()
          .post('/auth/login')
          .send({
            usuario,
            senha: 'Temp@12345',
            // captcha: await resolverCaptcha(app),
          })
          .expect(200);
        expect(login.body.sessao).toBeUndefined();
        const { desafio } = login.body as { desafio: string };
        expect(desafio).toEqual(expect.any(String));

        await publico()
          .post('/auth/nova-senha')
          .send({ usuario, desafio, novaSenha: 'fraca' })
          .expect(400);
        const sessao = await publico()
          .post('/auth/nova-senha')
          .send({ usuario, desafio, novaSenha: 'Nova@12345' })
          .expect(200);
        const perfil = (
          await comToken(app, sessao.body.accessToken)
            .get('/admin/eu')
            .expect(200)
        ).body as Perfil;
        // usuário sem vínculos: logado, mas sem restaurantes
        expect(perfil).toEqual({
          usuario,
          superUsuario: false,
          restaurantes: [],
        });
      } finally {
        await cognito.send(
          new AdminDeleteUserCommand({ UserPoolId, Username: usuario }),
        );
      }
    });

    it('esqueci a senha: não revela se o usuário existe; código errado dá 400', async () => {
      for (const usuario of ['USER2', 'NAO-EXISTE'])
        await publico()
          .post('/auth/esqueci-senha')
          .send({ usuario })
          .expect(204);
      await publico()
        .post('/auth/esqueci-senha')
        .send({ usuario: 'USER2' })
        .expect(204);
      const res = await publico()
        .post('/auth/redefinir-senha')
        .send({ usuario: 'USER2', codigo: '000000', novaSenha: 'Nova@12345' })
        .expect(400);
      expect(res.body.message).toContain('Código');
    });
  });

  describe('Bearer token', () => {
    it('rotas do admin exigem token válido; o cardápio público continua aberto', async () => {
      await publico().get('/admin/restaurantes').expect(401);
      await comToken(app, 'abc.def.ghi').get('/admin/restaurantes').expect(401);
      const adulterado = tokens.USER1.slice(0, -4) + 'AAAA';
      await comToken(app, adulterado).get('/admin/restaurantes').expect(401);
      await publico().get('/menu?restaurante=casa-italiana').expect(200);
      await publico().get('/auth/captcha').expect(404);
    });
  });

  describe('GET /admin/eu', () => {
    it.each([
      ['USER1', false, ['casa-lusitana', 'chapa-quente']],
      ['USER2', false, ['casa-italiana']],
    ])(
      '%s administra só os seus restaurantes',
      async (usuario, superUsuario, slugs) => {
        const perfil = (
          await comToken(app, tokens[usuario]).get('/admin/eu').expect(200)
        ).body as Perfil;
        expect(perfil.usuario).toBe(usuario);
        expect(perfil.superUsuario).toBe(superUsuario);
        expect(perfil.restaurantes.map((r) => r.slug)).toEqual(slugs);
      },
    );

    it('SUPERUSER acessa todos os restaurantes', async () => {
      const perfil = (
        await comToken(app, tokens.SUPERUSER).get('/admin/eu').expect(200)
      ).body as Perfil;
      expect(perfil.superUsuario).toBe(true);
      expect(perfil.restaurantes.map((r) => r.slug)).toEqual(
        expect.arrayContaining([
          'casa-italiana',
          'casa-lusitana',
          'chapa-quente',
        ]),
      );
    });
  });

  describe('Escopo por restaurante', () => {
    it('listagens sem filtro trazem só os restaurantes do usuário', async () => {
      const user2 = comToken(app, tokens.USER2);
      const restaurantes = (await user2.get('/admin/restaurantes').expect(200))
        .body as {
        slug: string;
      }[];
      expect(restaurantes.map((r) => r.slug)).toEqual(['casa-italiana']);
      const menus = (await user2.get('/admin/menus').expect(200)).body as {
        restauranteId: number;
      }[];
      expect(new Set(menus.map((m) => m.restauranteId))).toEqual(
        new Set([ids['casa-italiana']]),
      );
      const resumo = (await user2.get('/admin/resumo').expect(200)).body;
      expect(resumo.restaurantes).toBe(1);
      expect(resumo.itens).toBe(33); // 23 no menu ativo + 10 no inativo

      const itensUser1 = (
        await comToken(app, tokens.USER1).get('/admin/itens').expect(200)
      ).body as unknown[];
      expect(itensUser1).toHaveLength(58); // casa-lusitana (21 + 11) + chapa-quente (17 + 9)
    });

    it('registros de outro restaurante dão 403 (ler, filtrar, criar, alterar, excluir)', async () => {
      const user2 = comToken(app, tokens.USER2);
      const casaLusitana = ids['casa-lusitana'];
      const menuLusitana = (
        (
          await comToken(app, tokens.USER1).get(
            `/admin/menus?restauranteId=${casaLusitana}`,
          )
        ).body as { id: number }[]
      )[0].id;
      const [categoria] = (
        await comToken(app, tokens.USER1).get(
          `/admin/categorias?menuId=${menuLusitana}`,
        )
      ).body as { id: number }[];
      const [item] = (
        await comToken(app, tokens.USER1).get(
          `/admin/itens?menuId=${menuLusitana}`,
        )
      ).body as { id: number }[];

      await user2.get(`/admin/restaurantes/${casaLusitana}`).expect(403);
      await user2.get(`/admin/menus?restauranteId=${casaLusitana}`).expect(403);
      await user2.get(`/admin/menus/${menuLusitana}`).expect(403);
      await user2.get(`/admin/categorias?menuId=${menuLusitana}`).expect(403);
      await user2.get(`/admin/itens/${item.id}`).expect(403);
      await user2
        .get(`/admin/resumo?restauranteId=${casaLusitana}`)
        .expect(403);
      await user2
        .post('/admin/categorias')
        .send({ menuId: menuLusitana, descricaoPT: 'Invasão' })
        .expect(403);
      await user2
        .patch(`/admin/categorias/${categoria.id}`)
        .send({ descricaoPT: 'X' })
        .expect(403);
      await user2.delete(`/admin/itens/${item.id}`).expect(403);
      await user2.post(`/admin/menus/${menuLusitana}/publicar`).expect(403);
      await user2
        .post('/admin/clientes')
        .send({ restauranteId: casaLusitana, nome: 'X' })
        .expect(403);
      // mover uma categoria própria para o menu de outro restaurante também é barrado
      const [minhaCategoria] = (
        await user2.get('/admin/categorias').expect(200)
      ).body as {
        id: number;
      }[];
      await user2
        .patch(`/admin/categorias/${minhaCategoria.id}`)
        .send({ menuId: menuLusitana })
        .expect(403);
      // inexistente continua 404
      await user2.get('/admin/itens/999999').expect(404);
      // o item continua lá
      await comToken(app, tokens.USER1)
        .get(`/admin/itens/${item.id}`)
        .expect(200);
    });

    it('USER1 trabalha nos dois restaurantes dele', async () => {
      const user1 = comToken(app, tokens.USER1);
      for (const slug of ['casa-lusitana', 'chapa-quente'])
        await user1.get(`/admin/resumo?restauranteId=${ids[slug]}`).expect(200);
      await user1
        .get(`/admin/resumo?restauranteId=${ids['casa-italiana']}`)
        .expect(403);
      const cliente = (
        await user1
          .post('/admin/clientes')
          .send({
            restauranteId: ids['chapa-quente'],
            nome: 'Cliente do USER1',
          })
          .expect(201)
      ).body as { id: number };
      await comToken(app, tokens.USER2)
        .get(`/admin/clientes/${cliente.id}`)
        .expect(403);
      await user1.delete(`/admin/clientes/${cliente.id}`).expect(204);
    });
  });

  describe('Preview e publicação por usuário', () => {
    it('a escrita só liga a flag do menu do próprio restaurante; publicar exige acesso', async () => {
      const user2 = comToken(app, tokens.USER2);
      const menusDe = async (slug: string) =>
        (await user2.get(`/admin/menus?restauranteId=${ids[slug]}`).expect(200))
          .body as {
          id: number;
          isAtivo: boolean;
          contemAtualizacaoParaPublicar: boolean;
        }[];
      const [ativoItaliana] = (await menusDe('casa-italiana')).filter(
        (m) => m.isAtivo,
      );
      const flagLusitana = async () =>
        (
          (
            await comToken(app, tokens.USER1)
              .get(`/admin/menus?restauranteId=${ids['casa-lusitana']}`)
              .expect(200)
          ).body as { contemAtualizacaoParaPublicar: boolean }[]
        ).some((m) => m.contemAtualizacaoParaPublicar);

      const categoria = (
        await user2
          .post('/admin/categorias')
          .send({ menuId: ativoItaliana.id, descricaoPT: 'Categoria nova' })
          .expect(201)
      ).body as { id: number };
      try {
        const depois = (await menusDe('casa-italiana')).find(
          (m) => m.id === ativoItaliana.id,
        )!;
        expect(depois.contemAtualizacaoParaPublicar).toBe(true);
        expect(await flagLusitana()).toBe(false);

        await user2
          .post(`/admin/menus/${ativoItaliana.id}/publicar`)
          .expect(200);
        const publicado = (
          await publico().get('/menu?restaurante=casa-italiana').expect(200)
        ).body;
        expect(
          publicado.categorias.map((c: { nome: { pt: string } }) => c.nome.pt),
        ).toContain('Categoria nova');
      } finally {
        await user2.delete(`/admin/categorias/${categoria.id}`).expect(204);
        await user2
          .post(`/admin/menus/${ativoItaliana.id}/publicar`)
          .expect(200);
      }
    });
  });

  describe('Ações de superusuário', () => {
    it('só SUPERUSER cria/exclui restaurantes e cria/altera/exclui tags', async () => {
      const user1 = comToken(app, tokens.USER1);
      const res = await user1
        .post('/admin/restaurantes')
        .send({ nome: 'Não pode', slug: 'teste-nao-pode' })
        .expect(403);
      expect(res.body.message).toContain('superusuários');
      await user1
        .delete(`/admin/restaurantes/${ids['casa-lusitana']}`)
        .expect(403);
      await user1.post('/admin/tags').send({ descricaoPT: 'X' }).expect(403);
      const tags = (await user1.get('/admin/tags').expect(200)).body as {
        id: number;
      }[];
      await user1
        .patch(`/admin/tags/${tags[0].id}`)
        .send({ descricaoPT: 'X' })
        .expect(403);
      await user1.delete(`/admin/tags/${tags[0].id}`).expect(403);
      // mas pode editar o próprio restaurante
      await user1
        .patch(`/admin/restaurantes/${ids['chapa-quente']}`)
        .send({ nome: 'Chapa Quente' })
        .expect(200);

      const superUser = comToken(app, tokens.SUPERUSER);
      const tag = (
        await superUser
          .post('/admin/tags')
          .send({ descricaoPT: 'Teste super' })
          .expect(201)
      ).body as { id: number };
      await superUser.delete(`/admin/tags/${tag.id}`).expect(204);
    });
  });
});

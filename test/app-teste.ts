import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { configurarApp } from './../src/configurar-app.js';
import { semearBanco } from './../src/database/seed.js';
import { SENHA_TESTE } from './../src/dev/usuarios-teste.js';

/**
 * Sobe a API como no main.ts, contra o banco "menu_test" (vitest.config.e2e.ts),
 * aplica as migrations e grava os dados iniciais.
 * Requer `npm run db:up` e `npm run cognito:setup` (cognito-local com os usuários de teste).
 */
export async function criarAppTeste(): Promise<{
  app: NestExpressApplication;
  dataSource: DataSource;
}> {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = configurarApp(
    modulo.createNestApplication<NestExpressApplication>(),
  );
  await app.init(); // aplica as migrations pendentes (DB_MIGRATIONS_RUN)
  // Servidor já escutando: o supertest não precisa abrir/fechar um por requisição
  await app.listen(0, '127.0.0.1');
  const dataSource = app.get(DataSource);
  await semearBanco(dataSource);
  return { app, dataSource };
}

/** Resolve o captcha como o widget do navegador faz (resposta em base64). */
export async function resolverCaptcha(
  app: NestExpressApplication,
): Promise<string> {
  const desafio = (
    await request(app.getHttpServer()).get('/auth/captcha').expect(200)
  ).body as Challenge;
  const solucao = await solveChallenge({ challenge: desafio, deriveKey });
  return Buffer.from(
    JSON.stringify({ challenge: desafio, solution: solucao }),
  ).toString('base64');
}

/** Faz login (com captcha) e devolve o access token. */
export async function entrar(
  app: NestExpressApplication,
  usuario: string,
  senha = SENHA_TESTE,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ usuario, senha, captcha: await resolverCaptcha(app) })
    .expect(200);
  return (res.body as { sessao: { accessToken: string } }).sessao.accessToken;
}

/** Atalhos do supertest com o Bearer token já no cabeçalho. */
export function comToken(app: NestExpressApplication, token: string) {
  const servidor = () => request(app.getHttpServer());
  const auth = { Authorization: `Bearer ${token}` };
  return {
    get: (url: string) => servidor().get(url).set(auth),
    post: (url: string) => servidor().post(url).set(auth),
    patch: (url: string) => servidor().patch(url).set(auth),
    delete: (url: string) => servidor().delete(url).set(auth),
    options: (url: string) => servidor().options(url),
  };
}

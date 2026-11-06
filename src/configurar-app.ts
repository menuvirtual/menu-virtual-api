import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { configuracao } from './configuracao.js';

/** Configuração compartilhada entre o main.ts e os testes e2e. */
export function configurarApp(
  app: NestExpressApplication,
): NestExpressApplication {
  const origens = configuracao.origensCors.trim();
  app.enableCors({
    origin: origens === '*' ? '*' : origens.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  // Swagger: interface em /docs e especificação OpenAPI em /docs-json
  const documento = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Menu API')
      .setDescription(
        'Cardápio virtual: GET /menu (público) devolve o payload do cardápio; /admin/... são os CRUDs do painel administrativo ' +
          '(exigem `Authorization: Bearer <accessToken>`, obtido em POST /auth/login).',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, documento, { jsonDocumentUrl: 'docs-json' });

  /*
   * Provisório, só para desenvolvimento: hospeda as fotos de exemplo em
   * http://localhost:3000/imagens/... (são as URLs gravadas no payload de teste).
   * Em produção as fotos ficam num storage/CDN e o payload já traz essas URLs;
   * aí este bloco e a pasta data/imagens podem ser removidos.
   */
  app.useStaticAssets(join(configuracao.diretorioDados, 'imagens'), {
    prefix: '/imagens/',
    maxAge: '7d',
    index: false,
    dotfiles: 'ignore',
  });

  return app;
}

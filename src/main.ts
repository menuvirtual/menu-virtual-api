import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configuracao } from './configuracao.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap() {
  const app = configurarApp(
    await NestFactory.create<NestExpressApplication>(AppModule),
  );
  await app.listen(configuracao.porta);
}
await bootstrap();

import { Module, type OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioRestaurante } from '../acesso/usuario-restaurante.entity.js';
import { configuracao } from '../configuracao.js';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import { AuthController, PerfilController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { CaptchaService } from './captcha.service.js';
import { CognitoService } from './cognito.service.js';
import { VerificadorToken } from './verificador-token.js';

/**
 * Login (Cognito + captcha) e proteção das rotas: o AuthGuard é global, então
 * toda rota exige Bearer token, exceto as marcadas com @Publica().
 */
@Module({
  imports: [TypeOrmModule.forFeature([UsuarioRestaurante, Restaurante])],
  controllers: [AuthController, PerfilController],
  providers: [
    CognitoService,
    CaptchaService,
    VerificadorToken,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule implements OnModuleInit {
  onModuleInit(): void {
    const { userPoolId, clientId } = configuracao.cognito;
    if (!userPoolId || !clientId)
      throw new Error(
        'Cognito não configurado: defina COGNITO_USER_POOL_ID e COGNITO_CLIENT_ID no .env ' +
          '(em desenvolvimento: `npm run dev:setup` ou `npm run cognito:setup`).',
      );
  }
}

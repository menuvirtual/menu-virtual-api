import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import type { Repository } from 'typeorm';
import { UsuarioRestaurante } from '../acesso/usuario-restaurante.entity.js';
import { configuracao } from '../configuracao.js';
import {
  ROTA_PUBLICA,
  type UsuarioAutenticado,
} from './usuario-autenticado.js';
import { VerificadorToken } from './verificador-token.js';

/**
 * Guard global: toda rota exige `Authorization: Bearer <access token do Cognito>`,
 * exceto as marcadas com @Publica(). Coloca o usuário em `request.usuario`
 * (com os restaurantes que ele administra).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verificador: VerificadorToken,
    @InjectRepository(UsuarioRestaurante)
    private readonly acessos: Repository<UsuarioRestaurante>,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(ROTA_PUBLICA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publica) return true;

    const requisicao = contexto
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const [tipo, token] = (requisicao.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token)
      throw new UnauthorizedException(
        'Faça login para acessar (Bearer token ausente).',
      );

    const claims = await this.verificador.verificar(token);
    const superUsuario = (claims['cognito:groups'] ?? []).includes(
      configuracao.cognito.grupoSuperUsuario,
    );
    const restauranteIds = superUsuario
      ? []
      : (await this.acessos.findBy({ usuario: claims.username })).map(
          (a) => a.restauranteId,
        );

    requisicao.usuario = {
      usuario: claims.username,
      sub: claims.sub,
      superUsuario,
      restauranteIds,
    };
    return true;
  }
}

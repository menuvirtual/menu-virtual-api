import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose';
import { configuracao } from '../configuracao.js';

/** Claims usados do access token do Cognito */
export interface ClaimsAcesso extends JWTPayload {
  sub: string;
  username: string;
  client_id: string;
  token_use: 'access';
  'cognito:groups'?: string[];
}

/**
 * Valida o access token emitido pelo Cognito (real ou cognito-local):
 * assinatura (chaves públicas do JWKS do user pool), emissor, validade,
 * token_use = "access" e client_id = app client do admin.
 */
@Injectable()
export class VerificadorToken {
  private readonly logger = new Logger(VerificadorToken.name);
  private readonly emissor = configuracao.cognito.emissor;
  private readonly clientId = configuracao.cognito.clientId;
  // As chaves são baixadas uma vez e mantidas em cache (renovadas se aparecer um "kid" novo)
  private readonly chaves = createRemoteJWKSet(
    new URL(`${this.emissor}/.well-known/jwks.json`),
  );

  async verificar(token: string): Promise<ClaimsAcesso> {
    let claims: JWTPayload;
    try {
      ({ payload: claims } = await jwtVerify(token, this.chaves, {
        issuer: this.emissor,
        algorithms: ['RS256'],
      }));
    } catch (erro) {
      if (erro instanceof errors.JWTExpired)
        throw new UnauthorizedException('Sessão expirada.');
      if (erro instanceof errors.JOSEError)
        throw new UnauthorizedException('Token inválido.');
      // JWKS inacessível etc.
      this.logger.error(`Falha ao validar o token: ${(erro as Error).message}`);
      throw new UnauthorizedException('Não foi possível validar o token.');
    }
    if (claims.token_use !== 'access' || claims.client_id !== this.clientId)
      throw new UnauthorizedException('Token inválido.');
    if (typeof claims.sub !== 'string' || typeof claims.username !== 'string')
      throw new UnauthorizedException('Token inválido.');
    return claims as ClaimsAcesso;
  }
}

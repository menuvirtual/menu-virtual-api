import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  type AuthenticationResultType,
} from '@aws-sdk/client-cognito-identity-provider';
import { decodeJwt } from 'jose';
import { createHmac } from 'node:crypto';
import { configuracao } from '../configuracao.js';

/** Resultado do login: sessão aberta ou desafio de troca de senha (primeiro acesso). */
export type ResultadoLogin =
  | { tipo: 'sessao'; sessao: SessaoCognito }
  | { tipo: 'nova-senha'; desafio: string };

export interface SessaoCognito {
  accessToken: string;
  /** Ausente na renovação (o refresh token continua o mesmo) */
  refreshToken?: string;
  /** Validade do access token (epoch, segundos) */
  expiraEm: number;
  usuario: string;
}

/**
 * Chamadas ao Cognito (user pool do admin) feitas pela API, que funciona como
 * "BFF" do login: o admin nunca fala direto com o Cognito e o segredo do app
 * client (se houver) fica só no servidor. Captcha temporariamente desativado.
 */
@Injectable()
export class CognitoService {
  private readonly logger = new Logger(CognitoService.name);
  private readonly config = configuracao.cognito;
  private readonly cliente = new CognitoIdentityProviderClient({
    region: this.config.regiao,
    endpoint: this.config.endpoint,
    // As operações usadas aqui não exigem credenciais AWS; o cognito-local também não.
    ...(this.config.endpoint
      ? { credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }
      : {}),
  });

  async entrar(usuario: string, senha: string): Promise<ResultadoLogin> {
    try {
      const resposta = await this.cliente.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.config.clientId,
          AuthParameters: {
            USERNAME: usuario,
            PASSWORD: senha,
            ...this.secretHash(usuario),
          },
        }),
      );
      if (resposta.ChallengeName === 'NEW_PASSWORD_REQUIRED')
        return { tipo: 'nova-senha', desafio: resposta.Session! };
      if (resposta.ChallengeName)
        throw new ServiceUnavailableException(
          `Etapa de login não suportada pelo admin: ${resposta.ChallengeName}.`,
        );
      return {
        tipo: 'sessao',
        sessao: this.sessao(resposta.AuthenticationResult!, usuario),
      };
    } catch (erro) {
      throw this.traduzir(erro, {
        NotAuthorizedException: () =>
          /attempts exceeded/i.test((erro as Error).message)
            ? new HttpException(
                'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
                HttpStatus.TOO_MANY_REQUESTS,
              )
            : new UnauthorizedException('Usuário ou senha inválidos.'),
        UserNotFoundException: () =>
          new UnauthorizedException('Usuário ou senha inválidos.'),
        // cognito-local responde assim para senha errada
        InvalidPasswordException: () =>
          new UnauthorizedException('Usuário ou senha inválidos.'),
        PasswordResetRequiredException: () =>
          new ForbiddenException(
            'É preciso redefinir a senha. Use "Esqueci minha senha".',
          ),
        UserNotConfirmedException: () =>
          new ForbiddenException(
            'Usuário não confirmado. Fale com o administrador.',
          ),
      });
    }
  }

  /** Primeiro acesso: define a senha definitiva (desafio NEW_PASSWORD_REQUIRED). */
  async definirNovaSenha(
    usuario: string,
    desafio: string,
    novaSenha: string,
  ): Promise<SessaoCognito> {
    try {
      const resposta = await this.cliente.send(
        new RespondToAuthChallengeCommand({
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          ClientId: this.config.clientId,
          Session: desafio,
          ChallengeResponses: {
            USERNAME: usuario,
            NEW_PASSWORD: novaSenha,
            ...this.secretHash(usuario),
          },
        }),
      );
      return this.sessao(resposta.AuthenticationResult!, usuario);
    } catch (erro) {
      throw this.traduzir(erro, {
        InvalidPasswordException: () => this.senhaFraca(erro),
        NotAuthorizedException: () =>
          new UnauthorizedException('A etapa de login expirou. Entre de novo.'),
        CodeMismatchException: () =>
          new UnauthorizedException('A etapa de login expirou. Entre de novo.'),
        ExpiredCodeException: () =>
          new UnauthorizedException('A etapa de login expirou. Entre de novo.'),
      });
    }
  }

  /** Novo access token a partir do refresh token. */
  async renovar(usuario: string, refreshToken: string): Promise<SessaoCognito> {
    try {
      const resposta = await this.cliente.send(
        new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: this.config.clientId,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
            ...this.secretHash(usuario),
          },
        }),
      );
      return this.sessao(resposta.AuthenticationResult!, usuario);
    } catch (erro) {
      throw this.traduzir(erro, {
        NotAuthorizedException: () =>
          new UnauthorizedException('Sessão expirada. Entre de novo.'),
        UserNotFoundException: () =>
          new UnauthorizedException('Sessão expirada. Entre de novo.'),
      });
    }
  }

  /**
   * Envia o código de redefinição para o e-mail do usuário. Não revela se o
   * usuário existe: para usuário inexistente, responde como se tivesse enviado.
   */
  async esqueciSenha(usuario: string): Promise<void> {
    try {
      await this.cliente.send(
        new ForgotPasswordCommand({
          ClientId: this.config.clientId,
          Username: usuario,
          ...this.secretHashCampo(usuario),
        }),
      );
    } catch (erro) {
      const nome = (erro as Error).name;
      if (
        [
          'UserNotFoundException',
          'InvalidParameterException',
          'NotAuthorizedException',
        ].includes(nome)
      )
        return;
      throw this.traduzir(erro, {});
    }
  }

  async redefinirSenha(
    usuario: string,
    codigo: string,
    novaSenha: string,
  ): Promise<void> {
    try {
      await this.cliente.send(
        new ConfirmForgotPasswordCommand({
          ClientId: this.config.clientId,
          Username: usuario,
          ConfirmationCode: codigo,
          Password: novaSenha,
          ...this.secretHashCampo(usuario),
        }),
      );
    } catch (erro) {
      throw this.traduzir(erro, {
        CodeMismatchException: () =>
          new BadRequestException('Código inválido.'),
        ExpiredCodeException: () =>
          new BadRequestException('Código expirado. Peça um novo código.'),
        UserNotFoundException: () =>
          new BadRequestException('Código inválido.'),
        InvalidPasswordException: () => this.senhaFraca(erro),
      });
    }
  }

  private sessao(
    resultado: AuthenticationResultType,
    usuario: string,
  ): SessaoCognito {
    const accessToken = resultado.AccessToken!;
    const claims = decodeJwt(accessToken);
    return {
      accessToken,
      ...(resultado.RefreshToken
        ? { refreshToken: resultado.RefreshToken }
        : {}),
      expiraEm:
        claims.exp ??
        Math.floor(Date.now() / 1000) + (resultado.ExpiresIn ?? 3600),
      usuario: typeof claims.username === 'string' ? claims.username : usuario,
    };
  }

  /** SECRET_HASH exigido quando o app client tem segredo. */
  private secretHash(usuario: string): { SECRET_HASH?: string } {
    const { clientSecret, clientId } = this.config;
    if (!clientSecret) return {};
    return {
      SECRET_HASH: createHmac('sha256', clientSecret)
        .update(usuario + clientId)
        .digest('base64'),
    };
  }

  private secretHashCampo(usuario: string): { SecretHash?: string } {
    const { SECRET_HASH } = this.secretHash(usuario);
    return SECRET_HASH ? { SecretHash: SECRET_HASH } : {};
  }

  private senhaFraca(erro: unknown): BadRequestException {
    this.logger.debug((erro as Error).message);
    return new BadRequestException(
      'A senha deve ter ao menos 8 caracteres, com letra maiúscula, minúscula, número e símbolo.',
    );
  }

  /** Converte o erro do Cognito em resposta HTTP; erros não previstos viram 503. */
  private traduzir(
    erro: unknown,
    mapa: Record<string, () => HttpException>,
  ): HttpException {
    if (erro instanceof HttpException) return erro;
    const nome = (erro as Error).name;
    if (mapa[nome]) return mapa[nome]();
    if (
      nome === 'LimitExceededException' ||
      nome === 'TooManyRequestsException'
    )
      return new HttpException(
        'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    this.logger.error(`Erro do Cognito (${nome}): ${(erro as Error).message}`);
    return new ServiceUnavailableException(
      'Serviço de login indisponível. Tente de novo em instantes.',
    );
  }
}

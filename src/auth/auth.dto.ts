import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { Aparar } from '../comum/idiomas.dto.js';

/** Senha aceita pelo Cognito (política do user pool) */
const SENHA_FORTE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,256}$/;
const MENSAGEM_SENHA =
  'A senha deve ter ao menos 8 caracteres, com letra maiúscula, minúscula, número e símbolo.';

class ComUsuarioDto {
  /** Usuário (username do Cognito) @example "USER1" */
  @Aparar()
  @IsNotEmpty({ message: 'Informe o usuário.' })
  @IsString()
  @MaxLength(128)
  usuario: string;
}

class ComCaptchaDto extends ComUsuarioDto {
  /** Resposta do widget de captcha (ALTCHA), obtida a partir de GET /auth/captcha */
  @IsNotEmpty({ message: 'Confirme que você não é um robô.' })
  @IsString()
  @MaxLength(4096)
  captcha: string;
}

export class LoginDto extends ComCaptchaDto {
  @IsNotEmpty({ message: 'Informe a senha.' })
  @IsString()
  @MaxLength(256)
  senha: string;
}

export class NovaSenhaDto extends ComUsuarioDto {
  /** Valor de "desafio" devolvido pelo POST /auth/login */
  @IsNotEmpty()
  @IsString()
  @MaxLength(4096)
  desafio: string;

  @IsString()
  @Matches(SENHA_FORTE, { message: MENSAGEM_SENHA })
  novaSenha: string;
}

export class RenovarDto extends ComUsuarioDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(8192)
  refreshToken: string;
}

export class EsqueciSenhaDto extends ComCaptchaDto {}

export class RedefinirSenhaDto extends ComUsuarioDto {
  /** Código enviado por e-mail @example "123456" */
  @Aparar()
  @IsNotEmpty({ message: 'Informe o código recebido por e-mail.' })
  @IsString()
  @MaxLength(16)
  codigo: string;

  @IsString()
  @Matches(SENHA_FORTE, { message: MENSAGEM_SENHA })
  novaSenha: string;
}

/** Sessão aberta: envie o accessToken como `Authorization: Bearer <accessToken>` */
export class SessaoDto {
  accessToken: string;
  /** Use em POST /auth/renovar quando o access token expirar (não vem na renovação) */
  refreshToken?: string;
  /** Validade do access token (epoch, em segundos) */
  expiraEm: number;
  usuario: string;
}

/** Resposta do login: `sessao` OU `desafio` (primeiro acesso: trocar a senha em POST /auth/nova-senha) */
export class RespostaLoginDto {
  sessao?: SessaoDto;
  desafio?: string;
}

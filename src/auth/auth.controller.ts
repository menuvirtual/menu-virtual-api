import {
  Body,
  Controller,
  Get,
  // Header,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import {
  EsqueciSenhaDto,
  LoginDto,
  NovaSenhaDto,
  RedefinirSenhaDto,
  RenovarDto,
  RespostaLoginDto,
  SessaoDto,
} from './auth.dto.js';
// import { CaptchaService } from './captcha.service.js';
import { CognitoService } from './cognito.service.js';
import {
  Publica,
  UsuarioAtual,
  type UsuarioAutenticado,
} from './usuario-autenticado.js';

@ApiTags('Login')
@Publica()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly cognito: CognitoService,
    // private readonly captcha: CaptchaService,
  ) {}

  //   /** Novo desafio do captcha (ALTCHA), para o widget da tela de login */
  //   @Get('captcha')
  //   // cada desafio vale uma vez: o navegador nunca pode reaproveitar do cache
  //   @Header('Cache-Control', 'no-store')
  //   captchaDesafio() {
  //     return this.captcha.criarDesafio();
  //   }
  //
  //
  /**
   * Login com usuário e senha (captcha temporariamente desativado). Devolve a sessão (tokens) ou, no primeiro
   * acesso, um `desafio` para definir a senha em POST /auth/nova-senha.
   * 401 usuário/senha inválidos.
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto): Promise<RespostaLoginDto> {
    // Captcha temporariamente desativado.
    // await this.captcha.exigirValido(dto.captcha);
    const resultado = await this.cognito.entrar(dto.usuario, dto.senha);
    return resultado.tipo === 'sessao'
      ? { sessao: resultado.sessao }
      : { desafio: resultado.desafio };
  }

  /** Primeiro acesso: define a senha definitiva e abre a sessão */
  @Post('nova-senha')
  @HttpCode(200)
  novaSenha(@Body() dto: NovaSenhaDto): Promise<SessaoDto> {
    return this.cognito.definirNovaSenha(
      dto.usuario,
      dto.desafio,
      dto.novaSenha,
    );
  }

  /** Novo access token a partir do refresh token */
  @Post('renovar')
  @HttpCode(200)
  renovar(@Body() dto: RenovarDto): Promise<SessaoDto> {
    return this.cognito.renovar(dto.usuario, dto.refreshToken);
  }

  /** Envia um código de redefinição para o e-mail do usuário (sempre 204, exista ou não) */
  @Post('esqueci-senha')
  @HttpCode(204)
  async esqueciSenha(@Body() dto: EsqueciSenhaDto): Promise<void> {
    // Captcha temporariamente desativado.
    // await this.captcha.exigirValido(dto.captcha);
    await this.cognito.esqueciSenha(dto.usuario);
  }

  /** Define a nova senha com o código recebido por e-mail */
  @Post('redefinir-senha')
  @HttpCode(204)
  redefinirSenha(@Body() dto: RedefinirSenhaDto): Promise<void> {
    return this.cognito.redefinirSenha(dto.usuario, dto.codigo, dto.novaSenha);
  }
}

/** Perfil do usuário logado */
export class PerfilDto {
  usuario: string;
  /** Acessa todos os restaurantes (e pode criar/excluir restaurantes e editar tags) */
  superUsuario: boolean;
  /** Restaurantes que pode administrar (ordem alfabética) */
  restaurantes: Restaurante[];
}

@ApiTags('Login')
@ApiBearerAuth()
@Controller('admin/eu')
export class PerfilController {
  constructor(
    @InjectRepository(Restaurante)
    private readonly restaurantes: Repository<Restaurante>,
  ) {}

  /** Quem está logado e quais restaurantes pode administrar */
  @Get()
  @ApiOkResponse({ type: PerfilDto })
  async obter(@UsuarioAtual() usuario: UsuarioAutenticado): Promise<PerfilDto> {
    const restaurantes =
      usuario.superUsuario || usuario.restauranteIds.length
        ? await this.restaurantes.find({
            where: usuario.superUsuario
              ? {}
              : { id: In(usuario.restauranteIds) },
            order: { nome: 'ASC', id: 'ASC' },
          })
        : [];
    return {
      usuario: usuario.usuario,
      superUsuario: usuario.superUsuario,
      restaurantes,
    };
  }
}

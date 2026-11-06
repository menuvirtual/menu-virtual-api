import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';

/** Usuário autenticado (vem do access token do Cognito; ver AuthGuard). */
export interface UsuarioAutenticado {
  /** Username no Cognito (ex.: "USER1") */
  usuario: string;
  /** Identificador imutável do usuário no Cognito */
  sub: string;
  /** Pertence ao grupo de superusuários: acessa todos os restaurantes */
  superUsuario: boolean;
  /** Restaurantes que administra (vazio para superusuários, que acessam todos) */
  restauranteIds: number[];
}

export const ROTA_PUBLICA = 'rotaPublica';

/** Libera a rota (ou o controller inteiro) do Bearer token. */
export const Publica = () => SetMetadata(ROTA_PUBLICA, true);

/** Injeta o usuário autenticado no parâmetro do handler. */
export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): UsuarioAutenticado =>
    contexto.switchToHttp().getRequest<{ usuario: UsuarioAutenticado }>()
      .usuario,
);

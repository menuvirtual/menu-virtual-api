import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Carrega o .env se existir (variáveis já definidas no ambiente têm prioridade).
if (existsSync('.env')) process.loadEnvFile('.env');

/** Configuração via variáveis de ambiente (com valores padrão para desenvolvimento). */
export const configuracao = {
  /** Porta HTTP */
  porta: Number(process.env.PORT ?? 3000),

  /** Pasta com payloads/ (dados iniciais do seed) e imagens/ */
  diretorioDados: process.env.DATA_DIR ?? join(process.cwd(), 'data'),

  /** Origens liberadas no CORS ("*" ou lista separada por vírgula) */
  origensCors: process.env.CORS_ORIGIN ?? '*',

  /** MySQL (padrões batem com o docker-compose.yml) */
  banco: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    porta: Number(process.env.DB_PORT ?? 3307),
    usuario: process.env.DB_USER ?? 'menu',
    senha: process.env.DB_PASSWORD ?? 'menu',
    nome: process.env.DB_NAME ?? 'menu',
    /** Aplica as migrations pendentes ao subir a API */
    executarMigrations: (process.env.DB_MIGRATIONS_RUN ?? 'true') === 'true',
    /** Loga o SQL executado */
    logging: process.env.DB_LOGGING === 'true',
  },

  /**
   * AWS Cognito (usuários do admin). Em desenvolvimento usa o cognito-local do
   * docker-compose: `npm run cognito:setup` preenche o pool e o client no .env.
   */
  cognito: {
    regiao: process.env.COGNITO_REGION ?? 'us-east-1',
    /** Endereço do Cognito. Vazio = Cognito real da AWS; http://localhost:9229 = cognito-local */
    endpoint: process.env.COGNITO_ENDPOINT || undefined,
    userPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
    clientId: process.env.COGNITO_CLIENT_ID ?? '',
    /** Segredo do app client (opcional; se o client tiver segredo, envia o SECRET_HASH) */
    clientSecret: process.env.COGNITO_CLIENT_SECRET || undefined,
    /** Grupo do Cognito com acesso a todos os restaurantes */
    grupoSuperUsuario: process.env.COGNITO_GRUPO_SUPERUSUARIO ?? 'SuperUsuario',
    /** Emissor (claim "iss") esperado nos tokens */
    get emissor(): string {
      return this.endpoint
        ? `${this.endpoint.replace(/\/+$/, '')}/${this.userPoolId}`
        : `https://cognito-idp.${this.regiao}.amazonaws.com/${this.userPoolId}`;
    },
  },

  /** Captcha do login (ALTCHA, prova de trabalho; não depende de serviço externo) */
  captcha: {
    /**
     * Segredo HMAC que assina os desafios. Sem valor, é gerado a cada subida da API
     * (ok em desenvolvimento; em produção defina, e use o mesmo em todas as instâncias).
     */
    segredo: process.env.CAPTCHA_SECRET || randomBytes(32).toString('hex'),
    /** Validade do desafio, em segundos */
    validadeSegundos: Number(process.env.CAPTCHA_VALIDADE ?? 600),
  },
};

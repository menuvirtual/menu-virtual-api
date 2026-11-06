/*
 * npm run cognito:setup
 *
 * Prepara o cognito-local (emulador do Cognito no docker-compose) para desenvolvimento:
 * user pool, app client, grupo de superusuários e os usuários de teste. Grava os ids
 * gerados no .env (COGNITO_USER_POOL_ID e COGNITO_CLIENT_ID). Pode rodar várias vezes:
 * reaproveita o que já existe e redefine as senhas.
 *
 * Os restaurantes de cada usuário ficam no banco (tabela UsuarioRestaurante, gravada
 * pelo `npm run db:seed`). O SUPERUSER pertence ao grupo SuperUsuario e acessa todos.
 *
 * Só para o emulador: com o Cognito real, crie os recursos pela AWS (console/IaC).
 */
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ListUserPoolClientsCommand,
  ListUserPoolsCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { configuracao } from '../configuracao.js';
import { SENHA_TESTE, USUARIOS_TESTE } from './usuarios-teste.js';

const NOME_POOL = 'menu-admin';
const NOME_CLIENT = 'menu-api';

const { cognito } = configuracao;
const endpoint = cognito.endpoint ?? 'http://localhost:9229';
const cliente = new CognitoIdentityProviderClient({
  endpoint,
  region: cognito.regiao,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

/** Ignora o erro "já existe" (para o script poder rodar várias vezes). */
async function seNaoExistir(acao: () => Promise<unknown>): Promise<void> {
  try {
    await acao();
  } catch (erro) {
    const nome = (erro as Error).name;
    if (!['UsernameExistsException', 'GroupExistsException'].includes(nome))
      throw erro;
  }
}

async function obterPool(): Promise<string> {
  const { UserPools = [] } = await cliente.send(
    new ListUserPoolsCommand({ MaxResults: 60 }),
  );
  const existente = UserPools.find((p) => p.Name === NOME_POOL);
  if (existente?.Id) return existente.Id;
  const { UserPool } = await cliente.send(
    new CreateUserPoolCommand({
      PoolName: NOME_POOL,
      UsernameConfiguration: { CaseSensitive: false },
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
        },
      },
    }),
  );
  return UserPool!.Id!;
}

async function obterClient(poolId: string): Promise<string> {
  const { UserPoolClients = [] } = await cliente.send(
    new ListUserPoolClientsCommand({ UserPoolId: poolId, MaxResults: 60 }),
  );
  const existente = UserPoolClients.find((c) => c.ClientName === NOME_CLIENT);
  if (existente?.ClientId) return existente.ClientId;
  const { UserPoolClient } = await cliente.send(
    new CreateUserPoolClientCommand({
      UserPoolId: poolId,
      ClientName: NOME_CLIENT,
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ],
      PreventUserExistenceErrors: 'ENABLED',
    }),
  );
  return UserPoolClient!.ClientId!;
}

/** Cria ou atualiza as chaves no .env (mantendo as demais linhas). */
function gravarEnv(valores: Record<string, string>): void {
  const arquivo = existsSync('.env')
    ? readFileSync('.env', 'utf8')
    : existsSync('.env.example')
      ? readFileSync('.env.example', 'utf8')
      : '';
  const linhas = arquivo.split('\n');
  for (const [chave, valor] of Object.entries(valores)) {
    const i = linhas.findIndex((l) => l.startsWith(`${chave}=`));
    if (i >= 0) linhas[i] = `${chave}=${valor}`;
    else linhas.push(`${chave}=${valor}`);
  }
  writeFileSync('.env', `${linhas.join('\n').trimEnd()}\n`);
}

const poolId = await obterPool();
const clientId = await obterClient(poolId);
await seNaoExistir(() =>
  cliente.send(
    new CreateGroupCommand({
      UserPoolId: poolId,
      GroupName: cognito.grupoSuperUsuario,
      Description: 'Acesso a todos os restaurantes',
    }),
  ),
);

for (const { usuario, email, superUsuario } of USUARIOS_TESTE) {
  await seNaoExistir(() =>
    cliente.send(
      new AdminCreateUserCommand({
        UserPoolId: poolId,
        Username: usuario,
        MessageAction: 'SUPPRESS',
        TemporaryPassword: SENHA_TESTE,
      }),
    ),
  );
  // e-mail verificado: necessário para o "esqueci minha senha"
  await cliente.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: poolId,
      Username: usuario,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
    }),
  );
  await cliente.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: poolId,
      Username: usuario,
      Password: SENHA_TESTE,
      Permanent: true,
    }),
  );
  if (superUsuario)
    await cliente.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: poolId,
        Username: usuario,
        GroupName: cognito.grupoSuperUsuario,
      }),
    );
}

gravarEnv({
  COGNITO_ENDPOINT: endpoint,
  COGNITO_REGION: cognito.regiao,
  COGNITO_USER_POOL_ID: poolId,
  COGNITO_CLIENT_ID: clientId,
});

console.log(`cognito-local pronto em ${endpoint}`);
console.log(
  `  user pool: ${poolId}   app client: ${clientId}   (gravados no .env)`,
);
console.log(
  `  usuários (senha ${SENHA_TESTE}): ${USUARIOS_TESTE.map((u) => u.usuario).join(', ')}`,
);

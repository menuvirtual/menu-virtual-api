# Menu API (NestJS)

API do cardápio virtual:

- **Público:** `GET /menu` entrega, em um único payload, tudo o que o FrontEnd precisa para montar o cardápio.
- **Admin:** `/admin/...` tem os CRUDs do domínio, consumidos pelo painel `../FrontEnd-Admin` (Angular).
  Exigem login (usuários do AWS Cognito; em desenvolvimento, o emulador cognito-local).

```bash
npm install
npm run dev:setup          # sobe MySQL + cognito-local (docker), cria pool/usuários e grava os dados iniciais
npm run start:dev          # http://localhost:3000
npm test                   # testes unitários
npm run test:e2e           # testes de ponta a ponta (banco menu_test + cognito-local; requer dev:setup)
```

`dev:setup` = `db:up` + `cognito:setup` + `db:seed` (cada um pode rodar separado, e várias vezes).

Clientes de exemplo: `npm run db:seed-clientes [-- --quantidade=15]` cadastra clientes com dados aleatórios em
cada restaurante, completando até a quantidade (padrão 15; não duplica ao rodar de novo). Os clientes
pertencem ao **restaurante**, então valem para todos os menus dele. O `db:seed` não mexe em clientes.

Documentação interativa (Swagger): http://localhost:3000/docs — especificação OpenAPI em `/docs-json`.

## Cardápio público

`GET /menu?restaurante=casa-lusitana[&preview=true]`

| Status | Quando |
|--------|--------|
| 200 | devolve o `Payload` (versão publicada) do **menu ativo** do restaurante, como está gravado; com `preview=true`, o `PayloadPreview` (versão de pré-visualização) do mesmo menu |
| 400 | `restaurante` ausente ou inválido (aceita letras minúsculas, números e hífen), ou `preview` diferente de `true`/`false` |
| 404 | restaurante não cadastrado, ou sem menu ativo |

## Login e segurança

Os usuários ficam no **AWS Cognito**. Enquanto o Cognito real não existe, o docker-compose sobe o
**cognito-local** (emulador, porta 9229), e `npm run cognito:setup` cria nele o user pool, o app client,
o grupo `SuperUsuario` e os usuários de teste, gravando `COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID` no `.env`.
Para usar o Cognito real, basta trocar as variáveis (`COGNITO_ENDPOINT` vazio + pool e client da AWS).

| Usuário | Senha | Restaurantes |
|---------|-------|--------------|
| `USER1` | `Menu@12345` | casa-lusitana e chapa-quente |
| `USER2` | `Menu@12345` | casa-italiana |
| `SUPERUSER` | `Menu@12345` | todos (grupo `SuperUsuario` no Cognito) |

No cognito-local o usuário diferencia maiúsculas de minúsculas (digite `USER1`). E-mails: `user1@menu.local` etc.

**Fluxo** (a API funciona como "BFF" do login; o admin nunca fala direto com o Cognito):

| Rota (pública) | O que faz |
|----------------|-----------|
| `GET /auth/captcha` | desafio do captcha (ALTCHA) |
| `POST /auth/login` | `{ usuario, senha, captcha }` → `{ sessao: { accessToken, refreshToken, expiraEm, usuario } }` ou, no primeiro acesso, `{ desafio }` |
| `POST /auth/nova-senha` | `{ usuario, desafio, novaSenha }`: troca a senha temporária e abre a sessão |
| `POST /auth/renovar` | `{ usuario, refreshToken }` → novo access token |
| `POST /auth/esqueci-senha` | `{ usuario, captcha }`: envia código por e-mail (sempre 204, não revela se o usuário existe) |
| `POST /auth/redefinir-senha` | `{ usuario, codigo, novaSenha }` |

Toda rota fora de `/auth` e do `GET /menu` exige `Authorization: Bearer <accessToken>` (guard global
`AuthGuard`; rotas livres usam `@Publica()`). O token é validado pelas chaves públicas (JWKS) do user pool:
assinatura, emissor, validade, `token_use = access` e `client_id`. No Swagger, use o botão **Authorize**.

- **Captcha:** [ALTCHA](https://altcha.org), prova de trabalho (~1 s no navegador), sem serviço externo.
  Obrigatório no login e no "esqueci a senha"; cada resposta vale uma vez e expira em 10 min.
  Os desafios usados ficam em memória: com mais de uma instância da API, troque por um armazenamento
  compartilhado e defina `CAPTCHA_SECRET` (igual em todas). O widget precisa de contexto seguro
  (HTTPS ou `localhost`).
- **Senhas:** mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.
- **Primeiro acesso / esqueci a senha:** o cognito-local não envia e-mail; o código aparece no log:
  `docker logs menu-api-cognito`.
- Usuário inexistente e senha errada dão a mesma resposta (401).

### Quem acessa o quê

- `GET /admin/eu` devolve o usuário, se é superusuário e os restaurantes que ele administra.
- Restaurantes de cada usuário: tabela `UsuarioRestaurante` (`Usuario` = username do Cognito,
  `RestauranteId`). Superusuários (grupo do Cognito) acessam todos.
- Toda leitura e gravação confere o restaurante dono do registro (`AcessoService`): registro de outro
  restaurante → **403**; inexistente → 404. Listagens sem filtro trazem só os restaurantes do usuário.
- Só superusuários **cadastram/excluem restaurantes** e **criam/alteram/excluem tags** (as tags valem
  para todos os restaurantes); os demais leem as tags e as usam nos itens.
- Ainda não há tela para vincular usuários a restaurantes: por enquanto, pelo seed (`ACESSOS_TESTE`
  em `src/database/seed.ts`) ou direto na tabela.

## Admin (CRUD)

Todas as entidades têm as mesmas 5 rotas:

| Método | Rota | Resposta |
|--------|------|----------|
| `GET` | `/admin/<recurso>?<filtros>` | lista |
| `GET` | `/admin/<recurso>/:id` | registro (404 se não existir) |
| `POST` | `/admin/<recurso>` | 201 + registro criado |
| `PATCH` | `/admin/<recurso>/:id` | registro alterado (só os campos enviados) |
| `DELETE` | `/admin/<recurso>/:id` | 204 |

| Recurso | Entidade | Filtros da listagem |
|---------|----------|---------------------|
| `restaurantes` | Restaurante (no admin: tela de seleção e página Configuração) | — |
| `menus` | Menu (a listagem não traz o `payload`) | `restauranteId` |
| `configuracoes-menu` | ConfiguracaoMenu | `menuId` |
| `categorias` | Categoria | `menuId` |
| `subcategorias` | SubCategoria | `categoriaId`, `menuId` |
| `itens` | Item (com `tags`; grava com `tagIds: number[]`) | `subCategoriaId`, `categoriaId`, `menuId` |
| `item-medias` | ItemMedia | `itemId` |
| `clientes` | Cliente | `restauranteId`, `busca` (nome, e-mail ou telefone) |
| `tags` | Tag | — |

`GET /admin/resumo[?restauranteId=1]` devolve os totais usados no admin: dos restaurantes do usuário ou só
de um (as tags são globais e sempre contam todas).

Erros: 400 (validação, com as mensagens em `message`), 404 (registro ou pai inexistente) e 409
(duplicidade, regra do menu ou exclusão de registro com vínculos). Campos desconhecidos no corpo dão 400.
Textos são aparados; texto opcional vazio vira `null`. Na criação, `ordem` omitida = fim da lista.

## Domínio (MySQL + TypeORM)

```
Restaurante ─┬─< Menu ─┬── ConfiguracaoMenu (1:1)
             │         └─< Categoria ─< SubCategoria ─< Item ─┬─< ItemMedia
             └─< Cliente                                        └─< ItemTag >── Tag
```

| Tabela | Colunas |
|--------|---------|
| `Restaurante` | `Id`, `Nome` varchar(120), `Slug` varchar(60) único (chave da URL do cardápio) |
| `Menu` | `Id`, `Nome` varchar(80) (único por restaurante), `Payload` json (versão publicada), `PayloadPreview` json (versão de pré-visualização), `RestauranteId`, `IsAtivo` bool, `ContemAtualizacaoParaPublicar` bool |
| `ConfiguracaoMenu` | `Id`, `MenuId` (único), `HabilitaPT/EN/ES/FR/PL/DE`, `HabilitaPesquisaCliente`, `HabilitaPesquisaClienteNome/DataNiver/Email/Phone` |
| `Categoria` | `Id`, `MenuId`, `Ordem`, `DescricaoPT/EN/ES/FR/PL/DE` varchar(255) |
| `SubCategoria` | `Id`, `CategoriaId`, `Ordem`, `DescricaoPT..DE` |
| `Item` | `Id`, `SubCategoriaId`, `Ordem`, `NomePT..DE`, `DescricaoPT..DE`, `Visivel` bool |
| `ItemMedia` | `Id`, `ItemId`, `Tipo` char(1) (`I` imagem, `V` vídeo), `Url` varchar(255), `Ordem` |
| `ItemTag` | `ItemId`, `TagId` (ligação N:N entre Item e Tag) |
| `Tag` | `Id`, `DescricaoPT..DE`, `VisibleLista` bool (aparece na lista de filtros do cardápio) |
| `Cliente` | `Id`, `RestauranteId`, `Nome`, `DataNascimento` date, `Email`, `Phone` |
| `UsuarioRestaurante` | `Usuario` (username do Cognito), `RestauranteId` |

Nos campos traduzidos, o PT é obrigatório (exceto `Item.Descricao*`, toda opcional) e os demais idiomas
são opcionais. As entidades ficam em `src/<recurso>/*.entity.ts`, documentadas.

### Regras do Menu

- Cada menu tem um **`Nome`** (ex.: "Menu dia", "Menu noite", "Menu drinks"): obrigatório, até 80 caracteres e
  **único por restaurante** (409 se repetir; o mesmo nome pode existir em outro restaurante). Serve só para
  identificar o menu no admin: **não aparece no cardápio nem no JSON**, e renomear não gera "algo para publicar".
- Um restaurante pode ter **vários menus, mas só 1 ativo**. Ativar um menu desativa o que estava ativo.
  Garantido em `MenusService` (transação com lock na linha do restaurante) e no banco (índice único
  `UQ_Menu_Ativo` sobre uma coluna gerada).
- Cada menu tem **duas versões** do JSON: `Payload` (publicada, `GET /menu`) e `PayloadPreview`
  (pré-visualização, `GET /menu?preview=true`). As duas são do menu ativo.

### JSON do menu: preview automático e publicação

O JSON **não é editável pelo usuário** (a API recusa `payload`/`payloadPreview` com 400): ele é gerado a
partir das tabelas.

1. Depois de **gravar** (criar, alterar ou excluir) qualquer registro que faz parte de um menu — configuração,
   categoria, subcategoria, item (e as tags dele), mídia — o serviço emite o evento `menu.alterado`
   (`@nestjs/event-emitter`, em `src/preview`). Também emitem: alterar/excluir uma **tag** (todos os
   menus que têm itens com ela) e **renomear o restaurante** (todos os menus dele).
2. O handler (`AtualizadorPreview`) lê o estado atual do menu nas tabelas, monta o JSON
   (`montarPayload`), grava em `PayloadPreview` e liga `ContemAtualizacaoParaPublicar`. O evento é
   aguardado: quando a requisição responde, o preview já está atualizado. Se o handler falhar, o erro vai
   para o log (a escrita original já foi gravada) e a próxima escrita no menu regenera o preview. O
   handler trava a linha do menu, então escritas simultâneas são tratadas uma de cada vez.
3. `POST /admin/menus/:id/publicar` copia o `PayloadPreview` para o `Payload` e desliga a flag
   (409 se não houver atualizações). É o que faz o `GET /menu` mostrar as mudanças.

O que o gerador faz com o JSON:

- **Vem das tabelas:** nome do restaurante, idiomas (`ConfiguracaoMenu`), categorias, subcategorias e itens
  (ordem, nomes e descrições nos idiomas preenchidos, fotos, tags). Itens com `Visivel = false` e mídias do
  tipo vídeo não entram. Tags de lista de filtros (`VisibleLista`) viram `dieta` do item e `filtros`; as
  demais viram `tags`. Os ids no JSON passam a ser `cat-<id>`, `sub-<id>` e `item-<id>`.
- **Vem do JSON anterior** (ainda não existe nas tabelas): moeda, textos da interface, redes sociais, slogan,
  ícone da categoria, colunas de preço da subcategoria e **preços dos itens**. O nó anterior é achado pelo
  id (`item-<id>`) e, na primeira regeneração (JSON vindo do seed), pelo nome em português. Item novo fica
  sem preço (`precos: []`) e subcategoria nova ganha uma coluna "Preço".
- **Menu novo** (`POST /admin/menus` com `restauranteId`, `nome` e, opcionalmente, `isAtivo`; sem JSON no corpo): nasce vazio, com os textos/moeda/redes do menu
  ativo do restaurante (ou os padrões, em `src/preview/payload-padrao.ts`); `Payload` e `PayloadPreview` iguais.

### Exclusões

- Restaurante: só sem menus e sem clientes (409).
- Menu: apaga em cascata a configuração, categorias, subcategorias, itens e mídias.
- Categoria → subcategorias e itens; SubCategoria → itens; Item → mídias e ligações com tags.
- Tag: some dos itens que a usavam.

O `Payload` do menu é independente das tabelas de categorias/itens: o `GET /menu` devolve o JSON
como está gravado (gerar o payload a partir das tabelas fica para uma próxima etapa). O formato está
em `src/cardapio/cardapio.types.ts` (`MenuPayload`). Obs.: a coluna `json` do MySQL normaliza o documento
(a ordem das chaves dos objetos pode mudar; arrays e valores são preservados).

### Migrations

O schema é controlado só por migrations (`synchronize: false`). A API aplica as pendentes ao subir
(`DB_MIGRATIONS_RUN=true`). Os comandos rodam sobre o build (`dist/`):

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
npm run migration:generate -- src/database/migrations/NomeDaMigration
```

Ao gerar uma migration, registre a classe em `src/database/migrations/index.ts`.

### Dados iniciais (seed)

`npm run db:seed`:

1. Cria as tags que faltam: as 8 do domínio (Sem glúten, Sem conservantes, Sem leite, Vegano, Aprovado
   pelo chef, Sem amendoim, Sem ovo, Sem alimentos do mar) e as tags/filtros usados nos payloads.
2. Para cada `data/payloads/<slug>.json`, cria/atualiza o restaurante, **apaga os menus dele** e recria
   dois menus: o **ativo**, "Menu principal" (`data/payloads/<slug>.json`), e um **inativo** com outros textos
   (`data/payloads/inativos/<slug>.json`): "Menu inverno" (casa-lusitana), "Menu brunch" (chapa-quente) e
   "Menu degustação" (casa-italiana).
   Nos dois, o `PayloadPreview` começa igual ao `Payload` (e `ContemAtualizacaoParaPublicar` = false). Cada menu ganha configuração, categorias,
   subcategorias, itens (com tags) e fotos convertidos do payload. Os preços do payload não são
   convertidos (o Item não tem preço no domínio).

3. Vincula os usuários de teste aos restaurantes (`USER1` → casa-lusitana e chapa-quente; `USER2` →
   casa-italiana).

Pode rodar várias vezes. **Atenção:** desfaz as alterações feitas no admin nos menus desses restaurantes.
Clientes não são alterados.

| Slug | Arquivo |
|------|---------|
| `casa-lusitana` | `data/payloads/casa-lusitana.json` (cardápio português) |
| `chapa-quente` | `data/payloads/chapa-quente.json` (hamburgueria; reaproveita as mesmas imagens) |
| `casa-italiana` | `data/payloads/casa-italiana.json` (cantina italiana; reaproveita as mesmas imagens) |

### Resumo do payload

```jsonc
{
  "restaurante": { "nome": { "pt": "...", "en": "...", "es": "..." }, "slogan": { ... } | null },
  "moeda": { "codigo": "BRL", "simbolo": "R$", "locale": "pt-BR" },
  "idiomas": [ { "codigo": "pt", "rotulo": "PT", "nome": "Português", "locale": "pt-BR" }, ... ],
  "idiomaPadrao": "pt",
  "textos": { "filtro.botao": { "pt": "Filtrar", "en": "Filter", "es": "Filtrar" }, ... },
  "filtros": [ { "id": "vegano", "nome": { ... } } ],
  "redesSociais": { "instagram": null, "facebook": null, "avaliacaoGoogle": null },
  "categorias": [ {
    "id": "bebidas", "nome": { ... }, "icone": "bi-cup-straw",
    "subcategorias": [ {
      "id": "vinhos-tintos", "nome": { ... },
      "colunas": [ { "pt": "Taça", ... }, { "pt": "Garrafa", ... } ],   // 1 a 4
      "itens": [ {
        "id": "cartuxa-colheita", "nome": { ... }, "descricao": { ... } | null,
        "precos": [49, 289],                       // um por coluna; null = não tem esse tamanho
        "fotos": ["http://localhost:3000/imagens/casa-lusitana/cartuxa.jpg"],  // [] = sem foto
        "dieta": ["semGluten"],                    // ids de "filtros"
        "tags": [ { "id": "alentejo", "nome": { ... } } ]
      } ]
    } ]
  } ]
}
```

## Imagens de exemplo

As URLs do payload de teste apontam para `http://localhost:3000/imagens/...`, servidas
provisoriamente a partir de `data/imagens/` (ver `src/configurar-app.ts`). Em produção as fotos
ficam num storage/CDN e o payload guarda essas URLs; aí essa parte pode ser removida.

## Variáveis de ambiente

Lidas do ambiente ou de um `.env` na raiz (modelo em `.env.example`).

| Variável | Padrão | Uso |
|----------|--------|-----|
| `PORT` | `3000` | porta HTTP |
| `CORS_ORIGIN` | `*` | origens liberadas, separadas por vírgula |
| `DATA_DIR` | `./data` | pasta dos payloads do seed e das imagens de exemplo |
| `DB_HOST` | `127.0.0.1` | host do MySQL |
| `DB_PORT` | `3307` | porta do MySQL (3307 = docker-compose, para não conflitar com um MySQL local) |
| `DB_USER` / `DB_PASSWORD` | `menu` / `menu` | credenciais |
| `DB_NAME` | `menu` | banco (os testes e2e usam `menu_test`) |
| `DB_MIGRATIONS_RUN` | `true` | aplica as migrations pendentes ao subir a API |
| `DB_LOGGING` | `false` | loga o SQL executado |
| `COGNITO_ENDPOINT` | — | `http://localhost:9229` (cognito-local); vazio = Cognito real da AWS |
| `COGNITO_REGION` | `us-east-1` | região do user pool |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | — | user pool e app client (obrigatórios; `cognito:setup` preenche) |
| `COGNITO_CLIENT_SECRET` | — | segredo do app client, se houver (recomendado em produção) |
| `COGNITO_GRUPO_SUPERUSUARIO` | `SuperUsuario` | grupo do Cognito com acesso a todos os restaurantes |
| `CAPTCHA_SECRET` | aleatório a cada subida | segredo HMAC dos desafios do captcha (defina em produção) |
| `CAPTCHA_VALIDADE` | `600` | validade do desafio, em segundos |

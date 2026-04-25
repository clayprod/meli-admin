# Meli Admin

Aplicacao local para administrar precificacao, margem, ROI, ADS e custos de produtos vendidos no Mercado Livre.

## O que ja existe

- motor de calculo em `TypeScript` baseado na planilha `CALCULADORA_MELI.xlsx`
- preview ao vivo em `/pricing/new`
- dashboard inicial, catalogo de produtos, cenarios e tela de tarifas
- schema `Prisma` com seeds iniciais para frete, Full e produto exemplo
- testes unitarios validando o caso-base da planilha

## Stack

- `Next.js 16` + `TypeScript`
- `Tailwind CSS 4`
- `React Hook Form` + `Zod`
- `Prisma`
- `Vitest`

## Rodando localmente

1. Instale dependencias:

```bash
npm install
```

2. Suba o ambiente local:

```bash
npm run dev
```

3. Abra:

```text
http://localhost:3000
```

## Scripts uteis

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:generate
npm run db:seed
```

## Banco de dados

O projeto ja esta configurado para `PostgreSQL` via `Prisma`.

Arquivo de ambiente base:

```env
DATABASE_URL="postgresql://postgres:CHANGE_ME@localhost:5432/tenryu?schema=meli_admin"
```

### Desenvolvimento local com banco remoto

Para usar o banco principal do servidor sem expor uma nova porta publica, a configuracao local usa um tunel SSH em `127.0.0.1:5433`.

No servidor existe um proxy local-only em `127.0.0.1:55432` apontando para o service `postgres` da rede do EasyPanel.

Exemplo:

```bash
ssh -L 5433:127.0.0.1:55432 root@195.35.40.49 -N
```

Com o tunel ativo, o `.env` local pode apontar para:

```env
DATABASE_URL="postgresql://postgres:***@127.0.0.1:5433/tenryu?schema=meli_admin"
```

### Producao no EasyPanel

No container da app, use o alias interno do swarm:

```env
DATABASE_URL="postgresql://postgres:***@postgres:5432/tenryu?schema=meli_admin"
```

## Estrutura principal

- `app/` rotas do dashboard, precificador e admin
- `components/` UI e shell da aplicacao
- `lib/pricing/` motor de calculo, schemas e dados iniciais
- `prisma/` schema e seed
- `tests/` regressao do calculo

## Proximas etapas

- persistir produtos, cenarios e resultados no banco
- criar CRUD real para admin de tarifas
- adicionar Dockerfile e GitHub Actions para publicar imagem no GHCR
- conectar deploy via EasyPanel

## CI/CD no GitHub Actions

O repositório ja vem com dois workflows:

- `CI`: roda `lint`, `typecheck`, `test` e `build`
- `CD`: builda a imagem Docker e publica no `ghcr.io`

### Secrets no GitHub

Obrigatorio para o fluxo atual:

- `EASYPANEL_DEPLOY_HOOK` -> webhook do App Service no Easypanel para forcar um redeploy apos publicar uma nova imagem

Observacoes:

- o publish no `GHCR` usa o `GITHUB_TOKEN` nativo do Actions; nao precisa criar secret extra para isso
- se o pacote do GHCR ficar privado, o pull no EasyPanel vai precisar de credenciais do GitHub Packages no proprio EasyPanel

### Tags publicadas no GHCR

As imagens saem com:

- `ghcr.io/clayprod/meli-admin:latest`
- `ghcr.io/clayprod/meli-admin:sha-<commit>`
- `ghcr.io/clayprod/meli-admin:main`

### EasyPanel

No `App Service` do EasyPanel, use:

- Source: `Docker image`
- Image: `ghcr.io/clayprod/meli-admin:latest`
- Port: `3000`
- Deploy Hook: copie a URL e coloque em `EASYPANEL_DEPLOY_HOOK`

Se a imagem estiver privada no GHCR, configure tambem no EasyPanel:

- Registry server: `ghcr.io`
- Registry username: seu usuario GitHub
- Registry password: PAT com permissao de packages

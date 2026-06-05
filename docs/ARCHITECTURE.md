# Arquitetura de Testes — Brechó Balone QA

## Visão Geral

Este repositório contém a suite de automação de testes para o e-commerce Brechó Balone, construída com **Playwright + TypeScript**.

---

## Estrutura de Pastas

```
balone-qa/
├── .github/workflows/     # Pipelines CI/CD (GitHub Actions)
├── tests/
│   ├── e2e/
│   │   ├── critical/      # Checkout, autenticação — bloqueiam deploy
│   │   ├── high/          # Catálogo, carrinho, busca
│   │   ├── medium/        # Perfil, pedidos, favoritos
│   │   └── low/           # Newsletter, SEO, conteúdo estático
│   ├── accessibility/     # WCAG 2.1 AA com axe-core
│   ├── performance/       # Web Vitals, LCP, CLS
│   └── visual/            # Regressão visual (screenshots)
├── pages/                 # Page Objects (padrão POM)
├── fixtures/              # Extensões de test() com injeção de dependências
├── helpers/               # Utilitários: env, faker, wait, etc.
├── support/               # global-setup / global-teardown
└── docs/                  # Esta documentação
```

---

## Níveis de Prioridade

| Nível    | Quando roda          | Bloqueante? | Projetos        |
|----------|----------------------|-------------|-----------------|
| critical | Todo push            | Sim         | chromium        |
| high     | Todo push            | Sim         | chromium, firefox |
| medium   | Nightly / manual     | Não         | chromium        |
| low      | Nightly / manual     | Não         | chromium        |
| smoke    | Todo PR              | Sim         | chromium        |

---

## Padrões Adotados

- **Page Object Model (POM)**: toda interação com a UI fica em `pages/`.
- **Fixtures customizadas**: `fixtures/base.ts` estende `test()` com Page Objects injetados.
- **Tags**: use `@smoke`, `@regression`, `@critical`, `@a11y` nos títulos dos testes.
- **Faker localizado**: `helpers/faker.ts` gera dados em pt-BR.
- **Variáveis de ambiente**: todas via `.env` (ver `.env.example`).

---

## Como Rodar Localmente

```bash
# Instalar dependências
npm ci

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com os valores corretos

# Rodar todos os testes
npm test

# Rodar apenas críticos
npm run test:critical

# Modo UI (interativo)
npm run test:ui

# Ver relatório HTML
npm run report:open
```

---

## CI/CD

Os pipelines estão em `.github/workflows/playwright.yml`:

- **PRs**: smoke tests em chromium.
- **Push em main/develop**: testes critical + high.
- **Nightly (02h BRT)**: regressão completa com sharding 4×.

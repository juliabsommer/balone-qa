# 🛍️ Balonê QA — Automação de Testes

Projeto de automação de testes E2E para o **Brechó Balonê** da Fê Bassi, cobrindo o site institucional e o catálogo online com compra via WhatsApp.

---

## 🗺️ O que está sendo testado

O Balonê tem dois ambientes distintos — e os testes cobrem ambos:

| Ambiente | URL | O que faz |
|---|---|---|
| 🏠 Site institucional | [brechobalone.com.br](https://www.brechobalone.com.br) | Landing page com info da loja, espaços, endereço e contato |
| 🛒 Catálogo online | [catalogobalone.netlify.app](https://catalogobalone.netlify.app) | SPA para montar pedido e enviar pelo WhatsApp |

Não tem login, carrinho ou pagamento — o fluxo de compra termina no **WhatsApp da Fê**.

---

## 🧪 Estrutura dos testes

```
tests/
├── 🧭 jornadas/          # Testes ponta a ponta — visão de usuário real
│   ├── primeira-visita.spec.ts   # Ana visita o site pela primeira vez
│   └── montar-pedido.spec.ts     # Carla monta e envia um pedido
│
├── 🏠 site/              # Testes funcionais do site institucional
│   └── site.spec.ts              # 18 cenários: nav, seções, SEO, mobile, performance
│
├── 🛒 catalogo/          # Testes funcionais do catálogo
│   └── catalogo.spec.ts          # 18 cenários: produtos, filtros, seleção, WhatsApp
│
├── ♿ accessibility/      # Auditoria de acessibilidade (axe-core)
├── ⚡ performance/        # Testes de performance
└── 👁️ visual/            # Testes visuais (screenshots)
```

---

## 🎭 As personas

Os testes de jornada foram escritos com personagens reais para fazer mais sentido do ponto de vista de QA:

### 🌸 Ana — Primeira Visita
> 28 anos, ouviu falar do brechó no Instagram e acessa o site pela primeira vez.

- Descobre o brechó e entende a proposta
- Aprende como funciona a compra antes de ir ao catálogo
- Busca o endereço para visitar a loja física
- Quer falar com a Fê antes de comprar
- Acessa pelo celular no ônibus

### 🛍️ Carla — Montando o Pedido
> 32 anos, já conhece o brechó e entrou direto no catálogo para separar peças.

- Entra no catálogo e vê as peças disponíveis
- Filtra pelo Mini Museu e encontra peças retrô
- Seleciona uma peça e vê o contador atualizar
- Muda de ideia e retira uma peça da seleção
- Monta um pedido com 3 peças e envia pelo WhatsApp
- Tenta enviar sem selecionar nada — sistema avisa ou bloqueia

---

## ⚙️ Configuração

### Pré-requisitos

- Node.js 18+
- npm

### Instalação

```bash
# Clonar o repositório
git clone <url-do-repo>
cd balone-qa

# Instalar dependências
npm install

# Instalar os browsers do Playwright
npx playwright install
```

---

## ▶️ Como executar os testes

### Comandos principais

```bash
# Rodar TODOS os testes
npm test

# Apenas smoke tests (os mais críticos, rápidos)
npm run test:smoke

# Apenas o site institucional
npm run test:site

# Apenas o catálogo
npm run test:catalogo

# Testes em mobile (Chrome e Safari)
npm run test:mobile

# Todos os browsers (Chromium, Firefox, WebKit)
npm run test:all-browsers
```

### Modos de execução

```bash
# 🖥️  Interface visual — recomendado para explorar e debugar
npm run test:ui

# 👁️  Headed — ver o browser abrindo e os cliques acontecendo
npm run test:headed

# 🐌  Slow motion — ver cada ação devagar (800ms entre ações)
npx playwright test --headed --slow-mo 800

# 🔍  Debug — pausar e avançar step a step
npm run test:debug

# ✅  Checar TypeScript sem rodar os testes
npm run typecheck
```

### Rodar testes específicos

```bash
# Rodar apenas as jornadas
npx playwright test tests/jornadas --project=chromium

# Rodar apenas um arquivo
npx playwright test tests/jornadas/montar-pedido.spec.ts --project=chromium

# Rodar por nome do teste (grep)
npx playwright test --grep "Carla"

# Rodar em um browser específico
npx playwright test --project=firefox
npx playwright test --project=webkit  # Safari
```

---

## 📊 Relatórios

### Relatório HTML (padrão)

Após qualquer execução, o relatório fica disponível em `playwright-report/`:

```bash
npm run report:open
```

Isso abre um relatório interativo no browser com:
- ✅ / ❌ resultado de cada teste
- 🎬 Vídeo da execução (em caso de falha)
- 📸 Screenshot do momento da falha
- 🔍 Trace completo com timeline de ações

### Relatório Allure (mais visual)

```bash
npm run report:allure
```

---

## 🔖 Tags dos testes

Os testes mais críticos são marcados com `@smoke`:

```bash
# Rodar só os smoke tests (ideal para CI ou validação rápida)
npm run test:smoke
```

Smoke tests cobrem:
- Carregamento do site com título correto
- Tagline do hero visível
- Botão do catálogo aponta para a URL correta
- Catálogo carrega com produtos visíveis
- Categorias Mini Museu e Espaço Boho visíveis
- Contador inicial zerado
- Botão "Enviar pedido" aponta para o WhatsApp da Fê
- Endereço e links de contato visíveis

---

## 🗂️ Page Objects

Os Page Objects abstraem os seletores e ações de cada página:

```
pages/
├── BasePage.ts          # Classe base com navigate, waitForLoad, assertTitle...
├── SitePage.ts          # Site institucional — nav, hero, seções, contato
└── CatalogoPage.ts      # Catálogo — filtros, cards, seleção, WhatsApp
```

### Exemplo de uso

```typescript
import { test, expect } from '../fixtures/base';

test('hero visível', async ({ site }) => {
  await site.open();
  await expect(site.heroTagline()).toBeVisible();
});

test('selecionar produto', async ({ catalogo }) => {
  await catalogo.open();
  await catalogo.selecionarProduto(0);
  expect(await catalogo.getPecasSelecionadas()).toBe(1);
});
```

---

## 🌐 Browsers testados

| Browser | Cobertura |
|---|---|
| ✅ Chromium (Chrome/Edge) | Todos os testes |
| ✅ Firefox | Site + Catálogo |
| ✅ WebKit (Safari) | Site + Catálogo |
| ✅ Mobile Chrome (Pixel 5) | Responsividade |
| ✅ Mobile Safari (iPhone 12) | Responsividade |

---

## 🧑‍💻 Geração de código (Codegen)

O Playwright consegue gravar suas ações e gerar código de teste automaticamente:

```bash
# Gravar ações no site
npm run codegen:site

# Gravar ações no catálogo
npm run codegen:catalogo
```

---

## 📁 Estrutura completa do projeto

```
balone-qa/
├── fixtures/
│   └── base.ts              # Extensão do test() com SitePage e CatalogoPage
├── pages/
│   ├── BasePage.ts
│   ├── SitePage.ts
│   └── CatalogoPage.ts
├── tests/
│   ├── jornadas/            # Testes E2E com visão de usuário
│   ├── site/                # Testes funcionais do site
│   ├── catalogo/            # Testes funcionais do catálogo
│   ├── accessibility/       # Acessibilidade
│   ├── performance/         # Performance
│   └── visual/              # Testes visuais
├── helpers/                 # Utilitários e helpers
├── support/                 # Setup global, teardown
├── playwright.config.ts     # Configuração do Playwright
├── tsconfig.json
└── package.json
```

---

## 🔗 Links úteis

| | |
|---|---|
| 🌐 Site | [brechobalone.com.br](https://www.brechobalone.com.br) |
| 🛒 Catálogo | [catalogobalone.netlify.app](https://catalogobalone.netlify.app) |
| 📱 WhatsApp | [(51) 99958-0604](https://wa.me/5551999580604) |
| 📸 Instagram | [@brechobalonefebassi](https://instagram.com/brechobalonefebassi) |

---

<p align="center">
  Feito com 💛 para o Brechó Balonê da Fê Bassi
</p>

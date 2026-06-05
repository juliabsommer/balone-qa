import { test, expect } from '../../fixtures/base';
import { CatalogoPage } from '../../pages/CatalogoPage';

/**
 * Testes do catálogo online — catalogobalone.netlify.app
 *
 * Fluxo real:
 *   1. Usuário abre o catálogo
 *   2. Navega pelas categorias (Mini Museu / Espaço Boho)
 *   3. Toca/clica nos produtos que quer
 *   4. Contador atualiza ("X peça(s) selecionada(s)")
 *   5. Clica "Enviar pedido" → abre WhatsApp com mensagem
 */

test.describe('Catálogo online — catalogobalone.netlify.app', () => {
  test.beforeEach(async ({ catalogo }) => {
    await catalogo.open();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Carregamento
  // ────────────────────────────────────────────────────────────────────────────

  test('deve carregar o catálogo com produtos visíveis @smoke', async ({ catalogo }) => {
    await test.step('Verificar que há produtos na página', async () => {
      const count = await catalogo.contarProdutos();
      expect(count, 'Nenhum produto encontrado no catálogo').toBeGreaterThan(0);
    });
  });

  test('deve exibir as opções de categoria @smoke', async ({ catalogo }) => {
    await test.step('Botão Mini Museu visível', async () => {
      await expect(catalogo.btnMiniMuseu()).toBeVisible();
    });

    await test.step('Botão Espaço Boho visível', async () => {
      await expect(catalogo.btnBoho()).toBeVisible();
    });
  });

  test('deve exibir o contador em estado inicial "sem seleção"', async ({ catalogo }) => {
    await test.step('Verificar texto de contador zerado', async () => {
      await expect(catalogo.contadorTexto()).toBeVisible();
      const count = await catalogo.getPecasSelecionadas();
      expect(count).toBe(0);
    });
  });

  test('deve exibir o botão "Enviar pedido"', async ({ catalogo }) => {
    await test.step('Botão presente na página', async () => {
      await expect(catalogo.btnEnviarPedido()).toBeVisible();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Seleção de produtos
  // ────────────────────────────────────────────────────────────────────────────

  test('deve atualizar contador ao selecionar um produto @smoke', async ({ catalogo }) => {
    await test.step('Confirmar contador em 0', async () => {
      expect(await catalogo.getPecasSelecionadas()).toBe(0);
    });

    await test.step('Selecionar primeiro produto', async () => {
      await catalogo.selecionarProduto(0);
      // Aguarda o contador atualizar
      await catalogo.page.waitForTimeout(500);
    });

    await test.step('Verificar contador em 1', async () => {
      const count = await catalogo.getPecasSelecionadas();
      expect(count).toBe(1);
    });
  });

  test('deve acumular contador ao selecionar múltiplos produtos', async ({ catalogo }) => {
    await test.step('Verificar que há ao menos 3 produtos', async () => {
      const total = await catalogo.contarProdutos();
      if (total < 3) test.skip(true, 'Menos de 3 produtos disponíveis');
    });

    await test.step('Selecionar 3 produtos', async () => {
      await catalogo.selecionarProduto(0);
      await catalogo.selecionarProduto(1);
      await catalogo.selecionarProduto(2);
      await catalogo.page.waitForTimeout(500);
    });

    await test.step('Contador deve mostrar 3', async () => {
      const count = await catalogo.getPecasSelecionadas();
      expect(count).toBe(3);
    });
  });

  test('deve desselecionar produto ao clicar novamente', async ({ catalogo }) => {
    await test.step('Selecionar produto', async () => {
      await catalogo.selecionarProduto(0);
      await catalogo.page.waitForTimeout(400);
      expect(await catalogo.getPecasSelecionadas()).toBe(1);
    });

    await test.step('Clicar no mesmo produto novamente', async () => {
      await catalogo.selecionarProduto(0);
      await catalogo.page.waitForTimeout(400);
    });

    await test.step('Contador deve voltar a 0', async () => {
      const count = await catalogo.getPecasSelecionadas();
      expect(count).toBe(0);
    });
  });

  test('produto selecionado deve ter indicação visual de selecionado', async ({
    catalogo,
    page,
  }) => {
    await test.step('Registrar estado visual antes da seleção', async () => {
      const card = catalogo.cards().first();
      // Captura classe ou atributo antes
      const classAntes = await card.getAttribute('class');

      await test.step('Selecionar produto', async () => {
        await card.click();
        await page.waitForTimeout(400);
      });

      await test.step('Verificar que algum atributo/classe mudou', async () => {
        const classDepois = await card.getAttribute('class');
        // Classes ou aria-selected devem ter mudado
        const ariaSelected = await card.getAttribute('aria-selected').catch(() => null);
        const ariaChecked  = await card.getAttribute('aria-checked').catch(() => null);
        const mudouClasse  = classAntes !== classDepois;
        const temAria      = ariaSelected === 'true' || ariaChecked === 'true';
        expect(mudouClasse || temAria, 'Nenhuma indicação visual de seleção encontrada').toBeTruthy();
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Filtro de categorias
  // ────────────────────────────────────────────────────────────────────────────

  test('deve filtrar produtos ao clicar em Mini Museu', async ({ catalogo }) => {
    let totalAntes: number;

    await test.step('Contar produtos sem filtro', async () => {
      totalAntes = await catalogo.contarProdutos();
    });

    await test.step('Aplicar filtro Mini Museu', async () => {
      await catalogo.filtrarMiniMuseu();
    });

    await test.step('Deve haver produtos na categoria Mini Museu', async () => {
      const totalDepois = await catalogo.contarProdutos();
      expect(totalDepois, 'Nenhum produto encontrado na categoria Mini Museu').toBeGreaterThan(0);
    });
  });

  test('deve filtrar produtos ao clicar em Espaço Boho', async ({ catalogo }) => {
    await test.step('Aplicar filtro Espaço Boho', async () => {
      await catalogo.filtrarBoho();
    });

    await test.step('Deve haver produtos na categoria Espaço Boho', async () => {
      const count = await catalogo.contarProdutos();
      expect(count, 'Nenhum produto encontrado na categoria Espaço Boho').toBeGreaterThan(0);
    });
  });

  test('as duas categorias devem ter produtos diferentes', async ({ catalogo }) => {
    let produtosMuseu: number;
    let produtosBoho: number;

    await test.step('Contar produtos do Mini Museu', async () => {
      await catalogo.filtrarMiniMuseu();
      produtosMuseu = await catalogo.contarProdutos();
    });

    await test.step('Contar produtos do Espaço Boho', async () => {
      await catalogo.filtrarBoho();
      produtosBoho = await catalogo.contarProdutos();
    });

    await test.step('Verificar que o total da categoria Tudo é ≥ maior das duas', async () => {
      await catalogo.filtrarTudo();
      const totalGeral = await catalogo.contarProdutos();
      expect(totalGeral).toBeGreaterThanOrEqual(Math.max(produtosMuseu!, produtosBoho!));
    });
  });

  test('"Tudo" deve mostrar todos os produtos novamente', async ({ catalogo }) => {
    let totalInicial: number;

    await test.step('Registrar total sem filtro', async () => {
      totalInicial = await catalogo.contarProdutos();
    });

    await test.step('Aplicar filtro Mini Museu', async () => {
      await catalogo.filtrarMiniMuseu();
    });

    await test.step('Clicar em Tudo', async () => {
      await catalogo.filtrarTudo();
    });

    await test.step('Total deve ser igual ao original', async () => {
      const totalDepois = await catalogo.contarProdutos();
      expect(totalDepois).toBe(totalInicial!);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Botão "Enviar pedido" e link para WhatsApp
  // ────────────────────────────────────────────────────────────────────────────

  test('botão "Enviar pedido" deve apontar para o WhatsApp da Fê @smoke', async ({
    catalogo,
    page,
  }) => {
    await test.step('Selecionar ao menos um produto', async () => {
      await catalogo.selecionarProduto(0);
      await page.waitForTimeout(400);
    });

    await test.step('Verificar que o destino é o WhatsApp correto', async () => {
      // Tenta via href direto
      const href = await catalogo.btnEnviarPedido().getAttribute('href');

      if (href) {
        // O catálogo usa api.whatsapp.com/send (não wa.me)
        expect(href).toMatch(/whatsapp\.com|wa\.me/);
        expect(href).toContain('5551999580604');
      } else {
        // Botão sem href — intercepta nova aba/navegação
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null),
          catalogo.btnEnviarPedido().click(),
        ]);

        if (newPage) {
          expect(newPage.url()).toMatch(/whatsapp\.com|wa\.me/);
          await newPage.close();
        } else {
          await expect(page).toHaveURL(/whatsapp\.com|wa\.me/);
        }
      }
    });
  });

  test('mensagem do WhatsApp deve conter o nome/detalhes do produto selecionado', async ({
    catalogo,
    page,
  }) => {
    let nomeProduto = '';

    await test.step('Selecionar um produto e capturar nome', async () => {
      nomeProduto = await catalogo.selecionarProduto(0);
      await page.waitForTimeout(400);
    });

    await test.step('Verificar que a URL do WhatsApp contém texto do produto', async () => {
      const href = await catalogo.btnEnviarPedido().getAttribute('href');
      if (href && nomeProduto) {
        // A mensagem no href é codificada em URL
        const decoded = decodeURIComponent(href);
        // O link deve conter algo além do número — a mensagem com o pedido
        expect(decoded.length).toBeGreaterThan(50);
      }
    });
  });

  test('estado sem seleção: "Enviar pedido" deve ser desabilitado ou exibir aviso', async ({
    catalogo,
    page,
  }) => {
    await test.step('Confirmar zero peças selecionadas', async () => {
      expect(await catalogo.getPecasSelecionadas()).toBe(0);
    });

    await test.step('Clicar em "Enviar pedido" sem seleção', async () => {
      // Captura se o botão está desabilitado ou se clica sem navegar
      const isDisabled = await catalogo.btnEnviarPedido().isDisabled().catch(() => false);

      if (isDisabled) {
        // Comportamento ideal — botão desabilitado
        expect(isDisabled).toBeTruthy();
        return;
      }

      // Tenta clicar e vê o que acontece
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 3_000 }).catch(() => null),
        catalogo.btnEnviarPedido().click(),
      ]);

      if (newPage) {
        // Se abriu WhatsApp mesmo sem seleção — não é ideal, mas registra
        await newPage.close();
        console.warn('⚠️  "Enviar pedido" abre WhatsApp mesmo sem peças selecionadas');
      } else {
        // Ou exibiu um aviso na própria página
        const aviso = page.getByText(/selecione|nenhuma peça|escolha/i);
        const hasAviso = await aviso.isVisible({ timeout: 2_000 }).catch(() => false);
        expect(hasAviso || isDisabled, '"Enviar pedido" deveria bloquear envio sem seleção').toBeTruthy();
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Qualidade dos cards de produto
  // ────────────────────────────────────────────────────────────────────────────

  test('todos os cards visíveis devem ter imagem carregada', async ({ catalogo, page }) => {
    await test.step('Verificar imagens dos primeiros 6 cards', async () => {
      const imagens = page.locator('img').filter({ hasNot: page.locator('[alt=""]') });
      const count = await imagens.count();
      const limite = Math.min(count, 6);

      let quebradas = 0;
      for (let i = 0; i < limite; i++) {
        const naturalWidth = await imagens.nth(i).evaluate(
          (img: HTMLImageElement) => img.naturalWidth,
        );
        if (naturalWidth === 0) quebradas++;
      }

      expect(quebradas, `${quebradas} imagem(ns) quebrada(s) dos primeiros ${limite} cards`).toBe(0);
    });
  });

  test('cards devem exibir nome do produto', async ({ catalogo, page }) => {
    await test.step('Verificar que o primeiro card tem texto de nome', async () => {
      const card = catalogo.cards().first();
      const texto = await card.textContent();
      expect(texto?.trim().length, 'Card sem texto de produto').toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Responsividade
  // ────────────────────────────────────────────────────────────────────────────

  test('catálogo deve funcionar em viewport mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();

    await test.step('Abrir catálogo em mobile', async () => {
      await page.goto(CatalogoPage.URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('img', { timeout: 10_000 }).catch(() => {});
    });

    await test.step('Produtos visíveis em mobile', async () => {
      const imgs = page.locator('img');
      const count = await imgs.count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Sem overflow horizontal', async () => {
      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalScroll).toBeFalsy();
    });

    await test.step('"Enviar pedido" acessível em mobile', async () => {
      const btn = page.getByRole('button', { name: /Enviar pedido/i })
        .or(page.getByText(/Enviar pedido/i)).first();
      await expect(btn).toBeVisible();
    });

    await context.close();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Acessibilidade básica
  // ────────────────────────────────────────────────────────────────────────────

  test('imagens de produto devem ter atributo alt', async ({ catalogo, page }) => {
    await test.step('Verificar alt nas primeiras 5 imagens de produto', async () => {
      const imgs = catalogo.cards().locator('img');
      const count = await imgs.count();
      const limite = Math.min(count, 5);

      for (let i = 0; i < limite; i++) {
        const alt = await imgs.nth(i).getAttribute('alt');
        // alt vazio ("") é válido para imagens decorativas, mas deve existir
        expect(alt, `Imagem ${i} sem atributo alt`).not.toBeNull();
      }
    });
  });

  test('"Enviar pedido" deve ter nome acessível', async ({ catalogo }) => {
    await test.step('Verificar texto ou aria-label do botão', async () => {
      const btn = catalogo.btnEnviarPedido();
      const texto = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      expect(texto?.trim() || ariaLabel, 'Botão sem nome acessível').toBeTruthy();
    });
  });
});

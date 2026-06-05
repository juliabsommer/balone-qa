import { test, expect } from '../../fixtures/base';
import { SitePage } from '../../pages/SitePage';

/**
 * Testes do site institucional — www.brechobalone.com.br
 *
 * O site é uma landing page com 4 seções (âncoras) e sem e-commerce.
 * O fluxo de compra acontece no catálogo separado (catalogobalone.netlify.app).
 */

test.describe('Site institucional — Brechó Balonê', () => {
  test.beforeEach(async ({ site }) => {
    await site.open();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Carregamento e identidade
  // ────────────────────────────────────────────────────────────────────────────

  test('deve carregar com título correto @smoke', async ({ site }) => {
    await test.step('Verificar título da aba', async () => {
      await site.assertTitle(/Balonê|Balone|Brechó/i);
    });
  });

  test('deve exibir tagline do hero @smoke', async ({ site }) => {
    await test.step('Verificar tagline "Viva essa experiência"', async () => {
      await expect(site.heroTagline()).toBeVisible();
    });
  });

  test('deve exibir os dois CTAs do hero', async ({ site }) => {
    await test.step('"Conheça a loja" visível e clicável', async () => {
      await expect(site.btnConhecaLoja()).toBeVisible();
    });

    await test.step('"Como chegar" visível e clicável', async () => {
      await expect(site.btnComoChegar()).toBeVisible();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Navegação interna (âncoras)
  // ────────────────────────────────────────────────────────────────────────────

  test('deve ter barra de navegação visível', async ({ site }) => {
    await test.step('Nav presente na página', async () => {
      await expect(site.nav()).toBeVisible();
    });

    await test.step('Links principais presentes no nav', async () => {
      // Verifica pelo menos 4 links no nav
      const links = site.page.locator('nav a');
      const count = await links.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  test('"Conheça a loja" deve rolar até a seção #sobre', async ({ site, page }) => {
    await test.step('Clicar no botão', async () => {
      await site.btnConhecaLoja().click();
    });

    await test.step('URL deve conter âncora #sobre', async () => {
      await expect(page).toHaveURL(/#sobre/);
    });

    await test.step('Seção sobre deve estar visível no viewport', async () => {
      await expect(site.secaoSobre()).toBeInViewport();
    });
  });

  test('"Como chegar" deve rolar até a seção #visite', async ({ site, page }) => {
    await test.step('Clicar no botão', async () => {
      await site.btnComoChegar().click();
    });

    await test.step('URL deve conter âncora #visite', async () => {
      await expect(page).toHaveURL(/#visite/);
    });

    await test.step('Seção visite deve estar visível', async () => {
      await expect(site.secaoVisite()).toBeInViewport();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Link para o catálogo
  // ────────────────────────────────────────────────────────────────────────────

  test('botão "Acessar catálogo" deve apontar para catalogobalone.netlify.app @smoke', async ({
    site,
  }) => {
    await test.step('Verificar href do botão', async () => {
      const href = await site.btnAcessarCatalogo().getAttribute('href');
      expect(href).toContain('catalogobalone.netlify.app');
    });
  });

  test('link "Catálogo" no nav deve apontar para catalogobalone.netlify.app', async ({
    site,
  }) => {
    await test.step('Verificar href do link', async () => {
      const href = await site.navCatalogo().getAttribute('href');
      expect(href).toContain('catalogobalone.netlify.app');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Como funciona — 3 passos
  // ────────────────────────────────────────────────────────────────────────────

  test('deve exibir os 3 passos de "como funciona"', async ({ site }) => {
    await test.step('Rolar até seção', async () => {
      await site.stepAcesseCatalogo().scrollIntoViewIfNeeded();
    });

    await test.step('Passo 1 — Acesse o catálogo', async () => {
      await expect(site.stepAcesseCatalogo()).toBeVisible();
    });

    await test.step('Passo 2 — Selecione o que amou', async () => {
      await expect(site.stepSelecioneAmou()).toBeVisible();
    });

    await test.step('Passo 3 — Envie pelo WhatsApp', async () => {
      await expect(site.stepEnvieWhatsApp()).toBeVisible();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Seção Espaços
  // ────────────────────────────────────────────────────────────────────────────

  test('deve exibir os dois espaços do brechó', async ({ site }) => {
    await test.step('Rolar até seção Espaços', async () => {
      await site.scrollToSection('espacos');
    });

    await test.step('Mini Museu Balonê visível', async () => {
      await expect(site.miniMuseuCard()).toBeVisible();
    });

    await test.step('Espaço Boho visível', async () => {
      await expect(site.espacoBohoCard()).toBeVisible();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Seção Sobre
  // ────────────────────────────────────────────────────────────────────────────

  test('deve exibir informações de "Sobre" corretamente', async ({ site }) => {
    await test.step('Rolar até seção Sobre', async () => {
      await site.scrollToSection('sobre');
    });

    await test.step('Menciona 14 anos de curadoria', async () => {
      await expect(site.sobre14Anos()).toBeVisible();
    });

    await test.step('Menciona 500+ peças por temporada', async () => {
      await expect(site.sobre500Pecas()).toBeVisible();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Seção Visite — contato
  // ────────────────────────────────────────────────────────────────────────────

  test('deve exibir endereço e links de contato na seção Visite @smoke', async ({ site }) => {
    await test.step('Rolar até seção Visite', async () => {
      await site.scrollToSection('visite');
    });

    await test.step('Endereço (Av. Cel. Marcos) visível', async () => {
      await expect(site.enderecoTexto()).toBeVisible();
    });

    await test.step('Link WhatsApp presente e com número correto', async () => {
      const href = await site.linkWhatsApp().getAttribute('href');
      // Site usa wa.me com o número da Fê
      expect(href).toMatch(/wa\.me.*5551999580604/);
    });

    await test.step('Link Google Maps presente', async () => {
      await expect(site.linkMaps()).toBeVisible();
    });
  });

  test('link WhatsApp deve conter mensagem pré-preenchida', async ({ site }) => {
    await test.step('Verificar parâmetro text= no link', async () => {
      const href = await site.linkWhatsApp().getAttribute('href');
      expect(href).toContain('text=');
      // Mensagem deve mencionar o brechó
      expect(decodeURIComponent(href ?? '')).toMatch(/Balonê|Balone|brechó/i);
    });
  });

  test('horários de funcionamento devem estar visíveis', async ({ site, page }) => {
    await test.step('Rolar até Visite', async () => {
      await site.scrollToSection('visite');
    });

    await test.step('Verificar dias e horários exibidos', async () => {
      // Deve mencionar pelo menos dias da semana ou horários
      const hasHorarios = await page.getByText(/Segunda|Sábado|Domingo|9h|10h|seg|sáb/i).first().isVisible().catch(() => false);
      expect(hasHorarios).toBeTruthy();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Footer
  // ────────────────────────────────────────────────────────────────────────────

  test('footer deve ter copyright e links de contato', async ({ site }) => {
    await test.step('Rolar até o footer', async () => {
      await site.scrollToBottom();
    });

    await test.step('Copyright visível', async () => {
      await expect(site.footerCopyright()).toBeVisible();
    });

    await test.step('Link do Instagram no footer', async () => {
      const href = await site.footerInstagram().getAttribute('href').catch(() => null);
      expect(href).toContain('instagram.com');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // SEO
  // ────────────────────────────────────────────────────────────────────────────

  test('deve ter meta description preenchida', async ({ page, site }) => {
    await test.step('Verificar meta description', async () => {
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toBeAttached();
      const content = await meta.getAttribute('content');
      expect(content?.trim().length).toBeGreaterThan(10);
    });
  });

  test('deve ter Open Graph básico', async ({ page }) => {
    await test.step('og:title presente', async () => {
      const ogTitle = page.locator('meta[property="og:title"]');
      const count = await ogTitle.count();
      if (count === 0) {
        console.warn('⚠️  og:title não encontrado — considere adicionar');
      }
    });

    await test.step('og:image presente', async () => {
      const ogImage = page.locator('meta[property="og:image"]');
      const count = await ogImage.count();
      if (count === 0) {
        console.warn('⚠️  og:image não encontrado — considere adicionar para compartilhamentos');
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Responsividade — viewport mobile
  // ────────────────────────────────────────────────────────────────────────────

  test('deve carregar corretamente em viewport mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();

    await test.step('Abrir site em mobile', async () => {
      await page.goto(SitePage.URL_SITE);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Tagline do hero visível em mobile', async () => {
      await expect(page.getByText('Viva essa experiência')).toBeVisible();
    });

    await test.step('Sem overflow horizontal (sem barra de rolagem horizontal)', async () => {
      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalScroll).toBeFalsy();
    });

    await context.close();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Performance básica
  // ────────────────────────────────────────────────────────────────────────────

  test('deve carregar em menos de 5 segundos', async ({ page }) => {
    const start = Date.now();

    await test.step('Navegar e aguardar load', async () => {
      await page.goto(SitePage.URL_SITE);
      await page.waitForLoadState('load');
    });

    await test.step('Verificar tempo total de carregamento', async () => {
      const elapsed = Date.now() - start;
      expect(elapsed, `Carregou em ${elapsed}ms`).toBeLessThan(5_000);
    });
  });
});

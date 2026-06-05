import { test, expect } from '../../../fixtures/base';
import { generateNewsletterEmail } from '../../../helpers/data.helper';
import { env } from '../../../helpers/env';

// ─────────────────────────────────────────────────────────────────────────────
// NEWSLETTER
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Newsletter @low', () => {
  // ── 1. Inscrição com sucesso ──────────────────────────────────────────────────
  test('deve inscrever e-mail válido na newsletter', async ({ homePage }) => {
    const email = generateNewsletterEmail();

    await test.step('Abrir home e rolar até seção de newsletter', async () => {
      await homePage.open();
      await homePage.newsletterSection().scrollIntoViewIfNeeded();
    });

    await test.step('Preencher e-mail e submeter', async () => {
      await homePage.subscribeNewsletter(email);
    });

    await test.step('Verificar mensagem de sucesso', async () => {
      await homePage.assertNewsletterSuccess();
      await expect(homePage.newsletterSuccess()).toContainText(/obrigad|inscrit|sucesso/i);
    });

    await test.step('Verificar que campo de e-mail foi limpo ou desabilitado', async () => {
      const input = homePage.newsletterEmail();
      const isDisabled = await input.isDisabled().catch(() => false);
      const value      = await input.inputValue().catch(() => '');
      const isCleared  = value === '';
      expect(isDisabled || isCleared).toBeTruthy();
    });
  });

  // ── 2. Rejeitar e-mail inválido ───────────────────────────────────────────────
  test('deve exibir erro para e-mail inválido na newsletter', async ({ homePage, page }) => {
    await test.step('Abrir home', async () => {
      await homePage.open();
      await homePage.newsletterSection().scrollIntoViewIfNeeded();
    });

    await test.step('Submeter e-mail malformado', async () => {
      await homePage.newsletterEmail().fill('email-invalido-sem-arroba');
      await homePage.newsletterSubmit().click();
    });

    await test.step('Verificar mensagem de e-mail inválido', async () => {
      const error = page.getByTestId('newsletter-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/e-mail inválido|formato inválido/i);
    });

    await test.step('Verificar que a mensagem de sucesso NÃO apareceu', async () => {
      await expect(homePage.newsletterSuccess()).toBeHidden();
    });
  });

  // ── 3. Bloquear e-mail já cadastrado ─────────────────────────────────────────
  test('deve informar que e-mail já está inscrito na newsletter', async ({ homePage, page }) => {
    const alreadySubscribedEmail = env.testUserEmail;

    await test.step('Abrir home e submeter e-mail já cadastrado', async () => {
      await homePage.open();
      await homePage.newsletterSection().scrollIntoViewIfNeeded();
      await homePage.subscribeNewsletter(alreadySubscribedEmail);
    });

    await test.step('Verificar mensagem de "já inscrito"', async () => {
      const message = page.getByTestId('newsletter-already-subscribed');
      const isAlreadyMsg = await message.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!isAlreadyMsg) {
        // Pode ser exibido como erro ou info
        const error = page.getByTestId('newsletter-error');
        await expect(error).toContainText(/já cadastrado|já inscrito/i);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEO
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SEO @low', () => {
  // ── 4. Título da página ───────────────────────────────────────────────────────
  test('deve ter título de página correto na home', async ({ homePage, page }) => {
    await test.step('Abrir home', async () => {
      await homePage.open();
    });

    await test.step('Verificar título da página', async () => {
      await expect(page).toHaveTitle(/Brechó Balone|Balone/i);
    });

    await test.step('Título deve ter entre 10 e 60 caracteres', async () => {
      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThanOrEqual(60);
    });
  });

  // ── 5. Meta description ───────────────────────────────────────────────────────
  test('deve ter meta description na home', async ({ homePage, page }) => {
    await test.step('Abrir home', async () => {
      await homePage.open();
    });

    await test.step('Verificar presença e conteúdo da meta description', async () => {
      const metaDesc = page.locator('meta[name="description"]');
      await expect(metaDesc).toBeAttached();
      const content = await metaDesc.getAttribute('content');
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(50);
      expect(content!.length).toBeLessThanOrEqual(160);
    });
  });

  // ── 6. Open Graph tags ────────────────────────────────────────────────────────
  test('deve ter Open Graph tags corretas', async ({ homePage, page }) => {
    await test.step('Abrir home', async () => {
      await homePage.open();
    });

    await test.step('Verificar og:title', async () => {
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toBeAttached();
      expect(await ogTitle.getAttribute('content')).toBeTruthy();
    });

    await test.step('Verificar og:description', async () => {
      const ogDesc = page.locator('meta[property="og:description"]');
      await expect(ogDesc).toBeAttached();
      expect(await ogDesc.getAttribute('content')).toBeTruthy();
    });

    await test.step('Verificar og:image com URL absoluta', async () => {
      const ogImage = page.locator('meta[property="og:image"]');
      await expect(ogImage).toBeAttached();
      const src = await ogImage.getAttribute('content');
      expect(src).toMatch(/^https?:\/\//);
    });

    await test.step('Verificar og:url', async () => {
      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toBeAttached();
      const url = await ogUrl.getAttribute('content');
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  // ── 7. Canonical link ─────────────────────────────────────────────────────────
  test('deve ter tag canonical correta', async ({ homePage, page }) => {
    await test.step('Abrir home', async () => {
      await homePage.open();
    });

    await test.step('Verificar canonical aponta para a URL correta', async () => {
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toBeAttached();
      const href = await canonical.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
    });

    await test.step('Verificar canonical na página de produto', async () => {
      await page.goto('/catalogo');
      await page.getByTestId('product-card').first().click();
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toBeAttached();
      const href = await canonical.getAttribute('href');
      expect(href).toContain('/produto/');
    });
  });

  // ── 8. JSON-LD Schema ─────────────────────────────────────────────────────────
  test('deve ter JSON-LD de produto na página de detalhe', async ({ page }) => {
    await test.step('Abrir página de produto', async () => {
      await page.goto('/catalogo');
      await page.getByTestId('product-card').first().click();
    });

    await test.step('Verificar presença de script JSON-LD', async () => {
      const jsonLd = page.locator('script[type="application/ld+json"]');
      await expect(jsonLd).toBeAttached();
    });

    await test.step('Verificar estrutura do JSON-LD de produto', async () => {
      const content = await page.locator('script[type="application/ld+json"]').textContent();
      expect(content).toBeTruthy();
      const schema = JSON.parse(content!);
      // Aceita array de schemas ou schema único
      const productSchema = Array.isArray(schema)
        ? schema.find((s: any) => s['@type'] === 'Product')
        : schema['@type'] === 'Product' ? schema : null;

      expect(productSchema).toBeTruthy();
      expect(productSchema.name).toBeTruthy();
      expect(productSchema.offers).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPARTILHAMENTO SOCIAL
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Compartilhamento social @low', () => {
  // ── 9. Botões de compartilhamento visíveis ────────────────────────────────────
  test('deve exibir botões de compartilhamento na página do produto', async ({ page }) => {
    await test.step('Abrir página de produto', async () => {
      await page.goto('/catalogo');
      await page.getByTestId('product-card').first().click();
    });

    await test.step('Verificar botão de compartilhar', async () => {
      const shareBtn = page.getByTestId('share-button');
      await expect(shareBtn).toBeVisible();
    });

    await test.step('Clicar em compartilhar e verificar opções', async () => {
      await page.getByTestId('share-button').click();
      const shareMenu = page.getByTestId('share-menu');
      const hasMenu = await shareMenu.isVisible({ timeout: 3_000 }).catch(() => false);
      if (hasMenu) {
        // Verificar opções de redes sociais
        const shareOptions = page.getByTestId('share-option');
        const count = await shareOptions.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  // ── 10. Copiar link do produto ────────────────────────────────────────────────
  test('deve copiar link do produto para a área de transferência', async ({ page, context }) => {
    await test.step('Conceder permissão de escrita no clipboard', async () => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    });

    await test.step('Abrir produto e abrir menu de compartilhamento', async () => {
      await page.goto('/catalogo');
      await page.getByTestId('product-card').first().click();
      const shareBtn = page.getByTestId('share-button');
      if (await shareBtn.isVisible()) await shareBtn.click();
    });

    await test.step('Clicar em "Copiar link"', async () => {
      const copyLink = page.getByTestId('share-copy-link');
      const hasCopyLink = await copyLink.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasCopyLink) test.skip(true, 'Botão "copiar link" não implementado');
      await copyLink.click();
    });

    await test.step('Verificar feedback visual de "copiado"', async () => {
      const copiedMsg = page.getByTestId('copy-link-success');
      await expect(copiedMsg).toBeVisible({ timeout: 3_000 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CHAT / SUPORTE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chat e suporte @low', () => {
  // ── 11. Abrir widget de chat ──────────────────────────────────────────────────
  test('deve abrir widget de chat ao clicar no botão de suporte', async ({ homePage, page }) => {
    await test.step('Abrir home', async () => {
      await homePage.open();
    });

    await test.step('Localizar e clicar no botão de chat/suporte', async () => {
      const chatBtn = page.getByTestId('chat-support-button');
      const hasChatBtn = await chatBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasChatBtn) test.skip(true, 'Widget de chat não implementado');
      await chatBtn.click();
    });

    await test.step('Verificar que widget abre', async () => {
      const chatWidget = page.getByTestId('chat-widget');
      await expect(chatWidget).toBeVisible({ timeout: 5_000 });
    });

    await test.step('Verificar mensagem de boas-vindas no chat', async () => {
      const welcomeMsg = page.getByTestId('chat-welcome-message');
      await expect(welcomeMsg).toBeVisible();
    });
  });

  // ── 12. Accordion de FAQ ──────────────────────────────────────────────────────
  test('deve expandir e recolher itens do accordion de FAQ', async ({ page }) => {
    await test.step('Navegar para a página de FAQ', async () => {
      await page.goto('/faq');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verificar que há perguntas no accordion', async () => {
      const faqItems = page.getByTestId('faq-item');
      const count = await faqItems.count();
      if (count === 0) test.skip(true, 'Página de FAQ sem itens');
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Clicar na primeira pergunta e verificar expansão', async () => {
      const firstQuestion = page.getByTestId('faq-question').first();
      const firstAnswer   = page.getByTestId('faq-answer').first();

      // Resposta começa oculta
      await expect(firstAnswer).toBeHidden();

      await firstQuestion.click();
      await expect(firstAnswer).toBeVisible();
    });

    await test.step('Clicar novamente para recolher', async () => {
      const firstQuestion = page.getByTestId('faq-question').first();
      const firstAnswer   = page.getByTestId('faq-answer').first();

      await firstQuestion.click();
      await expect(firstAnswer).toBeHidden();
    });

    await test.step('Verificar que apenas uma resposta fica aberta por vez', async () => {
      const questions = page.getByTestId('faq-question');
      const count = await questions.count();
      if (count < 2) return;

      await questions.first().click();
      await questions.nth(1).click();

      const openAnswers = page.getByTestId('faq-answer').filter({ hasText: /.+/ });
      const visibleCount = await openAnswers.evaluateAll((els) =>
        els.filter((el) => !(el as HTMLElement).hidden && el.getBoundingClientRect().height > 0).length,
      );
      expect(visibleCount).toBeLessThanOrEqual(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BANNER PROMOCIONAL
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Banner promocional @low', () => {
  // ── 13. Exibir banner ao carregar ─────────────────────────────────────────────
  test('deve exibir banner promocional na home', async ({ homePage, page }) => {
    await test.step('Abrir home', async () => {
      await homePage.open();
    });

    await test.step('Verificar visibilidade do banner', async () => {
      const banner = page.getByTestId('promo-banner');
      const hasBanner = await banner.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasBanner) test.skip(true, 'Nenhum banner ativo no momento');
      await expect(banner).toBeVisible();
    });

    await test.step('Verificar que banner tem conteúdo', async () => {
      const bannerText = await page.getByTestId('promo-banner').textContent();
      expect(bannerText?.trim().length).toBeGreaterThan(0);
    });
  });

  // ── 14. Fechar banner ─────────────────────────────────────────────────────────
  test('deve fechar banner ao clicar no botão de fechar', async ({ homePage, page }) => {
    await test.step('Abrir home e verificar banner', async () => {
      await homePage.open();
      const banner = page.getByTestId('promo-banner');
      const hasBanner = await banner.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasBanner) test.skip(true, 'Nenhum banner ativo');
    });

    await test.step('Clicar no botão fechar', async () => {
      const closeBtn = page.getByTestId('promo-banner-close');
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
    });

    await test.step('Verificar que banner desapareceu', async () => {
      await expect(page.getByTestId('promo-banner')).toBeHidden();
    });
  });

  // ── 15. Banner não reaparece após ser fechado (cookie/localStorage) ───────────
  test('deve manter banner fechado após recarregar a página', async ({ homePage, page }) => {
    await test.step('Abrir home e fechar banner', async () => {
      await homePage.open();
      const banner   = page.getByTestId('promo-banner');
      const closeBtn = page.getByTestId('promo-banner-close');

      const hasBanner = await banner.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasBanner) test.skip(true, 'Nenhum banner ativo');

      await closeBtn.click();
      await expect(banner).toBeHidden();
    });

    await test.step('Recarregar a página', async () => {
      await page.reload();
      await homePage.waitForLoad();
    });

    await test.step('Verificar que banner permanece fechado', async () => {
      const banner = page.getByTestId('promo-banner');
      await expect(banner).toBeHidden();
    });
  });
});

import { test, expect } from '../../fixtures/base';
import { SitePage } from '../../pages/SitePage';

/**
 * Jornada: Primeira visita ao site
 *
 * Persona: Ana, 28 anos, ouviu falar do Brechó Balonê no Instagram
 * e acessa o site pela primeira vez para entender o que é a loja.
 *
 * Ela quer saber:
 *   → O que é o brechó?
 *   → O que tem lá?
 *   → Como funciona a compra?
 *   → Onde fica?
 *   → Como entrar em contato?
 */

test.describe('Jornada: Primeira visita ao site', () => {

  test('Ana descobre o brechó e entende a proposta', async ({ site, page }) => {

    await test.step('Ana acessa o site pela primeira vez', async () => {
      await site.open();
    });

    await test.step('Ela vê a mensagem principal da loja imediatamente', async () => {
      await expect(site.heroTagline()).toBeVisible();
      // A proposta da loja deve estar clara no hero
      const texto = await site.heroTagline().textContent();
      expect(texto?.trim()).toBeTruthy();
    });

    await test.step('Ela quer conhecer melhor — clica em "Conheça a loja"', async () => {
      await site.btnConhecaLoja().click();
      await site.scrollToSection('sobre');
      // Rola um pouco mais para as estatísticas entrarem no viewport
      await site.page.evaluate(() => window.scrollBy(0, 400));
    });

    await test.step('A página rola e ela lê sobre os 14 anos de curadoria', async () => {
      await expect(site.sobre14Anos()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Ela descobre que a loja tem 500+ peças por temporada', async () => {
      await expect(site.sobre500Pecas()).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Ela entende que há dois espaços diferentes na loja', async () => {
      await site.scrollToSection('espacos');
      await expect(site.miniMuseuCard()).toBeVisible();
      await expect(site.espacoBohoCard()).toBeVisible();
    });

  });


  test('Ana entende como funciona a compra antes de ir ao catálogo', async ({ site }) => {

    await test.step('Ana abre o site', async () => {
      await site.open();
    });

    await test.step('Ela procura entender como comprar', async () => {
      await site.stepAcesseCatalogo().scrollIntoViewIfNeeded();
    });

    await test.step('Passo 1: ela vê que precisa acessar o catálogo', async () => {
      await expect(site.stepAcesseCatalogo()).toBeVisible();
    });

    await test.step('Passo 2: ela entende que vai selecionar o que amou', async () => {
      await expect(site.stepSelecioneAmou()).toBeVisible();
    });

    await test.step('Passo 3: ela descobre que o pedido é enviado pelo WhatsApp', async () => {
      await expect(site.stepEnvieWhatsApp()).toBeVisible();
    });

    await test.step('Agora ela está pronta para ir ao catálogo', async () => {
      await expect(site.btnAcessarCatalogo()).toBeVisible();
      const href = await site.btnAcessarCatalogo().getAttribute('href');
      expect(href).toContain('catalogobalone.netlify.app');
    });

  });


  test('Ana quer visitar a loja física e busca o endereço', async ({ site, page }) => {

    await test.step('Ana abre o site', async () => {
      await site.open();
    });

    await test.step('Ela clica em "Como chegar"', async () => {
      await site.btnComoChegar().click();
    });

    await test.step('A página rola direto para as informações de visita', async () => {
      await expect(site.secaoVisite()).toBeInViewport();
    });

    await test.step('Ela encontra o endereço completo da loja', async () => {
      await expect(site.enderecoTexto()).toBeVisible();
      const endereco = await site.enderecoTexto().textContent();
      expect(endereco).toContain('2353');
    });

    await test.step('Ela verifica os horários de funcionamento', async () => {
      const horarios = page.getByText(/seg|segunda|sáb|sábado|dom|domingo|9h|10h|18h/i).first();
      await expect(horarios).toBeVisible();
    });

    await test.step('Ela clica para abrir no Maps sem sair do site (target blank)', async () => {
      const mapsLink = site.linkMaps();
      const target = await mapsLink.getAttribute('target');
      // Link deve abrir em nova aba para não perder o site
      expect(target).toBe('_blank');
    });

  });


  test('Ana quer falar com a Fê antes de comprar', async ({ site }) => {

    await test.step('Ana abre o site', async () => {
      await site.open();
    });

    await test.step('Ela localiza o link de WhatsApp', async () => {
      await site.scrollToSection('visite');
      await expect(site.linkWhatsApp()).toBeVisible();
    });

    await test.step('O link abre conversa com o número certo da loja', async () => {
      const href = await site.linkWhatsApp().getAttribute('href');
      expect(href).toContain('5551999580604');
    });

    await test.step('A mensagem já vem pré-preenchida para facilitar', async () => {
      const href = await site.linkWhatsApp().getAttribute('href');
      const mensagem = decodeURIComponent(href ?? '');
      expect(mensagem).toContain('text=');
      // Deve mencionar o brechó na mensagem
      expect(mensagem).toMatch(/Balonê|Balone/i);
    });

  });


  test('Ana acessa pelo celular no ônibus e o site funciona normalmente', async ({ browser }) => {
    const context = await browser.newContext({
      viewport:  { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      isMobile:  true,
    });
    const page = await context.newPage();

    await test.step('Ana abre o site no iPhone', async () => {
      await page.goto(SitePage.URL_SITE);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('A mensagem principal aparece normalmente na tela pequena', async () => {
      await expect(page.getByText('Viva essa experiência')).toBeVisible();
    });

    await test.step('Não tem barra de rolagem horizontal — site não "vaza" pra fora', async () => {
      const vazando = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(vazando).toBeFalsy();
    });

    await test.step('O botão de WhatsApp está acessível no mobile', async () => {
      const whatsapp = page.locator('a[href*="wa.me"]').first();
      await whatsapp.scrollIntoViewIfNeeded();
      await expect(whatsapp).toBeVisible();
    });

    await context.close();
  });

});

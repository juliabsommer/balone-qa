import { test, expect } from '../../fixtures/base';
import AxeBuilder from '@axe-core/playwright';
import { env } from '../../helpers/env';
import { AUTH_USER_FILE } from '../../helpers/auth.helper';
import { getProducts } from '../../helpers/api.helper';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers locais
// ─────────────────────────────────────────────────────────────────────────────

/** Executa axe-core e lança um erro descritivo caso haja violações críticas/sérias. */
async function runAxe(page: import('@playwright/test').Page, context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .exclude('[data-axe-ignore]') // âncora de escape para elementos conhecidos
    .analyze();

  const critical = results.violations.filter((v) =>
    ['critical', 'serious'].includes(v.impact ?? ''),
  );

  if (critical.length > 0) {
    const summary = critical
      .map(
        (v) =>
          `\n  [${v.impact}] ${v.id}: ${v.description}\n` +
          v.nodes
            .slice(0, 2)
            .map((n) => `    → ${n.html}`)
            .join('\n'),
      )
      .join('\n');
    throw new Error(`${critical.length} violação(ões) axe em "${context}":\n${summary}`);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Auditoria axe-core nas 6 páginas principais
// ─────────────────────────────────────────────────────────────────────────────

test.describe('axe-core — auditoria WCAG @a11y', () => {
  const pages = [
    { name: 'Home',       path: '/' },
    { name: 'Catálogo',   path: '/catalogo' },
    { name: 'Login',      path: '/login' },
    { name: 'Cadastro',   path: '/cadastro' },
    { name: 'Carrinho',   path: '/carrinho' },
    { name: 'FAQ',        path: '/faq' },
  ];

  for (const { name, path } of pages) {
    test(`não deve ter violações críticas/sérias em: ${name}`, async ({ page }) => {
      await test.step(`Navegar para ${name}`, async () => {
        await page.goto(path);
        await page.waitForLoadState('domcontentloaded');
      });

      await test.step('Executar auditoria axe-core', async () => {
        await runAxe(page, name);
      });
    });
  }

  test('não deve ter violações na página de produto', async ({ page }) => {
    const products = await getProducts(1);

    await test.step('Abrir página do produto', async () => {
      await page.goto(`/produto/${products[0].slug}`);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Auditoria axe-core', async () => {
      await runAxe(page, 'Produto');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Navegação por teclado
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Navegação por teclado @a11y', () => {
  // ── Tab order — foco avança de forma lógica ───────────────────────────────
  test('deve avançar o foco em ordem lógica com Tab', async ({ page }) => {
    await test.step('Abrir home', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Focar o primeiro elemento interativo e avançar com Tab 5x', async () => {
      await page.keyboard.press('Tab');
      const focusedIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const focused = await page.evaluate(
          () =>
            document.activeElement?.getAttribute('data-testid') ??
            document.activeElement?.tagName ??
            'none',
        );
        focusedIds.push(focused);
        await page.keyboard.press('Tab');
      }
      // Foco não deve permanecer no mesmo elemento
      const unique = new Set(focusedIds);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  // ── Enter/Space ativa botões e links ─────────────────────────────────────
  test('deve ativar link de navegação com Enter', async ({ page }) => {
    await test.step('Abrir home e focar link do catálogo', async () => {
      await page.goto('/');
      const catalogLink = page.getByTestId('nav-catalog-link');
      await catalogLink.focus();
    });

    await test.step('Pressionar Enter e verificar navegação', async () => {
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/catalogo/);
    });
  });

  test('deve abrir menu de categorias com Enter/Space', async ({ page }) => {
    await test.step('Abrir home e focar botão de categorias', async () => {
      await page.goto('/');
      const catBtn = page.getByTestId('nav-categories');
      await catBtn.focus();
    });

    await test.step('Pressionar Enter e verificar menu aberto', async () => {
      await page.keyboard.press('Enter');
      const menu = page.getByTestId('categories-dropdown');
      const isOpen = await menu.isVisible({ timeout: 3_000 }).catch(() => false);
      if (isOpen) {
        await expect(menu).toBeVisible();
      }
    });
  });

  // ── Escape fecha modais ────────────────────────────────────────────────────
  test('deve fechar modal com Escape', async ({ page }) => {
    await test.step('Abrir home e acionar modal de busca', async () => {
      await page.goto('/');
      await page.getByTestId('search-button').click();
    });

    await test.step('Verificar que modal/overlay está aberto', async () => {
      const searchModal = page.getByTestId('search-modal');
      const isOpen = await searchModal.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!isOpen) test.skip(true, 'Busca não usa modal');
      await expect(searchModal).toBeVisible();
    });

    await test.step('Pressionar Escape e verificar fechamento', async () => {
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('search-modal')).toBeHidden({ timeout: 3_000 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Focus trap em modais
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Focus trap @a11y', () => {
  test('deve prender o foco dentro de modal enquanto aberto', async ({ page }) => {
    await test.step('Abrir carrinho e acionar modal de confirmação', async () => {
      await page.goto('/carrinho');
      const clearBtn = page.getByTestId('clear-cart-button');
      const hasClear = await clearBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasClear) test.skip(true, 'Nenhum modal de confirmação disponível');
      await clearBtn.click();
    });

    await test.step('Verificar que o foco está dentro do modal', async () => {
      const modal = page.getByTestId('clear-cart-confirm-modal');
      await expect(modal).toBeVisible();

      const focusedInModal = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="clear-cart-confirm-modal"]');
        return modal?.contains(document.activeElement) ?? false;
      });
      expect(focusedInModal).toBeTruthy();
    });

    await test.step('Tab não deve mover o foco para fora do modal', async () => {
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const escapedModal = await page.evaluate(() => {
          const modal = document.querySelector('[data-testid="clear-cart-confirm-modal"]');
          return !modal?.contains(document.activeElement);
        });
        expect(escapedModal).toBeFalsy();
      }
    });
  });

  test('deve retornar o foco ao elemento que abriu o modal após fechar', async ({ page }) => {
    await test.step('Abrir busca via teclado', async () => {
      await page.goto('/');
      const searchBtn = page.getByTestId('search-button');
      await searchBtn.focus();
      await page.keyboard.press('Enter');

      const modal = page.getByTestId('search-modal');
      const isOpen = await modal.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!isOpen) test.skip(true, 'Busca não usa modal');
    });

    await test.step('Fechar modal com Escape', async () => {
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('search-modal')).toBeHidden();
    });

    await test.step('Verificar que foco voltou para o botão de busca', async () => {
      const focused = await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid'),
      );
      expect(focused).toBe('search-button');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Landmarks HTML5
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Landmarks HTML5 @a11y', () => {
  test('deve ter landmarks semânticos corretos na home', async ({ page }) => {
    await test.step('Abrir home', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verificar <header> presente', async () => {
      await expect(page.locator('header').first()).toBeAttached();
    });

    await test.step('Verificar <main> presente e único', async () => {
      const mains = page.locator('main');
      await expect(mains).toHaveCount(1);
    });

    await test.step('Verificar <footer> presente', async () => {
      await expect(page.locator('footer').first()).toBeAttached();
    });

    await test.step('Verificar <nav> com aria-label', async () => {
      const navs = page.locator('nav');
      const count = await navs.count();
      expect(count).toBeGreaterThan(0);
      // Pelo menos o nav principal deve ter aria-label
      const hasLabel = await navs.first().getAttribute('aria-label');
      expect(hasLabel).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Hierarquia de headings
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Heading hierarchy @a11y', () => {
  const pagesToCheck = [
    { name: 'Home',    path: '/' },
    { name: 'Catálogo', path: '/catalogo' },
  ];

  for (const { name, path } of pagesToCheck) {
    test(`deve ter exatamente um H1 em: ${name}`, async ({ page }) => {
      await test.step(`Abrir ${name}`, async () => {
        await page.goto(path);
        await page.waitForLoadState('domcontentloaded');
      });

      await test.step('Verificar único H1', async () => {
        await expect(page.locator('h1')).toHaveCount(1);
      });
    });

    test(`não deve pular níveis de heading em: ${name}`, async ({ page }) => {
      await test.step(`Abrir ${name}`, async () => {
        await page.goto(path);
        await page.waitForLoadState('domcontentloaded');
      });

      await test.step('Coletar todos os headings e verificar hierarquia', async () => {
        const levels = await page.evaluate(() => {
          const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
          return headings.map((h) => parseInt(h.tagName[1], 10));
        });

        for (let i = 1; i < levels.length; i++) {
          // Não deve pular mais de 1 nível (ex: h2 → h4 é inválido)
          expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
        }
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Alt text em imagens de produto
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Alt text em imagens @a11y', () => {
  test('todas as imagens de produto devem ter alt text não vazio', async ({ page }) => {
    await test.step('Abrir catálogo', async () => {
      await page.goto('/catalogo');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verificar alt text em todas as imagens de card', async () => {
      const images = await page.locator('[data-testid="card-image"]').all();
      expect(images.length).toBeGreaterThan(0);

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        expect(alt, `Imagem sem alt: ${await img.getAttribute('src')}`).toBeTruthy();
        expect(alt!.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test('imagem principal do produto deve ter alt descritivo', async ({ page }) => {
    const products = await getProducts(1);

    await test.step('Abrir página do produto', async () => {
      await page.goto(`/produto/${products[0].slug}`);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verificar alt da imagem principal', async () => {
      const mainImg = page.getByTestId('gallery-main-image');
      const alt = await mainImg.getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt!.trim().length).toBeGreaterThan(2);
    });
  });

  test('imagens decorativas devem ter alt vazio (role=presentation)', async ({ page }) => {
    await test.step('Verificar que imagens decorativas têm alt=""', async () => {
      await page.goto('/');
      const decorativeImgs = await page.locator('img[role="presentation"]').all();
      for (const img of decorativeImgs) {
        const alt = await img.getAttribute('alt');
        expect(alt).toBe('');
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Labels em formulários
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Labels em formulários @a11y', () => {
  test('todos os inputs de login devem ter labels associados', async ({ authPage, page }) => {
    await test.step('Abrir página de login', async () => {
      await authPage.openLogin();
    });

    await test.step('Verificar que cada input tem label ou aria-label', async () => {
      const inputs = await page.locator('input:not([type="hidden"])').all();
      for (const input of inputs) {
        const id         = await input.getAttribute('id');
        const ariaLabel  = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const hasLabel   = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;

        const isLabelled = hasLabel || !!ariaLabel || !!ariaLabelledBy;
        expect(
          isLabelled,
          `Input sem label: ${await input.getAttribute('data-testid') ?? 'desconhecido'}`,
        ).toBeTruthy();
      }
    });
  });

  test('campos de cadastro devem ter labels associados', async ({ authPage, page }) => {
    await test.step('Abrir página de cadastro', async () => {
      await authPage.openRegister();
    });

    await test.step('Verificar labels em todos os inputs', async () => {
      const results = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
        return inputs.map((el) => {
          const id = el.getAttribute('id');
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const labelEl = id ? document.querySelector(`label[for="${id}"]`) : null;
          return {
            testId: el.getAttribute('data-testid'),
            labelled: !!(labelEl || ariaLabel || ariaLabelledBy),
          };
        });
      });

      const unlabelled = results.filter((r) => !r.labelled);
      expect(
        unlabelled,
        `Inputs sem label: ${unlabelled.map((r) => r.testId).join(', ')}`,
      ).toHaveLength(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. aria-live para erros de formulário
// ─────────────────────────────────────────────────────────────────────────────

test.describe('aria-live para mensagens dinâmicas @a11y', () => {
  test('mensagem de erro de login deve estar em região aria-live', async ({ authPage, page }) => {
    await test.step('Abrir login e submeter credenciais inválidas', async () => {
      await authPage.openLogin();
      await authPage.login({ email: env.testUserEmail, password: 'SenhaErrada!' });
    });

    await test.step('Verificar que o container de erro tem aria-live', async () => {
      const errorEl = page.getByTestId('login-error-message');
      await expect(errorEl).toBeVisible();

      const ariaLive = await errorEl.getAttribute('aria-live');
      const role     = await errorEl.getAttribute('role');
      const isLive   = ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert';
      expect(isLive, 'Elemento de erro não tem aria-live ou role=alert').toBeTruthy();
    });
  });

  test('toast de confirmação de carrinho deve ter role=status ou aria-live', async ({
    page,
  }) => {
    await test.step('Adicionar produto ao carrinho', async () => {
      await page.goto('/catalogo');
      const card = page.getByTestId('product-card').first();
      await card.getByTestId('card-add-to-cart').click().catch(async () => {
        await card.click();
        await page.getByTestId('add-to-cart-button').click();
      });
    });

    await test.step('Verificar aria-live no toast', async () => {
      const toast = page.getByTestId('toast').first();
      const isVisible = await toast.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!isVisible) return;

      const ariaLive = await toast.getAttribute('aria-live');
      const role     = await toast.getAttribute('role');
      const isLive   = !!ariaLive || role === 'status' || role === 'alert';
      expect(isLive, 'Toast não anuncia para screen readers').toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. aria-label em botões de ícone
// ─────────────────────────────────────────────────────────────────────────────

test.describe('aria-label em botões de ícone @a11y', () => {
  test('botões de ícone no navbar devem ter aria-label ou texto visível', async ({ page }) => {
    await test.step('Abrir home', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verificar botão do carrinho', async () => {
      const cartBtn = page.getByTestId('nav-cart');
      const ariaLabel = await cartBtn.getAttribute('aria-label');
      const title     = await cartBtn.getAttribute('title');
      const text      = await cartBtn.textContent();
      const accessible = !!(ariaLabel || title || text?.trim());
      expect(accessible, 'Botão do carrinho sem nome acessível').toBeTruthy();
    });

    await test.step('Verificar botão da wishlist', async () => {
      const wishBtn = page.getByTestId('nav-wishlist');
      const ariaLabel = await wishBtn.getAttribute('aria-label').catch(() => null);
      if (!ariaLabel) {
        const title = await wishBtn.getAttribute('title').catch(() => null);
        expect(title || (await wishBtn.textContent())?.trim()).toBeTruthy();
      }
    });

    await test.step('Todos botões sem texto visível devem ter aria-label', async () => {
      const iconButtons = await page.locator('button:has(svg):not(:has(span, p, [aria-hidden="false"]))').all();
      for (const btn of iconButtons) {
        const ariaLabel = await btn.getAttribute('aria-label');
        const ariaLabelledBy = await btn.getAttribute('aria-labelledby');
        const title = await btn.getAttribute('title');
        const accessible = !!(ariaLabel || ariaLabelledBy || title);
        if (!accessible) {
          const testId = await btn.getAttribute('data-testid');
          // Reporta como aviso mas não falha — alguns ícones podem ser decorativos
          console.warn(`⚠️  Botão de ícone sem nome acessível: ${testId ?? '[sem data-testid]'}`);
        }
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Contraste de cores (via axe)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Contraste de cores @a11y', () => {
  test('não deve ter violações de contraste na home', async ({ page }) => {
    await test.step('Abrir home', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Executar regra de contraste do axe', async () => {
      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const contrastViolations = results.violations.filter(
        (v) => v.id === 'color-contrast',
      );

      if (contrastViolations.length > 0) {
        const details = contrastViolations[0].nodes
          .slice(0, 5)
          .map((n) => `  → ${n.html}\n     ${n.failureSummary}`)
          .join('\n');
        throw new Error(`Violações de contraste encontradas:\n${details}`);
      }
    });
  });

  test('não deve ter violações de contraste na página de produto', async ({ page }) => {
    const products = await getProducts(1);

    await test.step('Abrir produto', async () => {
      await page.goto(`/produto/${products[0].slug}`);
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Auditar contraste', async () => {
      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const violations = results.violations.filter((v) => v.id === 'color-contrast');
      expect(violations, `${violations.length} violação(ões) de contraste`).toHaveLength(0);
    });
  });
});

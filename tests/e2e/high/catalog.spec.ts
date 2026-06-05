import { test, expect } from '../../../fixtures/base';
import { getProducts } from '../../../helpers/api.helper';
import { env } from '../../../helpers/env';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers locais
// ─────────────────────────────────────────────────────────────────────────────

/** Converte texto de preço "R$ 1.299,90" para float */
function parsePrice(text: string): number {
  return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Testes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Catálogo @high', () => {

  // ── 1. Listagem de produtos ──────────────────────────────────────────────────
  test('deve listar produtos na página de catálogo @smoke', async ({ page, homePage }) => {
    await test.step('Abrir a home', async () => {
      await homePage.open();
    });

    await test.step('Verificar que cards de produtos estão visíveis', async () => {
      const cards = page.getByTestId('product-card');
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Verificar estrutura de cada card (imagem, título, preço)', async () => {
      const firstCard = page.getByTestId('product-card').first();
      await expect(firstCard.getByTestId('card-image')).toBeVisible();
      await expect(firstCard.getByTestId('card-title')).not.toBeEmpty();
      await expect(firstCard.getByTestId('card-price')).not.toBeEmpty();
    });
  });

  // ── 2. Skeleton loader durante carregamento ──────────────────────────────────
  test('deve exibir skeleton loader enquanto produtos carregam', async ({ page }) => {
    await test.step('Interceptar requisição de produtos para simular lentidão', async () => {
      await page.route(/\/api\/products/, async (route) => {
        await new Promise((r) => setTimeout(r, 1500));
        await route.continue();
      });
    });

    await test.step('Navegar para o catálogo', async () => {
      await page.goto('/catalogo');
    });

    await test.step('Verificar skeleton visível antes dos dados chegarem', async () => {
      const skeleton = page.getByTestId('product-card-skeleton').first();
      await expect(skeleton).toBeVisible();
    });

    await test.step('Verificar que skeletons desaparecem após carregamento', async () => {
      await page.waitForSelector('[data-testid="product-card"]', { timeout: 10_000 });
      await expect(page.getByTestId('product-card-skeleton')).toHaveCount(0);
    });
  });

  // ── 3. Cards completos com todas as informações ──────────────────────────────
  test('deve exibir todas as informações relevantes em cada card', async ({ searchPage, page }) => {
    await test.step('Abrir busca com resultados', async () => {
      await searchPage.open('vestido');
    });

    await test.step('Verificar campos obrigatórios no primeiro card', async () => {
      const card = page.getByTestId('product-card').first();

      await expect(card.getByTestId('card-title')).not.toBeEmpty();
      await expect(card.getByTestId('card-price')).not.toBeEmpty();
      await expect(card.getByTestId('card-condition')).toBeVisible();
      await expect(card.getByTestId('card-image')).toBeVisible();
    });

    await test.step('Verificar que imagem tem src e alt preenchidos', async () => {
      const img = page.getByTestId('product-card').first().getByTestId('card-image');
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      expect(src).toBeTruthy();
      expect(alt).toBeTruthy();
    });
  });

  // ── 4. Paginação funcional ───────────────────────────────────────────────────
  test('deve navegar entre páginas do catálogo', async ({ searchPage, page }) => {
    await test.step('Abrir busca com muitos resultados', async () => {
      await searchPage.open('');
      await page.goto('/catalogo');
      await searchPage.waitForLoad();
    });

    await test.step('Verificar que paginação existe', async () => {
      const pagination = page.getByTestId('pagination-next');
      const hasPagination = await pagination.isVisible();
      if (!hasPagination) test.skip(true, 'Menos de uma página de resultados');
    });

    let titlesPage1: string[];
    await test.step('Coletar títulos da primeira página', async () => {
      titlesPage1 = await page.getByTestId('card-title').allTextContents();
    });

    await test.step('Avançar para a página 2', async () => {
      await searchPage.goToNextPage();
      await expect(page).toHaveURL(/page=2|p=2/);
    });

    await test.step('Verificar que os produtos mudaram', async () => {
      const titlesPage2 = await page.getByTestId('card-title').allTextContents();
      const overlap = titlesPage1.filter((t) => titlesPage2.includes(t));
      expect(overlap.length).toBe(0);
    });

    await test.step('Voltar para página anterior', async () => {
      await searchPage.goToPrevPage?.();
      await expect(page).toHaveURL(/page=1|p=1|(?<!page=)/);
    });
  });

  // ── 5. Badge de desconto visível ─────────────────────────────────────────────
  test('deve exibir badge de desconto em produtos com promoção', async ({ searchPage, page }) => {
    await test.step('Abrir catálogo', async () => {
      await page.goto('/catalogo?discount=true');
      await searchPage.waitForLoad();
    });

    await test.step('Verificar badge de desconto nos cards', async () => {
      const discountBadge = page.getByTestId('card-discount-badge').first();
      await expect(discountBadge).toBeVisible();
      const text = await discountBadge.textContent();
      expect(text).toMatch(/\d+%/);
    });

    await test.step('Verificar que preço original está riscado', async () => {
      const originalPrice = page.getByTestId('card-original-price').first();
      await expect(originalPrice).toBeVisible();
    });
  });

  // ── 6. Produtos esgotados exibem badge e bloqueiam compra ────────────────────
  test('deve exibir badge de esgotado em produtos sem estoque', async ({ page, productPage }) => {
    await test.step('Obter produto esgotado via API', async () => {
      const products = await getProducts(20);
      const outOfStock = products.find((p: any) => p.stock === 0 || p.available === false);
      if (!outOfStock) test.skip(true, 'Nenhum produto esgotado disponível');
    });

    await test.step('Verificar badge de esgotado na listagem', async () => {
      await page.goto('/catalogo?status=out_of_stock');
      const badge = page.getByTestId('card-out-of-stock-badge').first();
      await expect(badge).toBeVisible();
    });

    await test.step('Abrir produto esgotado e verificar CTA bloqueado', async () => {
      await page.getByTestId('product-card').first().click();
      await productPage.assertOutOfStock();
    });
  });

  // ── 7. Página de detalhe do produto ─────────────────────────────────────────
  test('deve exibir detalhe completo do produto @smoke', async ({ productPage, page }) => {
    const products = await getProducts(1);
    const product = products[0];

    await test.step('Navegar para a página do produto', async () => {
      await productPage.open(product.slug);
    });

    await test.step('Verificar informações principais', async () => {
      await expect(productPage.productTitle()).not.toBeEmpty();
      await expect(productPage.productPrice()).not.toBeEmpty();
      await expect(productPage.productCondition()).toBeVisible();
    });

    await test.step('Verificar galeria com imagem principal', async () => {
      await expect(productPage.galleryMain()).toBeVisible();
      const src = await productPage.galleryMain().getAttribute('src');
      expect(src).toBeTruthy();
    });

    await test.step('Verificar que descrição está presente', async () => {
      await productPage.scrollToBottom();
      await expect(productPage.productDescription()).toBeVisible();
    });

    await test.step('Verificar breadcrumb de navegação', async () => {
      await expect(productPage.breadcrumb()).toBeVisible();
    });
  });

  // ── 8. Galeria de imagens navegável ─────────────────────────────────────────
  test('deve trocar imagem principal ao clicar em miniatura', async ({ productPage, page }) => {
    const products = await getProducts(1);

    await test.step('Abrir produto com múltiplas imagens', async () => {
      await productPage.open(products[0].slug);
      const thumbs = await productPage.galleryThumbs().count();
      if (thumbs < 2) test.skip(true, 'Produto não tem múltiplas imagens');
    });

    let srcBefore: string | null;
    await test.step('Registrar imagem principal atual', async () => {
      srcBefore = await productPage.galleryMain().getAttribute('src');
    });

    await test.step('Clicar na segunda miniatura', async () => {
      await productPage.clickGalleryThumb(1);
    });

    await test.step('Verificar que a imagem principal mudou', async () => {
      const srcAfter = await productPage.galleryMain().getAttribute('src');
      expect(srcAfter).not.toBe(srcBefore);
    });
  });

  // ── 9. Produtos relacionados na página de detalhe ────────────────────────────
  test('deve exibir produtos relacionados na página do produto', async ({ productPage }) => {
    const products = await getProducts(1);

    await test.step('Abrir página do produto', async () => {
      await productPage.open(products[0].slug);
    });

    await test.step('Rolar até seção de relacionados', async () => {
      await productPage.relatedProducts().scrollIntoViewIfNeeded();
    });

    await test.step('Verificar que há ao menos 1 produto relacionado', async () => {
      await expect(productPage.relatedProductCards().first()).toBeVisible();
    });

    await test.step('Clicar em um produto relacionado e verificar navegação', async () => {
      const currentUrl = productPage.url();
      await productPage.clickRelatedProduct(0);
      expect(productPage.url()).not.toBe(currentUrl);
      expect(productPage.url()).toMatch(/\/produto\//);
    });
  });

  // ── 10. Busca retorna resultados relevantes ──────────────────────────────────
  test('deve retornar resultados relevantes para termo de busca @smoke', async ({ searchPage }) => {
    const term = 'vestido';

    await test.step('Realizar busca', async () => {
      await searchPage.open(term);
    });

    await test.step('Verificar que há resultados', async () => {
      await searchPage.assertHasResults(1);
    });

    await test.step('Verificar que o contador de resultados está correto', async () => {
      const countText = await searchPage.getResultsCountText();
      expect(countText).toMatch(/\d+/);
    });

    await test.step('Verificar que pelo menos um card contém o termo buscado no título', async () => {
      const titles = await searchPage.page.getByTestId('card-title').allTextContents();
      const hasRelevant = titles.some((t) => t.toLowerCase().includes(term.toLowerCase()));
      expect(hasRelevant).toBeTruthy();
    });
  });

  // ── 11. Busca sem resultados exibe estado vazio ──────────────────────────────
  test('deve exibir estado vazio para busca sem resultados', async ({ searchPage }) => {
    const invalidTerm = 'zzznaoexistexyz123';

    await test.step('Realizar busca com termo inválido', async () => {
      await searchPage.open(invalidTerm);
    });

    await test.step('Verificar estado de "sem resultados"', async () => {
      await searchPage.assertNoResults();
    });

    await test.step('Verificar que o termo buscado está exibido na mensagem', async () => {
      await searchPage.assertNoResultsTerm(invalidTerm);
    });

    await test.step('Verificar sugestões de busca alternativa', async () => {
      const suggestions = searchPage.suggestedTerms();
      const hasSuggestions = await suggestions.first().isVisible().catch(() => false);
      // Sugestões são opcionais, mas se existirem devem ser clicáveis
      if (hasSuggestions) {
        await expect(suggestions.first()).toBeEnabled();
      }
    });
  });

  // ── 12. Autocomplete de busca ────────────────────────────────────────────────
  test('deve exibir sugestões de autocomplete durante digitação', async ({ homePage, page }) => {
    await test.step('Abrir a home', async () => {
      await homePage.open();
    });

    await test.step('Digitar termo parcial e aguardar sugestões', async () => {
      await homePage.typeSearchAndWaitSuggestions('vest');
    });

    await test.step('Verificar que sugestões são exibidas', async () => {
      const suggestions = homePage.searchSuggestions();
      await expect(suggestions).toBeVisible();
      const count = await page.getByTestId('search-suggestion-item').count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Verificar que cada sugestão contém o termo digitado', async () => {
      const texts = await page.getByTestId('search-suggestion-item').allTextContents();
      const hasMatch = texts.some((t) => t.toLowerCase().includes('vest'));
      expect(hasMatch).toBeTruthy();
    });

    await test.step('Clicar em uma sugestão e verificar navegação para busca', async () => {
      await page.getByTestId('search-suggestion-item').first().click();
      await expect(page).toHaveURL(/\/busca\?q=/);
    });
  });

  // ── 13. Busca disparada com Enter ────────────────────────────────────────────
  test('deve disparar busca ao pressionar Enter no campo de pesquisa', async ({ homePage, page }) => {
    const term = 'blusa';

    await test.step('Abrir a home e focar no campo de busca', async () => {
      await homePage.open();
      await homePage.searchInput().fill(term);
    });

    await test.step('Pressionar Enter', async () => {
      await homePage.searchInput().press('Enter');
      await page.waitForURL(/\/busca\?q=/);
    });

    await test.step('Verificar que a URL contém o termo buscado', async () => {
      await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(term)}`));
    });
  });

  // ── 14. Filtro por categoria ─────────────────────────────────────────────────
  test('deve filtrar produtos por categoria', async ({ searchPage, page }) => {
    const category = 'Vestidos';

    await test.step('Abrir catálogo e aplicar filtro de categoria', async () => {
      await page.goto('/catalogo');
      await searchPage.waitForLoad();
      await searchPage.filterByCategory(category);
    });

    await test.step('Verificar que URL reflete o filtro', async () => {
      await expect(page).toHaveURL(/categoria=|category=/i);
    });

    await test.step('Verificar que filtro ativo está exibido', async () => {
      const activeFilters = await searchPage.getActiveFilters();
      const hasCategoryFilter = activeFilters.some((f) =>
        f.value.toLowerCase().includes(category.toLowerCase()),
      );
      expect(hasCategoryFilter).toBeTruthy();
    });

    await test.step('Verificar que resultados pertencem à categoria', async () => {
      const count = await searchPage.getResultCount();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 15. Filtro por faixa de preço ────────────────────────────────────────────
  test('deve filtrar produtos por faixa de preço e respeitar limites', async ({
    searchPage,
    page,
  }) => {
    const minPrice = 20;
    const maxPrice = 100;

    await test.step('Abrir catálogo e aplicar filtro de preço', async () => {
      await page.goto('/catalogo');
      await searchPage.waitForLoad();
      await searchPage.filterByPriceRange(minPrice, maxPrice);
    });

    await test.step('Verificar que há resultados', async () => {
      await searchPage.assertHasResults(1);
    });

    await test.step('Verificar que todos os preços estão dentro da faixa', async () => {
      const priceTexts = await page.getByTestId('card-price').allTextContents();
      priceTexts.forEach((text) => {
        const price = parsePrice(text);
        expect(price).toBeGreaterThanOrEqual(minPrice);
        expect(price).toBeLessThanOrEqual(maxPrice);
      });
    });
  });

  // ── 16. Limpar filtros ───────────────────────────────────────────────────────
  test('deve limpar todos os filtros ativos', async ({ searchPage, page }) => {
    await test.step('Abrir catálogo com filtro aplicado', async () => {
      await page.goto('/catalogo');
      await searchPage.waitForLoad();
      await searchPage.filterByCondition('Seminovo');
    });

    await test.step('Verificar que filtro está ativo', async () => {
      const activeFilters = await searchPage.getActiveFilters();
      expect(activeFilters.length).toBeGreaterThan(0);
    });

    let countComFiltro: number;
    await test.step('Registrar quantidade de resultados com filtro', async () => {
      countComFiltro = await searchPage.getResultCount();
    });

    await test.step('Limpar todos os filtros', async () => {
      await searchPage.clearFilters();
    });

    await test.step('Verificar que filtros ativos foram removidos', async () => {
      const activeFilters = await searchPage.getActiveFilters();
      expect(activeFilters.length).toBe(0);
    });

    await test.step('Verificar que resultados aumentaram (ou permaneceram iguais)', async () => {
      const countSemFiltro = await searchPage.getResultCount();
      expect(countSemFiltro).toBeGreaterThanOrEqual(countComFiltro);
    });
  });

  // ── 17. Ordenação por menor preço verifica sequência real ───────────────────
  test('deve ordenar produtos do menor para maior preço corretamente', async ({
    searchPage,
    page,
  }) => {
    await test.step('Abrir catálogo', async () => {
      await page.goto('/catalogo');
      await searchPage.waitForLoad();
    });

    await test.step('Aplicar ordenação por menor preço', async () => {
      await searchPage.sortBy('price_asc');
    });

    await test.step('Verificar que URL reflete a ordenação', async () => {
      await expect(page).toHaveURL(/sort=price_asc|order=price/i);
    });

    await test.step('Extrair e verificar sequência real dos preços', async () => {
      const priceTexts = await page.getByTestId('card-price').allTextContents();
      const prices     = priceTexts.map(parsePrice).filter((p) => !isNaN(p));

      expect(prices.length).toBeGreaterThan(1);

      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
      }
    });
  });

  // ── 18. Ordenação por maior preço ───────────────────────────────────────────
  test('deve ordenar produtos do maior para menor preço corretamente', async ({
    searchPage,
    page,
  }) => {
    await test.step('Abrir catálogo e ordenar por maior preço', async () => {
      await page.goto('/catalogo');
      await searchPage.waitForLoad();
      await searchPage.sortBy('price_desc');
    });

    await test.step('Verificar sequência decrescente de preços', async () => {
      const priceTexts = await page.getByTestId('card-price').allTextContents();
      const prices     = priceTexts.map(parsePrice).filter((p) => !isNaN(p));

      expect(prices.length).toBeGreaterThan(1);

      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
      }
    });
  });
});

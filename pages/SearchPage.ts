import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'discount';

export interface ActiveFilter {
  type:  string;
  value: string;
}

export class SearchPage extends BasePage {
  // ── Locators ──────────────────────────────────────────────────────────────

  readonly resultsGrid       = () => this.getByTestId('search-results-grid');
  readonly productCards      = () => this.page.getByTestId('product-card');
  readonly resultsCount      = () => this.getByTestId('results-count');
  readonly noResultsState    = () => this.getByTestId('no-results-state');
  readonly noResultsQuery    = () => this.getByTestId('no-results-query');
  readonly suggestedTerms    = () => this.page.getByTestId('suggested-term');
  readonly loadingSpinner    = () => this.getByTestId('search-loading');

  // Filtros
  readonly filtersPanel      = () => this.getByTestId('filters-panel');
  readonly filterToggle      = () => this.getByTestId('filters-toggle');
  readonly filterSections    = () => this.page.getByTestId('filter-section');
  readonly activeFilters     = () => this.page.getByTestId('active-filter-tag');
  readonly clearFiltersBtn   = () => this.getByTestId('clear-all-filters');
  readonly applyFiltersBtn   = () => this.getByTestId('apply-filters');

  // Filtros específicos
  readonly priceMinInput     = () => this.getByTestId('filter-price-min');
  readonly priceMaxInput     = () => this.getByTestId('filter-price-max');
  readonly conditionFilters  = () => this.page.getByTestId('filter-condition');
  readonly sizeFilters       = () => this.page.getByTestId('filter-size');
  readonly categoryFilters   = () => this.page.getByTestId('filter-category');

  // Ordenação
  readonly sortSelect        = () => this.getByTestId('sort-select');

  // Paginação
  readonly paginationNext    = () => this.getByTestId('pagination-next');
  readonly paginationPrev    = () => this.getByTestId('pagination-prev');
  readonly paginationPages   = () => this.page.getByTestId('pagination-page');
  readonly currentPage       = () => this.getByTestId('pagination-current');

  // ── Ações ─────────────────────────────────────────────────────────────────

  /**
   * Navega para a página de busca com o termo informado.
   * @param term - Termo de busca
   */
  async open(term: string): Promise<this> {
    await this.navigate(`/busca?q=${encodeURIComponent(term)}`);
    await this.loadingSpinner().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    return this;
  }

  /**
   * Ordena os resultados.
   * @param option - Opção de ordenação
   */
  async sortBy(option: SortOption): Promise<this> {
    await this.sortSelect().selectOption(option);
    await this.loadingSpinner().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    return this;
  }

  /**
   * Filtra pela condição do produto.
   * @param condition - Ex: "Novo", "Seminovo", "Usado"
   */
  async filterByCondition(condition: string): Promise<this> {
    await this.conditionFilters().filter({ hasText: condition }).first().click();
    await this.applyIfNeeded();
    return this;
  }

  /**
   * Filtra por tamanho.
   * @param size - Ex: "P", "M", "G", "38"
   */
  async filterBySize(size: string): Promise<this> {
    await this.sizeFilters().filter({ hasText: size }).first().click();
    await this.applyIfNeeded();
    return this;
  }

  /**
   * Filtra por faixa de preço.
   * @param min - Preço mínimo
   * @param max - Preço máximo
   */
  async filterByPriceRange(min: number, max: number): Promise<this> {
    await this.priceMinInput().fill(String(min));
    await this.priceMaxInput().fill(String(max));
    await this.applyIfNeeded();
    return this;
  }

  /**
   * Filtra por categoria.
   * @param category - Nome da categoria
   */
  async filterByCategory(category: string): Promise<this> {
    await this.categoryFilters().filter({ hasText: category }).first().click();
    await this.applyIfNeeded();
    return this;
  }

  /** Remove todos os filtros ativos. */
  async clearFilters(): Promise<this> {
    await this.clearFiltersBtn().click();
    await this.loadingSpinner().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    return this;
  }

  /**
   * Remove um filtro ativo específico pelo texto.
   * @param filterText - Texto exibido no tag do filtro ativo
   */
  async removeActiveFilter(filterText: string): Promise<this> {
    await this.activeFilters()
      .filter({ hasText: filterText })
      .first()
      .getByRole('button')
      .click();
    return this;
  }

  /**
   * Abre o painel de filtros (mobile — em desktop já fica visível).
   */
  async openFilters(): Promise<this> {
    const toggle = this.filterToggle();
    if (await toggle.isVisible()) await toggle.click();
    return this;
  }

  /** Volta para a página anterior de resultados. */
  async goToPrevPage(): Promise<this> {
    await this.paginationPrev().click();
    await this.loadingSpinner().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    return this;
  }

  /** Avança para a próxima página de resultados. */
  async goToNextPage(): Promise<this> {
    await this.paginationNext().click();
    await this.loadingSpinner().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    return this;
  }

  /**
   * Clica em um produto pelo índice.
   * @param index - Posição do card (0-based)
   */
  async clickProduct(index = 0): Promise<this> {
    await this.productCards().nth(index).click();
    await this.waitForLoad();
    return this;
  }

  // ── Helpers internos ──────────────────────────────────────────────────────

  /**
   * Clica em "Aplicar" se o botão estiver visível (alguns layouts requerem confirmação).
   */
  private async applyIfNeeded(): Promise<void> {
    const btn = this.applyFiltersBtn();
    if (await btn.isVisible()) await btn.click();
    await this.loadingSpinner().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  }

  // ── Asserções & Getters ───────────────────────────────────────────────────

  /** Retorna o número de resultados exibidos na página atual. */
  async getResultCount(): Promise<number> {
    return this.productCards().count();
  }

  /** Retorna o texto do contador de resultados (ex: "42 produtos encontrados"). */
  async getResultsCountText(): Promise<string> {
    return (await this.resultsCount().textContent()) ?? '';
  }

  /** Retorna os filtros ativos como array de { type, value }. */
  async getActiveFilters(): Promise<ActiveFilter[]> {
    const tags = await this.activeFilters().all();
    return Promise.all(
      tags.map(async (tag) => ({
        type:  (await tag.getAttribute('data-filter-type')) ?? '',
        value: (await tag.textContent()) ?? '',
      })),
    );
  }

  /** Verifica que há pelo menos `min` resultados. */
  async assertHasResults(min = 1): Promise<this> {
    await expect(this.productCards()).toHaveCount(min, { timeout: 10_000 });
    return this;
  }

  /** Verifica que nenhum resultado foi encontrado. */
  async assertNoResults(): Promise<this> {
    await expect(this.noResultsState()).toBeVisible();
    await expect(this.resultsGrid()).toBeHidden();
    return this;
  }

  /** Verifica que o termo sem resultado está exibido. */
  async assertNoResultsTerm(term: string): Promise<this> {
    await expect(this.noResultsQuery()).toContainText(term);
    return this;
  }

  /** Verifica o número total de resultados no contador. */
  async assertResultsCount(expected: number): Promise<this> {
    await expect(this.resultsCount()).toContainText(String(expected));
    return this;
  }
}

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // ── Locators ──────────────────────────────────────────────────────────────

  readonly hero                = () => this.getByTestId('hero-section');
  readonly heroTitle           = () => this.getByTestId('hero-title');
  readonly heroCTA             = () => this.getByTestId('hero-cta-button');

  readonly searchInput         = () => this.getByTestId('search-input');
  readonly searchButton        = () => this.getByTestId('search-button');
  readonly searchSuggestions   = () => this.getByTestId('search-suggestions');

  readonly featuredSection     = () => this.getByTestId('featured-products');
  readonly productCards        = () => this.page.getByTestId('product-card');
  readonly newArrivalsSection  = () => this.getByTestId('new-arrivals');

  readonly navbar              = () => this.getByTestId('navbar');
  readonly navLogo             = () => this.getByTestId('nav-logo');
  readonly navCart             = () => this.getByTestId('nav-cart');
  readonly navCartCount        = () => this.getByTestId('nav-cart-count');
  readonly navAccount          = () => this.getByTestId('nav-account');
  readonly navWishlist         = () => this.getByTestId('nav-wishlist');
  readonly navCategories       = () => this.getByTestId('nav-categories');

  readonly categoryLinks       = () => this.page.getByTestId('category-link');

  readonly newsletterSection   = () => this.getByTestId('newsletter-section');
  readonly newsletterEmail     = () => this.getByTestId('newsletter-email-input');
  readonly newsletterSubmit    = () => this.getByTestId('newsletter-submit');
  readonly newsletterSuccess   = () => this.getByTestId('newsletter-success-message');

  readonly footer              = () => this.getByTestId('footer');
  readonly footerLinks         = () => this.page.getByTestId('footer-link');

  // ── Ações ─────────────────────────────────────────────────────────────────

  /** Abre a home page. */
  async open(): Promise<this> {
    await this.navigate('/');
    return this;
  }

  /**
   * Realiza uma busca a partir do campo de pesquisa no header.
   * @param term - Termo a pesquisar
   */
  async search(term: string): Promise<this> {
    await this.searchInput().fill(term);
    await this.searchButton().click();
    await this.waitForLoad();
    return this;
  }

  /**
   * Preenche o campo de busca e aguarda sugestões sem submeter.
   * @param term - Termo parcial para autocompletar
   */
  async typeSearchAndWaitSuggestions(term: string): Promise<this> {
    await this.searchInput().fill(term);
    await this.searchSuggestions().waitFor({ state: 'visible' });
    return this;
  }

  /** Clica no CTA do hero e aguarda navegação. */
  async clickHeroCTA(): Promise<this> {
    await this.heroCTA().click();
    await this.waitForLoad();
    return this;
  }

  /**
   * Clica no card de produto pelo índice (0-based).
   * @param index - Posição do card na listagem
   */
  async clickProductCard(index = 0): Promise<this> {
    await this.productCards().nth(index).click();
    await this.waitForLoad();
    return this;
  }

  /**
   * Clica em uma categoria pelo nome.
   * @param name - Texto visível da categoria
   */
  async clickCategory(name: string): Promise<this> {
    await this.categoryLinks().filter({ hasText: name }).first().click();
    await this.waitForLoad();
    return this;
  }

  /**
   * Inscreve um e-mail na newsletter.
   * @param email - E-mail a cadastrar
   */
  async subscribeNewsletter(email: string): Promise<this> {
    await this.newsletterSection().scrollIntoViewIfNeeded();
    await this.newsletterEmail().fill(email);
    await this.newsletterSubmit().click();
    return this;
  }

  /** Abre o mini-carrinho via ícone no navbar. */
  async openCart(): Promise<this> {
    await this.navCart().click();
    return this;
  }

  /** Abre a página de conta / login. */
  async openAccount(): Promise<this> {
    await this.navAccount().click();
    await this.waitForLoad();
    return this;
  }

  // ── Asserções ─────────────────────────────────────────────────────────────

  /** Retorna a quantidade exibida no badge do carrinho. */
  async getCartCount(): Promise<number> {
    const text = await this.navCartCount().textContent();
    return parseInt(text ?? '0', 10);
  }

  /** Verifica que a seção de destaque está visível. */
  async assertFeaturedVisible(): Promise<this> {
    await this.assertVisible('featured-products');
    return this;
  }

  /** Verifica que a newsletter exibiu mensagem de sucesso. */
  async assertNewsletterSuccess(): Promise<this> {
    await this.assertVisible('newsletter-success-message');
    return this;
  }
}

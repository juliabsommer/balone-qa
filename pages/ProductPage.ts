import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type ProductCondition = 'Novo' | 'Seminovo' | 'Usado' | string;

export interface ProductInfo {
  title:     string;
  price:     string;
  condition: string;
  available: boolean;
}

export class ProductPage extends BasePage {
  // ── Locators ──────────────────────────────────────────────────────────────

  readonly productTitle       = () => this.getByTestId('product-title');
  readonly productPrice       = () => this.getByTestId('product-price');
  readonly productOriginalPrice = () => this.getByTestId('product-original-price');
  readonly productDiscount    = () => this.getByTestId('product-discount-badge');
  readonly productCondition   = () => this.getByTestId('product-condition');
  readonly productDescription = () => this.getByTestId('product-description');
  readonly productBrand       = () => this.getByTestId('product-brand');
  readonly productCategory    = () => this.getByTestId('product-category');
  readonly productSKU         = () => this.getByTestId('product-sku');

  readonly galleryMain        = () => this.getByTestId('gallery-main-image');
  readonly galleryThumbs      = () => this.page.getByTestId('gallery-thumb');

  readonly sizeSelector       = () => this.getByTestId('size-selector');
  readonly sizeOptions        = () => this.page.getByTestId('size-option');
  readonly sizeGuideLink      = () => this.getByTestId('size-guide-link');

  readonly quantityInput      = () => this.getByTestId('quantity-input');
  readonly quantityIncrease   = () => this.getByTestId('quantity-increase');
  readonly quantityDecrease   = () => this.getByTestId('quantity-decrease');

  readonly addToCartButton    = () => this.getByTestId('add-to-cart-button');
  readonly buyNowButton       = () => this.getByTestId('buy-now-button');
  readonly wishlistButton     = () => this.getByTestId('wishlist-button');
  readonly addToCartSuccess   = () => this.getByTestId('add-to-cart-success');
  readonly outOfStockBadge    = () => this.getByTestId('out-of-stock-badge');

  readonly relatedProducts    = () => this.getByTestId('related-products');
  readonly relatedProductCards = () => this.page.getByTestId('related-product-card');

  readonly breadcrumb         = () => this.getByTestId('breadcrumb');
  readonly shareButton        = () => this.getByTestId('share-button');

  // ── Ações ─────────────────────────────────────────────────────────────────

  /**
   * Navega diretamente para a página de um produto pelo slug.
   * @param slug - Slug do produto na URL (ex: "vestido-floral-vintage")
   */
  async open(slug: string): Promise<this> {
    await this.navigate(`/produto/${slug}`);
    return this;
  }

  /**
   * Seleciona um tamanho pelo texto visível.
   * @param size - Ex: "P", "M", "G", "38", "40"
   */
  async selectSize(size: string): Promise<this> {
    await this.sizeOptions().filter({ hasText: size }).first().click();
    return this;
  }

  /**
   * Define a quantidade usando o campo de input diretamente.
   * @param qty - Quantidade desejada
   */
  async setQuantity(qty: number): Promise<this> {
    await this.quantityInput().fill(String(qty));
    await this.quantityInput().press('Tab');
    return this;
  }

  /** Incrementa a quantidade uma vez. */
  async increaseQuantity(): Promise<this> {
    await this.quantityIncrease().click();
    return this;
  }

  /** Decrementa a quantidade uma vez. */
  async decreaseQuantity(): Promise<this> {
    await this.quantityDecrease().click();
    return this;
  }

  /**
   * Adiciona o produto ao carrinho e aguarda confirmação.
   * Lança erro se o botão estiver desabilitado (sem estoque / tamanho não selecionado).
   */
  async addToCart(): Promise<this> {
    await expect(this.addToCartButton()).toBeEnabled();
    await this.waitForAPI(
      /cart/,
      async () => this.addToCartButton().click(),
    );
    await this.addToCartSuccess().waitFor({ state: 'visible', timeout: 5_000 });
    return this;
  }

  /**
   * Adiciona ao carrinho sem aguardar confirmação (para testes negativos).
   */
  async addToCartNoWait(): Promise<this> {
    await this.addToCartButton().click();
    return this;
  }

  /**
   * Clica em "Comprar agora" e aguarda redirecionamento para checkout.
   */
  async buyNow(): Promise<this> {
    await this.buyNowButton().click();
    await this.waitForLoad();
    return this;
  }

  /** Adiciona ou remove o produto da wishlist. */
  async toggleWishlist(): Promise<this> {
    await this.wishlistButton().click();
    return this;
  }

  /**
   * Clica em uma miniatura da galeria.
   * @param index - Índice da miniatura (0-based)
   */
  async clickGalleryThumb(index: number): Promise<this> {
    await this.galleryThumbs().nth(index).click();
    return this;
  }

  /**
   * Clica em um produto relacionado pelo índice.
   * @param index - Posição na lista de relacionados
   */
  async clickRelatedProduct(index = 0): Promise<this> {
    await this.relatedProductCards().nth(index).click();
    await this.waitForLoad();
    return this;
  }

  // ── Asserções & Getters ───────────────────────────────────────────────────

  /** Retorna as informações principais do produto. */
  async getProductInfo(): Promise<ProductInfo> {
    const [title, price, condition] = await Promise.all([
      this.productTitle().textContent(),
      this.productPrice().textContent(),
      this.productCondition().textContent(),
    ]);
    const available = !(await this.outOfStockBadge().isVisible());
    return {
      title:     title?.trim() ?? '',
      price:     price?.trim() ?? '',
      condition: condition?.trim() ?? '',
      available,
    };
  }

  /** Retorna o preço como número float (remove R$, pontos e converte vírgula). */
  async getPriceAsNumber(): Promise<number> {
    const text = await this.productPrice().textContent() ?? '0';
    return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
  }

  /** Retorna a quantidade atual do input. */
  async getQuantity(): Promise<number> {
    const val = await this.quantityInput().inputValue();
    return parseInt(val, 10);
  }

  /** Verifica que o produto está disponível para compra. */
  async assertAvailable(): Promise<this> {
    await expect(this.addToCartButton()).toBeEnabled();
    await expect(this.outOfStockBadge()).toBeHidden();
    return this;
  }

  /** Verifica que o produto está esgotado. */
  async assertOutOfStock(): Promise<this> {
    await expect(this.outOfStockBadge()).toBeVisible();
    await expect(this.addToCartButton()).toBeDisabled();
    return this;
  }

  /** Verifica que um tamanho está selecionado. */
  async assertSizeSelected(size: string): Promise<this> {
    await expect(
      this.sizeOptions().filter({ hasText: size }).first(),
    ).toHaveAttribute('aria-selected', 'true');
    return this;
  }
}

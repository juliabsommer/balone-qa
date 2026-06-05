import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CartItem {
  title:    string;
  price:    string;
  quantity: number;
}

export class CartPage extends BasePage {
  // ── Locators ──────────────────────────────────────────────────────────────

  readonly cartContainer      = () => this.getByTestId('cart-container');
  readonly cartItems          = () => this.page.getByTestId('cart-item');
  readonly emptyCartMessage   = () => this.getByTestId('cart-empty-message');
  readonly continueShoppingBtn = () => this.getByTestId('continue-shopping-button');

  readonly subtotalValue      = () => this.getByTestId('cart-subtotal');
  readonly shippingValue      = () => this.getByTestId('cart-shipping');
  readonly discountValue      = () => this.getByTestId('cart-discount');
  readonly totalValue         = () => this.getByTestId('cart-total');

  readonly couponInput        = () => this.getByTestId('coupon-input');
  readonly couponApplyButton  = () => this.getByTestId('coupon-apply-button');
  readonly couponRemoveButton = () => this.getByTestId('coupon-remove-button');
  readonly couponSuccess      = () => this.getByTestId('coupon-success');
  readonly couponError        = () => this.getByTestId('coupon-error');

  readonly clearCartButton    = () => this.getByTestId('clear-cart-button');
  readonly clearCartConfirm   = () => this.getByTestId('clear-cart-confirm');
  readonly checkoutButton     = () => this.getByTestId('proceed-to-checkout');

  /** Localiza a linha de um item pelo índice. */
  private itemAt(index: number) {
    return this.cartItems().nth(index);
  }

  /** Retorna o botão de remover de um item específico. */
  private removeButtonAt(index: number) {
    return this.itemAt(index).getByTestId('item-remove-button');
  }

  /** Retorna o input de quantidade de um item específico. */
  private quantityInputAt(index: number) {
    return this.itemAt(index).getByTestId('item-quantity-input');
  }

  // ── Ações ─────────────────────────────────────────────────────────────────

  /** Abre a página do carrinho. */
  async open(): Promise<this> {
    await this.navigate('/carrinho');
    return this;
  }

  /**
   * Remove um item do carrinho pelo índice.
   * @param index - Posição do item (0-based)
   */
  async removeItem(index = 0): Promise<this> {
    await this.waitForAPI(
      /cart/,
      async () => this.removeButtonAt(index).click(),
    );
    return this;
  }

  /**
   * Atualiza a quantidade de um item.
   * @param index - Posição do item
   * @param qty   - Nova quantidade
   */
  async updateItemQuantity(index: number, qty: number): Promise<this> {
    const input = this.quantityInputAt(index);
    await input.fill(String(qty));
    await input.press('Enter');
    return this;
  }

  /**
   * Aplica um cupom de desconto.
   * @param code - Código do cupom
   */
  async applyCoupon(code: string): Promise<this> {
    await this.couponInput().fill(code);
    await this.waitForAPI(
      /coupon/,
      async () => this.couponApplyButton().click(),
    );
    return this;
  }

  /** Remove o cupom aplicado. */
  async removeCoupon(): Promise<this> {
    await this.couponRemoveButton().click();
    return this;
  }

  /**
   * Esvazia o carrinho confirmando o modal.
   */
  async clearCart(): Promise<this> {
    await this.clearCartButton().click();
    await this.clearCartConfirm().click();
    await this.emptyCartMessage().waitFor({ state: 'visible' });
    return this;
  }

  /** Clica em "Finalizar compra" e aguarda navegação para o checkout. */
  async proceedToCheckout(): Promise<this> {
    await this.checkoutButton().click();
    await this.waitForLoad();
    return this;
  }

  /** Clica em "Continuar comprando" e volta ao catálogo. */
  async continueShopping(): Promise<this> {
    await this.continueShoppingBtn().click();
    await this.waitForLoad();
    return this;
  }

  // ── Asserções & Getters ───────────────────────────────────────────────────

  /** Retorna o número total de items no carrinho. */
  async getItemCount(): Promise<number> {
    return this.cartItems().count();
  }

  /**
   * Retorna os dados de um item pelo índice.
   * @param index - Posição do item
   */
  async getItemData(index = 0): Promise<CartItem> {
    const item = this.itemAt(index);
    const [title, price, qtyVal] = await Promise.all([
      item.getByTestId('item-title').textContent(),
      item.getByTestId('item-price').textContent(),
      this.quantityInputAt(index).inputValue(),
    ]);
    return {
      title:    title?.trim() ?? '',
      price:    price?.trim() ?? '',
      quantity: parseInt(qtyVal, 10),
    };
  }

  /** Retorna o total como número float. */
  async getTotalAsNumber(): Promise<number> {
    const text = await this.totalValue().textContent() ?? '0';
    return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
  }

  /** Verifica que o carrinho está vazio. */
  async assertEmpty(): Promise<this> {
    await expect(this.emptyCartMessage()).toBeVisible();
    return this;
  }

  /** Verifica que o carrinho contém exatamente N items. */
  async assertItemCount(expected: number): Promise<this> {
    await expect(this.cartItems()).toHaveCount(expected);
    return this;
  }

  /** Verifica que o cupom foi aplicado com sucesso. */
  async assertCouponApplied(): Promise<this> {
    await expect(this.couponSuccess()).toBeVisible();
    return this;
  }

  /** Verifica que o cupom exibiu erro. */
  async assertCouponError(): Promise<this> {
    await expect(this.couponError()).toBeVisible();
    return this;
  }
}

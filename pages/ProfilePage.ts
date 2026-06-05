import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface PersonalData {
  firstName?: string;
  lastName?:  string;
  phone?:     string;
  birthDate?: string; // DD/MM/AAAA
}

export interface PasswordChange {
  current:  string;
  newPass:  string;
  confirm:  string;
}

export type ProfileTab = 'personal' | 'orders' | 'addresses' | 'wishlist' | 'security';

export class ProfilePage extends BasePage {
  // ── Locators — Layout ─────────────────────────────────────────────────────

  readonly profileContainer    = () => this.getByTestId('profile-container');
  readonly profileAvatar       = () => this.getByTestId('profile-avatar');
  readonly profileName         = () => this.getByTestId('profile-name');
  readonly profileEmail        = () => this.getByTestId('profile-email');

  readonly tabPersonal         = () => this.getByTestId('tab-personal');
  readonly tabOrders           = () => this.getByTestId('tab-orders');
  readonly tabAddresses        = () => this.getByTestId('tab-addresses');
  readonly tabWishlist         = () => this.getByTestId('tab-wishlist');
  readonly tabSecurity         = () => this.getByTestId('tab-security');

  readonly logoutButton        = () => this.getByTestId('logout-button');
  readonly logoutConfirm       = () => this.getByTestId('logout-confirm');

  // ── Locators — Dados pessoais ─────────────────────────────────────────────

  readonly firstNameInput      = () => this.getByTestId('profile-first-name');
  readonly lastNameInput       = () => this.getByTestId('profile-last-name');
  readonly phoneInput          = () => this.getByTestId('profile-phone');
  readonly birthDateInput      = () => this.getByTestId('profile-birth-date');
  readonly savePersonalBtn     = () => this.getByTestId('save-personal-button');
  readonly savePersonalSuccess = () => this.getByTestId('save-personal-success');
  readonly savePersonalError   = () => this.getByTestId('save-personal-error');

  // ── Locators — Pedidos ────────────────────────────────────────────────────

  readonly ordersList          = () => this.page.getByTestId('order-list-item');
  readonly ordersEmpty         = () => this.getByTestId('orders-empty-state');
  readonly orderStatusBadge    = () => this.page.getByTestId('order-status-badge');

  /** Retorna a linha de um pedido pelo índice. */
  private orderAt(index: number) {
    return this.ordersList().nth(index);
  }

  readonly orderDetailModal    = () => this.getByTestId('order-detail-modal');
  readonly orderDetailClose    = () => this.getByTestId('order-detail-close');
  readonly orderDetailItems    = () => this.page.getByTestId('order-detail-item');
  readonly orderDetailTotal    = () => this.getByTestId('order-detail-total');
  readonly orderTrackingBtn    = () => this.getByTestId('order-tracking-button');

  // ── Locators — Endereços ──────────────────────────────────────────────────

  readonly addressCards        = () => this.page.getByTestId('address-card');
  readonly addAddressButton    = () => this.getByTestId('add-address-button');
  readonly addressForm         = () => this.getByTestId('address-form');
  readonly addressSaveBtn      = () => this.getByTestId('address-save-button');
  readonly addressDeleteBtn    = () => this.page.getByTestId('address-delete-button');
  readonly addressDefaultBtn   = () => this.page.getByTestId('address-set-default-button');
  readonly defaultAddressBadge = () => this.page.getByTestId('address-default-badge');

  // ── Locators — Wishlist ───────────────────────────────────────────────────

  readonly wishlistItems       = () => this.page.getByTestId('wishlist-item');
  readonly wishlistEmpty       = () => this.getByTestId('wishlist-empty-state');
  readonly wishlistRemoveBtn   = () => this.page.getByTestId('wishlist-remove-button');
  readonly wishlistAddToCart   = () => this.page.getByTestId('wishlist-add-to-cart');

  // ── Locators — Segurança ──────────────────────────────────────────────────

  readonly currentPasswordInput = () => this.getByTestId('current-password');
  readonly newPasswordInput     = () => this.getByTestId('new-password');
  readonly confirmPasswordInput = () => this.getByTestId('confirm-new-password');
  readonly changePasswordBtn    = () => this.getByTestId('change-password-button');
  readonly passwordChangeSuccess = () => this.getByTestId('password-change-success');
  readonly passwordChangeError   = () => this.getByTestId('password-change-error');

  readonly deleteAccountBtn    = () => this.getByTestId('delete-account-button');
  readonly deleteAccountConfirm = () => this.getByTestId('delete-account-confirm');

  // ── Ações — Navegação ─────────────────────────────────────────────────────

  /** Abre o perfil do usuário. */
  async open(): Promise<this> {
    await this.navigate('/conta');
    return this;
  }

  /**
   * Navega para uma aba do perfil.
   * @param tab - Identificador da aba
   */
  async goToTab(tab: ProfileTab): Promise<this> {
    const tabs: Record<ProfileTab, () => ReturnType<BasePage['getByTestId']>> = {
      personal:  this.tabPersonal,
      orders:    this.tabOrders,
      addresses: this.tabAddresses,
      wishlist:  this.tabWishlist,
      security:  this.tabSecurity,
    };
    await tabs[tab]().click();
    await this.waitForLoad();
    return this;
  }

  /** Realiza logout confirmando o modal. */
  async logout(): Promise<this> {
    await this.logoutButton().click();
    await this.logoutConfirm().click();
    await this.waitForLoad();
    return this;
  }

  // ── Ações — Dados pessoais ────────────────────────────────────────────────

  /**
   * Atualiza os dados pessoais do perfil.
   * Apenas os campos fornecidos são alterados.
   * @param data - Campos a atualizar
   */
  async updatePersonalData(data: PersonalData): Promise<this> {
    if (data.firstName) await this.firstNameInput().fill(data.firstName);
    if (data.lastName)  await this.lastNameInput().fill(data.lastName);
    if (data.phone)     await this.phoneInput().fill(data.phone);
    if (data.birthDate) await this.birthDateInput().fill(data.birthDate);

    await this.waitForAPI(
      /profile|user/,
      async () => this.savePersonalBtn().click(),
    );
    return this;
  }

  // ── Ações — Pedidos ───────────────────────────────────────────────────────

  /**
   * Abre o detalhe de um pedido pelo índice.
   * @param index - Posição do pedido na lista (0-based)
   */
  async openOrderDetail(index = 0): Promise<this> {
    await this.orderAt(index).click();
    await this.orderDetailModal().waitFor({ state: 'visible' });
    return this;
  }

  /** Fecha o modal de detalhe do pedido. */
  async closeOrderDetail(): Promise<this> {
    await this.orderDetailClose().click();
    return this;
  }

  // ── Ações — Endereços ─────────────────────────────────────────────────────

  /** Clica em "Adicionar endereço" e aguarda o formulário aparecer. */
  async openAddAddressForm(): Promise<this> {
    await this.addAddressButton().click();
    await this.addressForm().waitFor({ state: 'visible' });
    return this;
  }

  /**
   * Define um endereço como padrão pelo índice.
   * @param index - Posição do endereço
   */
  async setDefaultAddress(index: number): Promise<this> {
    await this.addressDefaultBtn().nth(index).click();
    return this;
  }

  /**
   * Remove um endereço pelo índice.
   * @param index - Posição do endereço
   */
  async deleteAddress(index: number): Promise<this> {
    await this.addressDeleteBtn().nth(index).click();
    return this;
  }

  // ── Ações — Wishlist ──────────────────────────────────────────────────────

  /**
   * Remove um item da wishlist pelo índice.
   * @param index - Posição do item (0-based)
   */
  async removeWishlistItem(index = 0): Promise<this> {
    await this.wishlistRemoveBtn().nth(index).click();
    return this;
  }

  /**
   * Move um item da wishlist para o carrinho.
   * @param index - Posição do item (0-based)
   */
  async moveWishlistItemToCart(index = 0): Promise<this> {
    await this.wishlistAddToCart().nth(index).click();
    return this;
  }

  // ── Ações — Segurança ─────────────────────────────────────────────────────

  /**
   * Altera a senha do usuário.
   * @param data - Senhas atual, nova e confirmação
   */
  async changePassword(data: PasswordChange): Promise<this> {
    await this.currentPasswordInput().fill(data.current);
    await this.newPasswordInput().fill(data.newPass);
    await this.confirmPasswordInput().fill(data.confirm);
    await this.waitForAPI(
      /password|security/,
      async () => this.changePasswordBtn().click(),
    );
    return this;
  }

  // ── Asserções ─────────────────────────────────────────────────────────────

  /** Verifica que os dados pessoais foram salvos com sucesso. */
  async assertPersonalSaveSuccess(): Promise<this> {
    await expect(this.savePersonalSuccess()).toBeVisible();
    return this;
  }

  /** Verifica que a lista de pedidos está vazia. */
  async assertOrdersEmpty(): Promise<this> {
    await expect(this.ordersEmpty()).toBeVisible();
    return this;
  }

  /** Verifica que a wishlist está vazia. */
  async assertWishlistEmpty(): Promise<this> {
    await expect(this.wishlistEmpty()).toBeVisible();
    return this;
  }

  /** Verifica o número de itens na wishlist. */
  async assertWishlistCount(expected: number): Promise<this> {
    await expect(this.wishlistItems()).toHaveCount(expected);
    return this;
  }

  /** Verifica que a senha foi alterada com sucesso. */
  async assertPasswordChangeSuccess(): Promise<this> {
    await expect(this.passwordChangeSuccess()).toBeVisible();
    return this;
  }

  /** Verifica que o erro de senha foi exibido. */
  async assertPasswordChangeError(text?: string | RegExp): Promise<this> {
    await expect(this.passwordChangeError()).toBeVisible();
    if (text) await expect(this.passwordChangeError()).toContainText(text);
    return this;
  }
}

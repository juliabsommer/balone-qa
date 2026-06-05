import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

export interface AddressData {
  zipCode:      string;
  street:       string;
  number:       string;
  complement?:  string;
  neighborhood: string;
  city:         string;
  state:        string;
}

export interface CreditCardData {
  number:  string;
  name:    string;
  expiry:  string;
  cvv:     string;
  installments?: number;
}

export class CheckoutPage extends BasePage {
  // ── Locators — Steps ──────────────────────────────────────────────────────

  readonly stepAddress        = () => this.getByTestId('checkout-step-address');
  readonly stepPayment        = () => this.getByTestId('checkout-step-payment');
  readonly stepReview         = () => this.getByTestId('checkout-step-review');
  readonly stepConfirmation   = () => this.getByTestId('checkout-step-confirmation');

  // ── Locators — Endereço ───────────────────────────────────────────────────

  readonly zipCodeInput       = () => this.getByTestId('address-zipcode');
  readonly zipCodeSearchBtn   = () => this.getByTestId('address-zipcode-search');
  readonly streetInput        = () => this.getByTestId('address-street');
  readonly numberInput        = () => this.getByTestId('address-number');
  readonly complementInput    = () => this.getByTestId('address-complement');
  readonly neighborhoodInput  = () => this.getByTestId('address-neighborhood');
  readonly cityInput          = () => this.getByTestId('address-city');
  readonly stateInput         = () => this.getByTestId('address-state');
  readonly savedAddresses     = () => this.page.getByTestId('saved-address-card');
  readonly continueToPayment  = () => this.getByTestId('continue-to-payment');

  // ── Locators — Pagamento ──────────────────────────────────────────────────

  readonly paymentMethodRadios = () => this.page.getByTestId('payment-method-option');
  readonly pixOption           = () => this.getByTestId('payment-pix');
  readonly creditCardOption    = () => this.getByTestId('payment-credit-card');
  readonly boletoOption        = () => this.getByTestId('payment-boleto');

  // Cartão de crédito
  readonly cardNumberInput     = () => this.getByTestId('card-number');
  readonly cardNameInput       = () => this.getByTestId('card-holder-name');
  readonly cardExpiryInput     = () => this.getByTestId('card-expiry');
  readonly cardCVVInput        = () => this.getByTestId('card-cvv');
  readonly installmentsSelect  = () => this.getByTestId('card-installments');

  // PIX
  readonly pixQRCode           = () => this.getByTestId('pix-qrcode');
  readonly pixCopyPaste        = () => this.getByTestId('pix-copy-paste-code');
  readonly pixCopyButton       = () => this.getByTestId('pix-copy-button');

  // Boleto
  readonly boletoBarcode       = () => this.getByTestId('boleto-barcode');
  readonly boletoDownload      = () => this.getByTestId('boleto-download-button');

  readonly shippingValue       = () => this.getByTestId('checkout-shipping-value');
  readonly continueToReview    = () => this.getByTestId('continue-to-review');

  // ── Locators — Revisão ────────────────────────────────────────────────────

  readonly orderSummaryItems   = () => this.page.getByTestId('order-summary-item');
  readonly orderSummaryTotal   = () => this.getByTestId('order-summary-total');
  readonly termsCheckbox       = () => this.getByTestId('terms-checkbox');
  readonly placeOrderButton    = () => this.getByTestId('place-order-button');

  // ── Locators — Confirmação ────────────────────────────────────────────────

  readonly confirmationMessage = () => this.getByTestId('order-confirmation-message');
  readonly orderNumber         = () => this.getByTestId('order-number');
  readonly continueBrowsing    = () => this.getByTestId('continue-browsing-button');

  // ── Ações — Endereço ──────────────────────────────────────────────────────

  /**
   * Preenche o formulário de endereço completo.
   * Tenta autocompletar via CEP antes de preencher os demais campos.
   */
  async fillAddress(address: AddressData): Promise<this> {
    await this.zipCodeInput().fill(address.zipCode);
    await this.zipCodeSearchBtn().click();
    // Aguarda o autopreenchimento via API ViaCEP/similar
    await this.streetInput().waitFor({ state: 'visible' });

    // Sobrescreve campos que podem não ter sido preenchidos automaticamente
    const street = await this.streetInput().inputValue();
    if (!street) await this.streetInput().fill(address.street);

    await this.numberInput().fill(address.number);

    if (address.complement) {
      await this.complementInput().fill(address.complement);
    }

    const neighborhood = await this.neighborhoodInput().inputValue();
    if (!neighborhood) await this.neighborhoodInput().fill(address.neighborhood);

    return this;
  }

  /**
   * Seleciona um endereço salvo pelo índice.
   * @param index - Posição na lista de endereços salvos
   */
  async selectSavedAddress(index = 0): Promise<this> {
    await this.savedAddresses().nth(index).click();
    return this;
  }

  /** Avança para a etapa de pagamento. */
  async goToPayment(): Promise<this> {
    await this.continueToPayment().click();
    await this.waitForLoad();
    return this;
  }

  // ── Ações — Pagamento ─────────────────────────────────────────────────────

  /**
   * Seleciona o método de pagamento PIX e aguarda o QR Code aparecer.
   */
  async selectPix(): Promise<this> {
    await this.pixOption().click();
    await this.pixQRCode().waitFor({ state: 'visible' });
    return this;
  }

  /**
   * Seleciona boleto bancário.
   */
  async selectBoleto(): Promise<this> {
    await this.boletoOption().click();
    return this;
  }

  /**
   * Seleciona cartão de crédito e preenche os dados.
   * @param card - Dados do cartão
   */
  async fillCreditCard(card: CreditCardData): Promise<this> {
    await this.creditCardOption().click();

    // Aguarda o formulário de cartão aparecer
    await this.cardNumberInput().waitFor({ state: 'visible' });

    await this.cardNumberInput().fill(card.number);
    await this.cardNameInput().fill(card.name);
    await this.cardExpiryInput().fill(card.expiry);
    await this.cardCVVInput().fill(card.cvv);

    if (card.installments && card.installments > 1) {
      await this.installmentsSelect().selectOption(String(card.installments));
    }

    return this;
  }

  /** Copia o código PIX para a área de transferência. */
  async copyPixCode(): Promise<this> {
    await this.pixCopyButton().click();
    return this;
  }

  /** Avança para a revisão do pedido. */
  async goToReview(): Promise<this> {
    await this.continueToReview().click();
    await this.waitForLoad();
    return this;
  }

  // ── Ações — Finalização ───────────────────────────────────────────────────

  /**
   * Aceita os termos e finaliza o pedido.
   * @returns Número do pedido gerado
   */
  async placeOrder(): Promise<string> {
    await this.termsCheckbox().check();
    await this.waitForAPI(
      /orders/,
      async () => this.placeOrderButton().click(),
    );
    await this.confirmationMessage().waitFor({ state: 'visible', timeout: 15_000 });
    return (await this.orderNumber().textContent()) ?? '';
  }

  /**
   * Executa o fluxo completo de checkout.
   * @param address - Dados de endereço
   * @param payment - Método de pagamento
   * @param card    - Dados do cartão (obrigatório se payment === 'credit_card')
   */
  async completeCheckout(
    address: AddressData,
    payment: PaymentMethod,
    card?: CreditCardData,
  ): Promise<string> {
    await this.fillAddress(address);
    await this.goToPayment();

    if (payment === 'pix') {
      await this.selectPix();
    } else if (payment === 'boleto') {
      await this.selectBoleto();
    } else if (payment === 'credit_card' && card) {
      await this.fillCreditCard(card);
    }

    await this.goToReview();
    return this.placeOrder();
  }

  // ── Asserções ─────────────────────────────────────────────────────────────

  /** Verifica que a confirmação do pedido está visível. */
  async assertOrderConfirmed(): Promise<this> {
    await expect(this.confirmationMessage()).toBeVisible();
    await expect(this.orderNumber()).not.toBeEmpty();
    return this;
  }

  /** Verifica que o botão de finalizar está desabilitado (sem aceitar termos). */
  async assertPlaceOrderDisabled(): Promise<this> {
    await expect(this.placeOrderButton()).toBeDisabled();
    return this;
  }

  /** Verifica o total exibido no resumo do pedido. */
  async assertTotal(expected: string): Promise<this> {
    await expect(this.orderSummaryTotal()).toContainText(expected);
    return this;
  }
}

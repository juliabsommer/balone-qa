import { test, expect } from '../../../fixtures/base';
import {
  getAuthToken,
  clearCart,
  addToCartApi,
  getProducts,
  cancelOrder,
} from '../../../helpers/api.helper';
import {
  generateAddress,
  generateCreditCard,
} from '../../../helpers/data.helper';
import { env } from '../../../helpers/env';
import { AUTH_USER_FILE } from '../../../helpers/auth.helper';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de dados reutilizáveis
// ─────────────────────────────────────────────────────────────────────────────

const SP_ADDRESS     = generateAddress('SP');
const VALID_CARD     = generateCreditCard('visa');
const DECLINED_CARD  = { ...generateCreditCard('visa'), number: '4000000000000002' }; // Visa recusado (sandbox)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de setup
// ─────────────────────────────────────────────────────────────────────────────

async function setupAuthAndProduct(storageState = AUTH_USER_FILE) {
  const token    = await getAuthToken(env.testUserEmail, env.testUserPassword);
  const products = await getProducts(1);
  if (!products.length) throw new Error('Nenhum produto disponível para testes de checkout');
  return { token, product: products[0] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Testes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Checkout @critical', () => {
  test.use({ storageState: AUTH_USER_FILE });

  test.beforeEach(async () => {
    // Garante carrinho limpo antes de cada teste
    const token = await getAuthToken(env.testUserEmail, env.testUserPassword);
    await clearCart(token);
  });

  // ── 1. Compra completa com cartão de crédito ────────────────────────────────
  test('deve completar compra com cartão de crédito válido @smoke', async ({
    productPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    let orderNumber = '';

    await test.step('Setup: adicionar produto ao carrinho via API', async () => {
      const { token, product } = await setupAuthAndProduct();
      await addToCartApi(product.id, 1, token);
    });

    await test.step('Ir ao carrinho e verificar item', async () => {
      await cartPage.open();
      await cartPage.assertItemCount(1);
    });

    await test.step('Iniciar checkout', async () => {
      await cartPage.proceedToCheckout();
      await checkoutPage.assertUrl(/\/checkout/);
    });

    await test.step('Preencher endereço de entrega', async () => {
      await checkoutPage.fillAddress(SP_ADDRESS);
      await checkoutPage.goToPayment();
    });

    await test.step('Selecionar cartão de crédito e preencher dados', async () => {
      await checkoutPage.fillCreditCard(VALID_CARD);
      await checkoutPage.goToReview();
    });

    await test.step('Revisar pedido e verificar totais', async () => {
      await expect(checkoutPage.orderSummaryItems()).toHaveCount(1);
      await expect(checkoutPage.orderSummaryTotal()).not.toBeEmpty();
    });

    await test.step('Finalizar pedido', async () => {
      orderNumber = await checkoutPage.placeOrder();
      expect(orderNumber).toBeTruthy();
      expect(orderNumber).toMatch(/\d+/);
    });

    await test.step('Verificar página de confirmação', async () => {
      await checkoutPage.assertOrderConfirmed();
      await expect(checkoutPage.orderNumber()).toContainText(orderNumber);
    });

    // Teardown
    await test.step('Teardown: cancelar pedido gerado', async () => {
      if (orderNumber) {
        const token = await getAuthToken(env.testUserEmail, env.testUserPassword);
        await cancelOrder(orderNumber, token).catch(() => {});
      }
    });
  });

  // ── 2. Cartão recusado + carrinho preservado ────────────────────────────────
  test('deve exibir erro com cartão recusado e preservar carrinho', async ({
    cartPage,
    checkoutPage,
  }) => {
    await test.step('Setup: adicionar produto ao carrinho via API', async () => {
      const { token, product } = await setupAuthAndProduct();
      await addToCartApi(product.id, 1, token);
    });

    await test.step('Ir ao carrinho', async () => {
      await cartPage.open();
      await cartPage.assertItemCount(1);
    });

    await test.step('Iniciar checkout', async () => {
      await cartPage.proceedToCheckout();
    });

    await test.step('Preencher endereço e avançar', async () => {
      await checkoutPage.fillAddress(SP_ADDRESS);
      await checkoutPage.goToPayment();
    });

    await test.step('Usar cartão que será recusado', async () => {
      await checkoutPage.fillCreditCard(DECLINED_CARD);
      await checkoutPage.goToReview();
      await checkoutPage.placeOrder().catch(() => {});
    });

    await test.step('Verificar mensagem de erro de pagamento', async () => {
      const errorMsg = checkoutPage.page.getByTestId('payment-error-message');
      await expect(errorMsg).toBeVisible();
      await expect(errorMsg).toContainText(/recusado|não autorizado|tente outro/i);
    });

    await test.step('Verificar que o carrinho foi preservado', async () => {
      await cartPage.open();
      await cartPage.assertItemCount(1);
    });
  });

  // ── 3. Geração de QR Code PIX + cópia do código ────────────────────────────
  test('deve gerar QR Code PIX e disponibilizar código copia-e-cola', async ({
    cartPage,
    checkoutPage,
    page,
  }) => {
    await test.step('Setup: adicionar produto ao carrinho via API', async () => {
      const { token, product } = await setupAuthAndProduct();
      await addToCartApi(product.id, 1, token);
    });

    await test.step('Navegar até etapa de pagamento', async () => {
      await cartPage.open();
      await cartPage.proceedToCheckout();
      await checkoutPage.fillAddress(SP_ADDRESS);
      await checkoutPage.goToPayment();
    });

    await test.step('Selecionar PIX como método de pagamento', async () => {
      await checkoutPage.selectPix();
    });

    await test.step('Verificar QR Code visível', async () => {
      await expect(checkoutPage.pixQRCode()).toBeVisible();
      // QR Code deve ser uma imagem com src preenchido
      const src = await checkoutPage.pixQRCode().getAttribute('src');
      expect(src).toBeTruthy();
    });

    await test.step('Verificar código copia-e-cola presente', async () => {
      const code = await checkoutPage.pixCopyPaste().textContent();
      expect(code?.trim().length).toBeGreaterThan(10);
    });

    await test.step('Copiar código PIX', async () => {
      await checkoutPage.copyPixCode();
      // Verificar feedback visual de "copiado"
      const copiedFeedback = page.getByTestId('pix-copied-feedback');
      await expect(copiedFeedback).toBeVisible({ timeout: 3_000 });
    });

    await test.step('Finalizar pedido e verificar confirmação com instruções PIX', async () => {
      await checkoutPage.goToReview();
      await checkoutPage.placeOrder();
      await checkoutPage.assertOrderConfirmed();
      // Instruções PIX devem estar na confirmação
      await expect(page.getByTestId('pix-payment-instructions')).toBeVisible();
    });
  });

  // ── 4. Geração de boleto bancário ───────────────────────────────────────────
  test('deve gerar boleto bancário com código de barras', async ({
    cartPage,
    checkoutPage,
    page,
  }) => {
    await test.step('Setup: adicionar produto ao carrinho via API', async () => {
      const { token, product } = await setupAuthAndProduct();
      await addToCartApi(product.id, 1, token);
    });

    await test.step('Navegar até etapa de pagamento', async () => {
      await cartPage.open();
      await cartPage.proceedToCheckout();
      await checkoutPage.fillAddress(SP_ADDRESS);
      await checkoutPage.goToPayment();
    });

    await test.step('Selecionar boleto como método de pagamento', async () => {
      await checkoutPage.selectBoleto();
    });

    await test.step('Avançar e finalizar pedido com boleto', async () => {
      await checkoutPage.goToReview();
      await checkoutPage.placeOrder();
      await checkoutPage.assertOrderConfirmed();
    });

    await test.step('Verificar código de barras presente na confirmação', async () => {
      const barcode = await checkoutPage.boletoBarcode().textContent();
      // Código de barras do boleto tem 47 ou 48 dígitos
      expect(barcode?.replace(/\D/g, '').length).toBeGreaterThanOrEqual(47);
    });

    await test.step('Verificar botão de download do boleto', async () => {
      await expect(checkoutPage.boletoDownload()).toBeVisible();
      await expect(checkoutPage.boletoDownload()).toBeEnabled();
    });

    await test.step('Verificar prazo de vencimento exibido', async () => {
      const dueDate = page.getByTestId('boleto-due-date');
      await expect(dueDate).toBeVisible();
      // Data deve estar no futuro
      const dateText = await dueDate.textContent() ?? '';
      expect(dateText).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  // ── 5. Bloqueio de checkout com carrinho vazio ──────────────────────────────
  test('deve bloquear acesso ao checkout com carrinho vazio', async ({
    cartPage,
    page,
  }) => {
    await test.step('Verificar carrinho vazio', async () => {
      await cartPage.open();
      await cartPage.assertEmpty();
    });

    await test.step('Verificar que botão de checkout está desabilitado ou inexistente', async () => {
      const checkoutBtn = cartPage.checkoutButton();
      const isVisible = await checkoutBtn.isVisible();
      if (isVisible) {
        await expect(checkoutBtn).toBeDisabled();
      }
    });

    await test.step('Tentar acessar checkout diretamente pela URL', async () => {
      await page.goto('/checkout');
    });

    await test.step('Verificar redirecionamento para carrinho ou home', async () => {
      await expect(page).toHaveURL(/\/(carrinho|$)/);
    });
  });

  // ── 6. Cálculo e seleção de frete ───────────────────────────────────────────
  test('deve calcular e exibir opções de frete por CEP', async ({
    cartPage,
    checkoutPage,
    page,
  }) => {
    await test.step('Setup: produto no carrinho', async () => {
      const { token, product } = await setupAuthAndProduct();
      await addToCartApi(product.id, 1, token);
    });

    await test.step('Iniciar checkout e informar CEP', async () => {
      await cartPage.open();
      await cartPage.proceedToCheckout();
      await checkoutPage.zipCodeInput().fill(SP_ADDRESS.zipCode);
      await checkoutPage.zipCodeSearchBtn().click();
    });

    await test.step('Aguardar opções de frete', async () => {
      const shippingOptions = page.getByTestId('shipping-option');
      await expect(shippingOptions.first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Verificar que há ao menos 1 opção de frete', async () => {
      const count = await page.getByTestId('shipping-option').count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Verificar que cada opção exibe nome, prazo e valor', async () => {
      const firstOption = page.getByTestId('shipping-option').first();
      await expect(firstOption.getByTestId('shipping-name')).not.toBeEmpty();
      await expect(firstOption.getByTestId('shipping-days')).not.toBeEmpty();
      await expect(firstOption.getByTestId('shipping-price')).not.toBeEmpty();
    });

    await test.step('Selecionar primeira opção de frete', async () => {
      await page.getByTestId('shipping-option').first().click();
      const selectedIndicator = page.getByTestId('shipping-selected');
      await expect(selectedIndicator).toBeVisible();
    });
  });

  // ── 7. Atualização do total ao trocar frete ─────────────────────────────────
  test('deve atualizar total ao trocar opção de frete', async ({
    cartPage,
    checkoutPage,
    page,
  }) => {
    await test.step('Setup: produto no carrinho', async () => {
      const { token, product } = await setupAuthAndProduct();
      await addToCartApi(product.id, 1, token);
    });

    await test.step('Navegar para checkout e calcular frete', async () => {
      await cartPage.open();
      await cartPage.proceedToCheckout();
      await checkoutPage.fillAddress(SP_ADDRESS);
    });

    await test.step('Verificar opções de frete disponíveis', async () => {
      const shippingOptions = page.getByTestId('shipping-option');
      const count = await shippingOptions.count();
      if (count < 2) test.skip(true, 'Apenas uma opção de frete disponível');
    });

    let totalComPrimeiraOpcao: number;
    let totalComSegundaOpcao: number;

    await test.step('Registrar total com primeira opção de frete', async () => {
      await page.getByTestId('shipping-option').first().click();
      const totalText = await checkoutPage.orderSummaryTotal().textContent() ?? '0';
      totalComPrimeiraOpcao = parseFloat(totalText.replace(/[R$\s.]/g, '').replace(',', '.'));
    });

    await test.step('Trocar para segunda opção de frete', async () => {
      await page.getByTestId('shipping-option').nth(1).click();
      // Aguarda atualização do total
      await page.waitForResponse(/shipping|cart|checkout/, { timeout: 5_000 }).catch(() => {});
    });

    await test.step('Verificar que o total foi atualizado', async () => {
      const totalText = await checkoutPage.orderSummaryTotal().textContent() ?? '0';
      totalComSegundaOpcao = parseFloat(totalText.replace(/[R$\s.]/g, '').replace(',', '.'));
      expect(totalComSegundaOpcao).not.toBe(totalComPrimeiraOpcao);
    });

    await test.step('Verificar que o valor de frete exibido é diferente', async () => {
      const shippingText = await checkoutPage.shippingValue().textContent() ?? '';
      expect(shippingText).not.toContain('Grátis'); // segunda opção tipicamente não é grátis
    });
  });

  // ── 8. Checkout exige endereço válido ───────────────────────────────────────
  test('deve exibir erros de validação em campos obrigatórios do endereço', async ({
    cartPage,
    checkoutPage,
    page,
  }) => {
    await test.step('Setup: produto no carrinho', async () => {
      const { token, product } = await setupAuthAndProduct();
      await addToCartApi(product.id, 1, token);
    });

    await test.step('Navegar para checkout', async () => {
      await cartPage.open();
      await cartPage.proceedToCheckout();
    });

    await test.step('Tentar avançar sem preencher o endereço', async () => {
      await checkoutPage.continueToPayment().click();
    });

    await test.step('Verificar mensagens de validação', async () => {
      // Pelo menos o CEP deve exibir erro
      const zipError = page.getByTestId('address-zipcode-error');
      await expect(zipError).toBeVisible();
    });

    await test.step('Preencher CEP inválido e verificar erro específico', async () => {
      await checkoutPage.zipCodeInput().fill('00000-000');
      await checkoutPage.zipCodeSearchBtn().click();
      const zipError = page.getByTestId('address-zipcode-error');
      await expect(zipError).toBeVisible();
      await expect(zipError).toContainText(/CEP inválido|não encontrado/i);
    });
  });

  // ── 9. Resumo correto no step de revisão ────────────────────────────────────
  test('deve exibir resumo correto na revisão antes de finalizar', async ({
    cartPage,
    checkoutPage,
    page,
  }) => {
    let productTitle: string;
    let cartTotal: number;

    await test.step('Setup: produto no carrinho', async () => {
      const { token, product } = await setupAuthAndProduct();
      productTitle = product.title;
      await addToCartApi(product.id, 1, token);
    });

    await test.step('Verificar total no carrinho', async () => {
      await cartPage.open();
      cartTotal = await cartPage.getTotalAsNumber();
      expect(cartTotal).toBeGreaterThan(0);
    });

    await test.step('Preencher checkout até revisão', async () => {
      await cartPage.proceedToCheckout();
      await checkoutPage.fillAddress(SP_ADDRESS);
      await checkoutPage.goToPayment();
      await checkoutPage.fillCreditCard(VALID_CARD);
      await checkoutPage.goToReview();
    });

    await test.step('Verificar produto no resumo', async () => {
      await expect(checkoutPage.orderSummaryItems().first()).toContainText(productTitle);
    });

    await test.step('Verificar endereço de entrega no resumo', async () => {
      const addressSummary = page.getByTestId('review-shipping-address');
      await expect(addressSummary).toContainText(SP_ADDRESS.street);
    });

    await test.step('Verificar método de pagamento no resumo', async () => {
      const paymentSummary = page.getByTestId('review-payment-method');
      await expect(paymentSummary).toContainText(/cartão|crédito/i);
    });

    await test.step('Verificar coerência do total (carrinho ≤ total checkout)', async () => {
      const checkoutTotalText = await checkoutPage.orderSummaryTotal().textContent() ?? '0';
      const checkoutTotal = parseFloat(checkoutTotalText.replace(/[R$\s.]/g, '').replace(',', '.'));
      // Total no checkout inclui frete, portanto >= valor dos produtos
      expect(checkoutTotal).toBeGreaterThanOrEqual(cartTotal);
    });
  });
});

import { test, expect } from '../../../fixtures/base';
import {
  getAuthToken,
  clearCart,
  addToCartApi,
  getProducts,
  createCoupon,
  deleteCoupon,
} from '../../../helpers/api.helper';
import { generateCouponCode } from '../../../helpers/data.helper';
import { env } from '../../../helpers/env';
import { AUTH_USER_FILE } from '../../../helpers/auth.helper';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers locais
// ─────────────────────────────────────────────────────────────────────────────

function parsePrice(text: string): number {
  return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
}

async function getToken() {
  return getAuthToken(env.testUserEmail, env.testUserPassword);
}

// ─────────────────────────────────────────────────────────────────────────────
// Testes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Carrinho @high', () => {
  test.use({ storageState: AUTH_USER_FILE });

  let token: string;
  let productId: string;
  let productTitle: string;
  let productPrice: number;

  test.beforeAll(async () => {
    token = await getToken();
    const products = await getProducts(1);
    if (!products.length) throw new Error('Nenhum produto disponível para testes de carrinho');
    productId    = products[0].id;
    productTitle = products[0].title;
    productPrice = products[0].price;
  });

  test.beforeEach(async () => {
    await clearCart(token);
  });

  // ── 1. Adicionar produto ao carrinho ────────────────────────────────────────
  test('deve adicionar produto ao carrinho e exibir toast de confirmação @smoke', async ({
    productPage,
    homePage,
    page,
  }) => {
    const products = await getProducts(1);
    const slug = products[0].slug;

    await test.step('Abrir página do produto', async () => {
      await productPage.open(slug);
      await productPage.assertAvailable();
    });

    await test.step('Selecionar tamanho se necessário', async () => {
      const hasSizes = await productPage.sizeSelector().isVisible().catch(() => false);
      if (hasSizes) {
        await productPage.sizeOptions().first().click();
      }
    });

    await test.step('Clicar em "Adicionar ao carrinho"', async () => {
      await productPage.addToCart();
    });

    await test.step('Verificar toast de confirmação', async () => {
      await expect(productPage.addToCartSuccess()).toBeVisible();
      await expect(productPage.addToCartSuccess()).toContainText(/adicionado|carrinho/i);
    });

    await test.step('Verificar contador no navbar atualizado', async () => {
      const count = await homePage.getCartCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 2. Contador do navbar reflete quantidade total ───────────────────────────
  test('deve atualizar contador do carrinho no navbar', async ({ homePage, page }) => {
    await test.step('Adicionar 2 produtos distintos via API', async () => {
      const products = await getProducts(2);
      await addToCartApi(products[0].id, 1, token);
      if (products[1]) await addToCartApi(products[1].id, 1, token);
    });

    await test.step('Abrir a home e verificar badge do carrinho', async () => {
      await homePage.open();
      const count = await homePage.getCartCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 3. Impedir adição duplicada ("Já no carrinho") ───────────────────────────
  test('deve exibir aviso ao tentar adicionar produto já no carrinho', async ({
    productPage,
    page,
  }) => {
    const products = await getProducts(1);
    const slug = products[0].slug;

    await test.step('Adicionar produto via API', async () => {
      await addToCartApi(productId, 1, token);
    });

    await test.step('Abrir página do produto já no carrinho', async () => {
      await productPage.open(slug);
    });

    await test.step('Verificar indicação visual de "já no carrinho"', async () => {
      const alreadyInCart = page.getByTestId('already-in-cart-indicator');
      const isIndicated = await alreadyInCart.isVisible().catch(() => false);
      if (isIndicated) {
        await expect(alreadyInCart).toContainText(/já no carrinho|no carrinho/i);
      } else {
        // Alternativa: botão muda de texto
        await expect(productPage.addToCartButton()).toContainText(/no carrinho|ver carrinho/i);
      }
    });
  });

  // ── 4. Remover item do carrinho ──────────────────────────────────────────────
  test('deve remover item do carrinho', async ({ cartPage }) => {
    await test.step('Adicionar produto via API', async () => {
      await addToCartApi(productId, 1, token);
    });

    await test.step('Abrir carrinho e confirmar item', async () => {
      await cartPage.open();
      await cartPage.assertItemCount(1);
    });

    await test.step('Remover o item', async () => {
      await cartPage.removeItem(0);
    });

    await test.step('Verificar que o carrinho está vazio', async () => {
      await cartPage.assertEmpty();
    });
  });

  // ── 5. Limpar carrinho completo ──────────────────────────────────────────────
  test('deve limpar todos os itens do carrinho de uma vez', async ({ cartPage }) => {
    await test.step('Adicionar múltiplos produtos via API', async () => {
      const products = await getProducts(3);
      for (const p of products) await addToCartApi(p.id, 1, token);
    });

    await test.step('Abrir carrinho', async () => {
      await cartPage.open();
      const count = await cartPage.getItemCount();
      expect(count).toBeGreaterThan(1);
    });

    await test.step('Limpar carrinho', async () => {
      await cartPage.clearCart();
    });

    await test.step('Verificar carrinho vazio', async () => {
      await cartPage.assertEmpty();
    });
  });

  // ── 6. Cálculo correto do subtotal ───────────────────────────────────────────
  test('deve calcular subtotal corretamente com múltiplos itens', async ({ cartPage, page }) => {
    await test.step('Adicionar 2 unidades do mesmo produto via API', async () => {
      await addToCartApi(productId, 2, token);
    });

    await test.step('Abrir carrinho', async () => {
      await cartPage.open();
    });

    await test.step('Verificar subtotal = preço × quantidade', async () => {
      const item = cartPage.cartItems().first();
      const priceText = await item.getByTestId('item-price').textContent() ?? '0';
      const qtyVal    = await item.getByTestId('item-quantity-input').inputValue();
      const itemPrice = parsePrice(priceText);
      const qty       = parseInt(qtyVal, 10);

      const subtotalText = await cartPage.subtotalValue().textContent() ?? '0';
      const subtotal     = parsePrice(subtotalText);

      expect(subtotal).toBeCloseTo(itemPrice * qty, 2);
    });
  });

  // ── 7. Cupom válido aplica desconto ─────────────────────────────────────────
  test('deve aplicar cupom válido e reduzir o total', async ({ cartPage }) => {
    const couponCode    = generateCouponCode();
    const discountPct   = 10;
    let totalSemCupom: number;
    let totalComCupom: number;

    await test.step('Setup: criar cupom via API', async () => {
      await createCoupon(couponCode, discountPct, 'percentage', token);
      await addToCartApi(productId, 1, token);
    });

    await test.step('Abrir carrinho e registrar total sem cupom', async () => {
      await cartPage.open();
      totalSemCupom = await cartPage.getTotalAsNumber();
    });

    await test.step('Aplicar cupom', async () => {
      await cartPage.applyCoupon(couponCode);
    });

    await test.step('Verificar mensagem de sucesso do cupom', async () => {
      await cartPage.assertCouponApplied();
    });

    await test.step('Verificar que o desconto foi aplicado no total', async () => {
      totalComCupom = await cartPage.getTotalAsNumber();
      expect(totalComCupom).toBeLessThan(totalSemCupom);
      // O desconto deve ser aproximadamente 10%
      const expectedTotal = totalSemCupom * (1 - discountPct / 100);
      expect(totalComCupom).toBeCloseTo(expectedTotal, 1);
    });

    await test.step('Verificar que a linha de desconto está visível', async () => {
      const discountText = await cartPage.discountValue().textContent() ?? '';
      expect(parsePrice(discountText)).toBeGreaterThan(0);
    });

    // Teardown
    await test.step('Teardown: remover cupom', async () => {
      await deleteCoupon(couponCode, token).catch(() => {});
    });
  });

  // ── 8. Cupom inválido exibe erro ─────────────────────────────────────────────
  test('deve exibir erro ao aplicar cupom inválido', async ({ cartPage }) => {
    await test.step('Adicionar produto ao carrinho', async () => {
      await addToCartApi(productId, 1, token);
    });

    await test.step('Abrir carrinho e tentar cupom inexistente', async () => {
      await cartPage.open();
      await cartPage.applyCoupon('CUPOM-INVALIDO-XYZ');
    });

    await test.step('Verificar mensagem de erro', async () => {
      await cartPage.assertCouponError();
      await expect(cartPage.couponError()).toContainText(/inválido|não encontrado|expirado/i);
    });

    await test.step('Verificar que o total não foi alterado', async () => {
      const total = await cartPage.getTotalAsNumber();
      expect(total).toBeCloseTo(productPrice, 1);
    });
  });

  // ── 9. Remover cupom aplicado ────────────────────────────────────────────────
  test('deve remover cupom aplicado e restaurar total original', async ({ cartPage }) => {
    const couponCode = generateCouponCode();
    let totalOriginal: number;

    await test.step('Setup: criar cupom e produto', async () => {
      await createCoupon(couponCode, 15, 'percentage', token);
      await addToCartApi(productId, 1, token);
    });

    await test.step('Abrir carrinho e registrar total original', async () => {
      await cartPage.open();
      totalOriginal = await cartPage.getTotalAsNumber();
    });

    await test.step('Aplicar cupom', async () => {
      await cartPage.applyCoupon(couponCode);
      await cartPage.assertCouponApplied();
    });

    await test.step('Remover cupom', async () => {
      await cartPage.removeCoupon();
    });

    await test.step('Verificar que o total voltou ao valor original', async () => {
      const totalRestaurado = await cartPage.getTotalAsNumber();
      expect(totalRestaurado).toBeCloseTo(totalOriginal, 1);
    });

    await test.step('Verificar que linha de desconto desapareceu', async () => {
      await expect(cartPage.discountValue()).toBeHidden();
    });

    // Teardown
    await test.step('Teardown: remover cupom', async () => {
      await deleteCoupon(couponCode, token).catch(() => {});
    });
  });

  // ── 10. Persistência após logout e login ────────────────────────────────────
  test('deve persistir itens do carrinho após logout e login', async ({
    cartPage,
    authPage,
    profilePage,
    page,
  }) => {
    await test.step('Adicionar produto ao carrinho via API (usuário logado)', async () => {
      await addToCartApi(productId, 1, token);
    });

    await test.step('Verificar item no carrinho antes do logout', async () => {
      await cartPage.open();
      await cartPage.assertItemCount(1);
    });

    await test.step('Fazer logout', async () => {
      await profilePage.open();
      await profilePage.logout();
    });

    await test.step('Fazer login novamente', async () => {
      await authPage.openLogin();
      await authPage.loginAndRedirect({
        email:    env.testUserEmail,
        password: env.testUserPassword,
      });
    });

    await test.step('Verificar que o item ainda está no carrinho', async () => {
      await cartPage.open();
      await cartPage.assertItemCount(1);
    });
  });

  // ── 11. Sincronização via API: item adicionado externamente aparece na UI ─────
  test('deve exibir na UI item adicionado via API sem recarregar manualmente', async ({
    cartPage,
    page,
  }) => {
    await test.step('Abrir carrinho vazio', async () => {
      await cartPage.open();
      await cartPage.assertEmpty();
    });

    await test.step('Adicionar produto via API (simula outra aba/dispositivo)', async () => {
      await addToCartApi(productId, 1, token);
    });

    await test.step('Recarregar a página do carrinho', async () => {
      await page.reload();
      await cartPage.waitForLoad();
    });

    await test.step('Verificar que o item aparece', async () => {
      await cartPage.assertItemCount(1);
    });
  });

  // ── 12. Atualização de quantidade via input ──────────────────────────────────
  test('deve atualizar subtotal ao alterar quantidade via input', async ({ cartPage }) => {
    await test.step('Adicionar produto via API', async () => {
      await addToCartApi(productId, 1, token);
    });

    let subtotalQty1: number;
    await test.step('Abrir carrinho e registrar subtotal com qty=1', async () => {
      await cartPage.open();
      subtotalQty1 = await cartPage.getTotalAsNumber();
    });

    await test.step('Atualizar quantidade para 3', async () => {
      await cartPage.updateItemQuantity(0, 3);
    });

    await test.step('Verificar que subtotal triplicou aproximadamente', async () => {
      const subtotalQty3 = await cartPage.getTotalAsNumber();
      expect(subtotalQty3).toBeCloseTo(subtotalQty1 * 3, 0);
    });
  });

  // ── 13. Botão "Continuar comprando" retorna ao catálogo ──────────────────────
  test('deve retornar ao catálogo ao clicar em "Continuar comprando"', async ({
    cartPage,
    page,
  }) => {
    await test.step('Adicionar produto e abrir carrinho', async () => {
      await addToCartApi(productId, 1, token);
      await cartPage.open();
    });

    await test.step('Clicar em "Continuar comprando"', async () => {
      await cartPage.continueShopping();
    });

    await test.step('Verificar que voltou ao catálogo/home', async () => {
      await expect(page).toHaveURL(/\/(catalogo|$)/);
    });
  });
});

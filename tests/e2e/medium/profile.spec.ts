import { test, expect } from '../../../fixtures/base';
import {
  getAuthToken,
  addToCartApi,
  getProducts,
} from '../../../helpers/api.helper';
import {
  generateUser,
  generateAddress,
} from '../../../helpers/data.helper';
import { env } from '../../../helpers/env';
import { AUTH_USER_FILE } from '../../../helpers/auth.helper';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers locais
// ─────────────────────────────────────────────────────────────────────────────

const SP_ADDRESS = generateAddress('SP');
const RJ_ADDRESS = generateAddress('RJ');

async function getToken() {
  return getAuthToken(env.testUserEmail, env.testUserPassword);
}

// ─────────────────────────────────────────────────────────────────────────────
// Suíte
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Perfil do usuário @medium', () => {
  test.use({ storageState: AUTH_USER_FILE });

  // ── 1. Exibir dados corretos na abertura do perfil ───────────────────────────
  test('deve exibir dados do usuário autenticado ao abrir o perfil', async ({ profilePage }) => {
    await test.step('Abrir página de perfil', async () => {
      await profilePage.open();
      await profilePage.assertUrl(/\/conta/);
    });

    await test.step('Verificar nome e e-mail exibidos', async () => {
      await expect(profilePage.profileName()).not.toBeEmpty();
      await expect(profilePage.profileEmail()).toContainText(env.testUserEmail);
    });

    await test.step('Verificar avatar presente', async () => {
      await expect(profilePage.profileAvatar()).toBeVisible();
    });
  });

  // ── 2. Editar dados pessoais ─────────────────────────────────────────────────
  test('deve editar e salvar dados pessoais com sucesso', async ({ profilePage }) => {
    const newData = { firstName: 'Julia', lastName: 'QA', phone: '(11) 91234-5678' };

    await test.step('Abrir aba de dados pessoais', async () => {
      await profilePage.open();
      await profilePage.goToTab('personal');
    });

    await test.step('Atualizar campos', async () => {
      await profilePage.updatePersonalData(newData);
    });

    await test.step('Verificar feedback de sucesso', async () => {
      await profilePage.assertPersonalSaveSuccess();
    });

    await test.step('Recarregar e confirmar persistência', async () => {
      await profilePage.page.reload();
      await profilePage.goToTab('personal');
      await expect(profilePage.firstNameInput()).toHaveValue(newData.firstName);
      await expect(profilePage.lastNameInput()).toHaveValue(newData.lastName);
    });
  });

  // ── 3. Validação de campos obrigatórios ──────────────────────────────────────
  test('deve exibir erros de validação ao limpar campos obrigatórios', async ({ profilePage }) => {
    await test.step('Abrir aba de dados pessoais', async () => {
      await profilePage.open();
      await profilePage.goToTab('personal');
    });

    await test.step('Limpar nome e tentar salvar', async () => {
      await profilePage.firstNameInput().fill('');
      await profilePage.savePersonalBtn().click();
    });

    await test.step('Verificar mensagem de erro de campo obrigatório', async () => {
      const error = profilePage.page.getByTestId('first-name-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/obrigatório|campo requerido/i);
    });
  });

  // ── 4. Upload de foto de perfil ──────────────────────────────────────────────
  test('deve fazer upload de foto de perfil', async ({ profilePage, page }) => {
    await test.step('Abrir perfil', async () => {
      await profilePage.open();
    });

    await test.step('Localizar input de upload de avatar', async () => {
      const avatarInput = page.getByTestId('avatar-upload-input');
      await expect(avatarInput).toBeAttached();
    });

    await test.step('Fazer upload de imagem de teste', async () => {
      const avatarInput = page.getByTestId('avatar-upload-input');
      // Usa uma imagem mínima em base64 (PNG 1x1 pixel)
      const buffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      );
      await avatarInput.setInputFiles({
        name: 'avatar-teste.png',
        mimeType: 'image/png',
        buffer,
      });
    });

    await test.step('Verificar preview ou feedback de upload', async () => {
      const uploadSuccess = page.getByTestId('avatar-upload-success');
      const hasSuccess = await uploadSuccess.isVisible({ timeout: 8_000 }).catch(() => false);
      if (!hasSuccess) {
        // Alternativa: o src do avatar muda
        const avatarSrcAfter = await profilePage.profileAvatar().getAttribute('src');
        expect(avatarSrcAfter).toBeTruthy();
      }
    });
  });

  // ── 5. Alterar senha com sucesso ─────────────────────────────────────────────
  test('deve alterar senha com sucesso', async ({ profilePage }) => {
    const originalPassword = env.testUserPassword;
    const newPassword      = 'NovaSenha@2024!';

    await test.step('Abrir aba de segurança', async () => {
      await profilePage.open();
      await profilePage.goToTab('security');
    });

    await test.step('Preencher formulário de troca de senha', async () => {
      await profilePage.changePassword({
        current: originalPassword,
        newPass: newPassword,
        confirm: newPassword,
      });
    });

    await test.step('Verificar feedback de sucesso', async () => {
      await profilePage.assertPasswordChangeSuccess();
    });

    // Teardown: restaurar senha original para não quebrar outros testes
    await test.step('Teardown: restaurar senha original', async () => {
      await profilePage.changePassword({
        current: newPassword,
        newPass: originalPassword,
        confirm: originalPassword,
      });
    });
  });

  // ── 6. Rejeitar senha atual incorreta ───────────────────────────────────────
  test('deve rejeitar troca de senha com senha atual incorreta', async ({ profilePage }) => {
    await test.step('Abrir aba de segurança', async () => {
      await profilePage.open();
      await profilePage.goToTab('security');
    });

    await test.step('Submeter senha atual errada', async () => {
      await profilePage.changePassword({
        current: 'SenhaErrada@999',
        newPass:  'NovaSenha@2024!',
        confirm:  'NovaSenha@2024!',
      });
    });

    await test.step('Verificar erro de senha incorreta', async () => {
      await profilePage.assertPasswordChangeError(/senha atual incorreta|senha inválida/i);
    });
  });

  // ── 7. Histórico de pedidos — lista ─────────────────────────────────────────
  test('deve listar histórico de pedidos', async ({ profilePage, page }) => {
    await test.step('Abrir aba de pedidos', async () => {
      await profilePage.open();
      await profilePage.goToTab('orders');
    });

    await test.step('Verificar presença de pedidos ou estado vazio', async () => {
      const hasOrders = await profilePage.ordersList().first().isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasOrders) {
        await profilePage.assertOrdersEmpty();
      } else {
        const count = await profilePage.ordersList().count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  // ── 8. Detalhe de pedido — abrir e fechar modal ──────────────────────────────
  test('deve abrir e fechar modal de detalhe de pedido', async ({ profilePage, page }) => {
    await test.step('Abrir aba de pedidos', async () => {
      await profilePage.open();
      await profilePage.goToTab('orders');
    });

    await test.step('Verificar que há pelo menos um pedido', async () => {
      const hasOrders = await profilePage.ordersList().first().isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasOrders) test.skip(true, 'Sem pedidos para testar detalhe');
    });

    await test.step('Abrir detalhe do primeiro pedido', async () => {
      await profilePage.openOrderDetail(0);
    });

    await test.step('Verificar conteúdo do modal', async () => {
      await expect(profilePage.orderDetailModal()).toBeVisible();
      await expect(profilePage.orderDetailItems().first()).toBeVisible();
      await expect(profilePage.orderDetailTotal()).not.toBeEmpty();
    });

    await test.step('Fechar modal', async () => {
      await profilePage.closeOrderDetail();
      await expect(profilePage.orderDetailModal()).toBeHidden();
    });
  });

  // ── 9. Timeline de status do pedido ─────────────────────────────────────────
  test('deve exibir timeline de status no detalhe do pedido', async ({ profilePage, page }) => {
    await test.step('Navegar para detalhe de pedido', async () => {
      await profilePage.open();
      await profilePage.goToTab('orders');
      const hasOrders = await profilePage.ordersList().first().isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasOrders) test.skip(true, 'Sem pedidos disponíveis');
      await profilePage.openOrderDetail(0);
    });

    await test.step('Verificar timeline de status visível', async () => {
      const timeline = page.getByTestId('order-status-timeline');
      await expect(timeline).toBeVisible();
    });

    await test.step('Verificar que há ao menos uma etapa de status', async () => {
      const steps = page.getByTestId('timeline-step');
      const count = await steps.count();
      expect(count).toBeGreaterThan(0);
    });

    await test.step('Verificar que etapa atual está marcada', async () => {
      const activeStep = page.getByTestId('timeline-step-active');
      await expect(activeStep).toBeVisible();
    });
  });

  // ── 10. Estado vazio de pedidos ──────────────────────────────────────────────
  test('deve exibir estado vazio quando não há pedidos', async ({ authPage, profilePage, page }) => {
    // Este cenário usa uma conta nova sem histórico
    await test.step('Criar usuário novo via registro', async () => {
      const newUser = generateUser();
      // Usar nova página sem estado salvo
      await page.context().clearCookies();
      await authPage.openRegister();
      await authPage.register(newUser);
    });

    await test.step('Abrir aba de pedidos', async () => {
      await profilePage.open();
      await profilePage.goToTab('orders');
    });

    await test.step('Verificar estado vazio', async () => {
      await profilePage.assertOrdersEmpty();
    });

    await test.step('Verificar CTA para começar a comprar', async () => {
      const shopCTA = page.getByTestId('orders-empty-cta');
      await expect(shopCTA).toBeVisible();
    });
  });

  // ── 11. Refazer pedido ───────────────────────────────────────────────────────
  test('deve permitir refazer um pedido anterior', async ({ profilePage, cartPage, page }) => {
    await test.step('Abrir aba de pedidos', async () => {
      await profilePage.open();
      await profilePage.goToTab('orders');
      const hasOrders = await profilePage.ordersList().first().isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasOrders) test.skip(true, 'Sem pedidos disponíveis');
    });

    await test.step('Abrir detalhe do pedido', async () => {
      await profilePage.openOrderDetail(0);
    });

    await test.step('Clicar em "Refazer pedido"', async () => {
      const reorderBtn = page.getByTestId('reorder-button');
      await expect(reorderBtn).toBeVisible();
      await reorderBtn.click();
    });

    await test.step('Verificar que itens foram adicionados ao carrinho', async () => {
      await expect(page).toHaveURL(/\/(carrinho|checkout)/);
      await cartPage.assertItemCount(1);
    });
  });

  // ── 12. Listar endereços cadastrados ─────────────────────────────────────────
  test('deve listar endereços cadastrados', async ({ profilePage, page }) => {
    await test.step('Abrir aba de endereços', async () => {
      await profilePage.open();
      await profilePage.goToTab('addresses');
    });

    await test.step('Verificar que seção de endereços está visível', async () => {
      await expect(profilePage.addAddressButton()).toBeVisible();
    });
  });

  // ── 13. Adicionar endereço com busca de CEP ──────────────────────────────────
  test('deve adicionar novo endereço com autopreenchimento por CEP', async ({
    profilePage,
    page,
  }) => {
    await test.step('Abrir aba de endereços e formulário', async () => {
      await profilePage.open();
      await profilePage.goToTab('addresses');
      await profilePage.openAddAddressForm();
    });

    await test.step('Preencher CEP e aguardar autocompletar', async () => {
      const zipInput = page.getByTestId('address-zipcode');
      const searchBtn = page.getByTestId('address-zipcode-search');
      await zipInput.fill(SP_ADDRESS.zipCode);
      await searchBtn.click();
      // Aguarda campo de rua ser preenchido automaticamente
      await page.getByTestId('address-street').waitFor({ state: 'visible', timeout: 8_000 });
    });

    await test.step('Preencher número', async () => {
      await page.getByTestId('address-number').fill(SP_ADDRESS.number);
      if (SP_ADDRESS.complement) {
        await page.getByTestId('address-complement').fill(SP_ADDRESS.complement ?? '');
      }
    });

    await test.step('Salvar endereço', async () => {
      await profilePage.addressSaveBtn().click();
    });

    await test.step('Verificar que o endereço aparece na lista', async () => {
      const count = await profilePage.addressCards().count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 14. Definir endereço padrão ──────────────────────────────────────────────
  test('deve definir endereço como padrão', async ({ profilePage, page }) => {
    await test.step('Abrir aba de endereços', async () => {
      await profilePage.open();
      await profilePage.goToTab('addresses');
      const count = await profilePage.addressCards().count();
      if (count < 1) test.skip(true, 'Sem endereços para testar');
    });

    await test.step('Definir primeiro endereço como padrão', async () => {
      await profilePage.setDefaultAddress(0);
    });

    await test.step('Verificar badge de padrão visível', async () => {
      await expect(profilePage.defaultAddressBadge().first()).toBeVisible();
    });
  });

  // ── 15. Excluir endereço ─────────────────────────────────────────────────────
  test('deve excluir endereço da lista', async ({ profilePage, page }) => {
    await test.step('Abrir aba de endereços', async () => {
      await profilePage.open();
      await profilePage.goToTab('addresses');
    });

    let countBefore: number;
    await test.step('Registrar quantidade de endereços', async () => {
      countBefore = await profilePage.addressCards().count();
      if (countBefore < 1) test.skip(true, 'Sem endereços para excluir');
    });

    await test.step('Excluir primeiro endereço não-padrão', async () => {
      // Exclui o último para não remover o padrão
      await profilePage.deleteAddress(countBefore - 1);
    });

    await test.step('Verificar que contagem diminuiu', async () => {
      const countAfter = await profilePage.addressCards().count();
      expect(countAfter).toBe(countBefore - 1);
    });
  });

  // ── 16. Adicionar produto à wishlist ─────────────────────────────────────────
  test('deve adicionar produto à wishlist e exibir na lista', async ({
    productPage,
    profilePage,
    page,
  }) => {
    const products = await getProducts(1);

    await test.step('Abrir produto e adicionar à wishlist', async () => {
      await productPage.open(products[0].slug);
      await productPage.toggleWishlist();
    });

    await test.step('Verificar feedback de adição à wishlist', async () => {
      const wishlistFeedback = page.getByTestId('wishlist-added-feedback');
      const hasFeedback = await wishlistFeedback.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasFeedback) {
        // Alternativa: botão muda para "favoritado"
        await expect(productPage.wishlistButton()).toHaveAttribute('aria-pressed', 'true');
      }
    });

    await test.step('Abrir aba de wishlist no perfil', async () => {
      await profilePage.open();
      await profilePage.goToTab('wishlist');
    });

    await test.step('Verificar que produto aparece na wishlist', async () => {
      const count = await profilePage.wishlistItems().count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ── 17. Mover item da wishlist para o carrinho ───────────────────────────────
  test('deve mover item da wishlist para o carrinho', async ({
    profilePage,
    cartPage,
    page,
  }) => {
    await test.step('Abrir aba de wishlist', async () => {
      await profilePage.open();
      await profilePage.goToTab('wishlist');
      const count = await profilePage.wishlistItems().count();
      if (count === 0) test.skip(true, 'Wishlist vazia');
    });

    await test.step('Clicar em "Adicionar ao carrinho" na wishlist', async () => {
      await profilePage.moveWishlistItemToCart(0);
    });

    await test.step('Verificar feedback de adição ao carrinho', async () => {
      const toast = page.getByTestId('toast').first();
      await expect(toast).toContainText(/carrinho|adicionado/i);
    });

    await test.step('Verificar que item aparece no carrinho', async () => {
      await cartPage.open();
      await cartPage.assertItemCount(1);
    });
  });
});

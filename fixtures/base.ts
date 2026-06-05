import { test as base, expect } from '@playwright/test';
import { HomePage }     from '../pages/HomePage';
import { ProductPage }  from '../pages/ProductPage';
import { CartPage }     from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { SearchPage }   from '../pages/SearchPage';
import { AuthPage }     from '../pages/AuthPage';
import { ProfilePage }  from '../pages/ProfilePage';

export type BaloneFixtures = {
  homePage:     HomePage;
  productPage:  ProductPage;
  cartPage:     CartPage;
  checkoutPage: CheckoutPage;
  searchPage:   SearchPage;
  authPage:     AuthPage;
  profilePage:  ProfilePage;
};

/**
 * Extensão do test() do Playwright com todos os Page Objects do projeto Balone.
 * Importe este `test` em vez do padrão em todos os spec files.
 *
 * @example
 * import { test, expect } from '../fixtures/base';
 *
 * test('busca retorna resultados', async ({ searchPage }) => {
 *   await searchPage.open('vestido');
 *   await searchPage.assertHasResults();
 * });
 */
export const test = base.extend<BaloneFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
});

export { expect };

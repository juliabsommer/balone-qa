import { test as base, expect } from '@playwright/test';
import { SitePage }     from '../pages/SitePage';
import { CatalogoPage } from '../pages/CatalogoPage';

export type BalonFixtures = {
  site:     SitePage;
  catalogo: CatalogoPage;
};

/**
 * Extensão do test() com os dois Page Objects do projeto Balonê.
 *
 * @example
 * import { test, expect } from '../../fixtures/base';
 *
 * test('hero visível', async ({ site }) => {
 *   await site.open();
 *   await expect(site.heroTagline()).toBeVisible();
 * });
 */
export const test = base.extend<BalonFixtures>({
  site: async ({ page }, use) => {
    await use(new SitePage(page));
  },
  catalogo: async ({ page }, use) => {
    await use(new CatalogoPage(page));
  },
});

export { expect };

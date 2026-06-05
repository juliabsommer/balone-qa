import { Page } from '@playwright/test';

/** Aguarda a rede ficar ociosa (útil após navegações SPA). */
export async function waitForNetworkIdle(page: Page, timeout = 5_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/** Aguarda um elemento aparecer e ser visível. */
export async function waitForVisible(page: Page, selector: string, timeout = 10_000) {
  return page.waitForSelector(selector, { state: 'visible', timeout });
}

/** Aguarda um elemento desaparecer. */
export async function waitForHidden(page: Page, selector: string, timeout = 10_000) {
  return page.waitForSelector(selector, { state: 'hidden', timeout });
}

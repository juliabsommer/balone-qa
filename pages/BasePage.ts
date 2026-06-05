import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(readonly page: Page) {}

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  async navigate(path = '/'): Promise<this> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
    return this;
  }

  async waitForLoad(): Promise<this> {
    await this.page.waitForLoadState('domcontentloaded');
    return this;
  }

  async assertUrl(pattern: string | RegExp): Promise<this> {
    await expect(this.page).toHaveURL(pattern);
    return this;
  }

  async assertTitle(expected: string | RegExp): Promise<this> {
    await expect(this.page).toHaveTitle(expected);
    return this;
  }

  async scrollToBottom(): Promise<this> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(500);
    return this;
  }

  url(): string {
    return this.page.url();
  }
}

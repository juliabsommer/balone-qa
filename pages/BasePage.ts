import { Page, Locator, expect, Response } from '@playwright/test';

export abstract class BasePage {
  constructor(readonly page: Page) {}

  // ── Locators ──────────────────────────────────────────────────────────────

  /** Localiza elemento pelo atributo data-testid. */
  getByTestId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  /** Localiza elemento por role acessível. */
  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  /** Localiza elemento por texto visível. */
  getByText(text: string | RegExp, options?: Parameters<Page['getByText']>[1]): Locator {
    return this.page.getByText(text, options);
  }

  /** Localiza elemento por label de formulário. */
  getByLabel(label: string | RegExp): Locator {
    return this.page.getByLabel(label);
  }

  /** Localiza elemento por placeholder. */
  getByPlaceholder(placeholder: string | RegExp): Locator {
    return this.page.getByPlaceholder(placeholder);
  }

  // ── Navegação & Loading ───────────────────────────────────────────────────

  /** Navega para um path relativo à baseURL. */
  async navigate(path = '/'): Promise<this> {
    await this.page.goto(path);
    await this.waitForLoad();
    return this;
  }

  /** Aguarda a página terminar de carregar (DOM + rede ociosa). */
  async waitForLoad(): Promise<this> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {
      // networkidle pode timeout em páginas com polling; ignora silenciosamente
    });
    return this;
  }

  /**
   * Aguarda uma resposta de API e a retorna.
   * @param urlPattern - URL ou padrão glob/regex da request a aguardar
   * @param action     - Função que dispara a request (ex: clicar em "Confirmar")
   */
  async waitForAPI(
    urlPattern: string | RegExp,
    action: () => Promise<void>,
  ): Promise<Response> {
    const [response] = await Promise.all([
      this.page.waitForResponse(urlPattern),
      action(),
    ]);
    return response;
  }

  // ── Asserções ─────────────────────────────────────────────────────────────

  /** Verifica se a URL atual contém o padrão informado. */
  async assertUrl(pattern: string | RegExp): Promise<this> {
    await expect(this.page).toHaveURL(pattern);
    return this;
  }

  /** Verifica o título da página. */
  async assertTitle(expected: string | RegExp): Promise<this> {
    await expect(this.page).toHaveTitle(expected);
    return this;
  }

  /** Verifica que um data-testid está visível. */
  async assertVisible(testId: string): Promise<this> {
    await expect(this.getByTestId(testId)).toBeVisible();
    return this;
  }

  /** Verifica que um data-testid não está visível. */
  async assertHidden(testId: string): Promise<this> {
    await expect(this.getByTestId(testId)).toBeHidden();
    return this;
  }

  // ── Acessibilidade ────────────────────────────────────────────────────────

  /**
   * Verifica violações de acessibilidade usando axe-core via injeção de script.
   * Requer que axe-core esteja disponível ou seja injetado.
   */
  async checkA11y(): Promise<this> {
    await this.page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js',
    });
    const violations = await this.page.evaluate(async () => {
      // @ts-ignore — axe é injetado em runtime
      const results = await window.axe.run();
      return results.violations;
    });
    if (violations.length > 0) {
      const summary = violations
        .map((v: { id: string; description: string; nodes: unknown[] }) =>
          `[${v.id}] ${v.description} (${v.nodes.length} nó(s))`,
        )
        .join('\n');
      throw new Error(`Violações de acessibilidade encontradas:\n${summary}`);
    }
    return this;
  }

  // ── Utilitários ───────────────────────────────────────────────────────────

  /** Tira screenshot e salva com o nome fornecido. */
  async screenshot(name: string, fullPage = true): Promise<this> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage,
    });
    return this;
  }

  /** Rola até o final da página. */
  async scrollToBottom(): Promise<this> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    return this;
  }

  /** Fecha toasts / snackbars visíveis. */
  async dismissToast(): Promise<this> {
    const toast = this.page
      .locator('[role="alert"], [data-testid="toast"], .toast, .snackbar')
      .first();
    if (await toast.isVisible()) await toast.click();
    return this;
  }

  /** Retorna o texto de um data-testid. */
  async getText(testId: string): Promise<string> {
    return (await this.getByTestId(testId).textContent()) ?? '';
  }

  /** Retorna a URL atual. */
  url(): string {
    return this.page.url();
  }
}

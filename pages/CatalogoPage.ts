import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object para o catálogo online — catalogobalone.netlify.app
 *
 * Funcionamento real:
 *   - SPA com duas categorias: 🏺 Mini Museu · 🔮 Espaço Boho
 *   - Usuário toca/clica nos cards de produto para selecionar
 *   - Contador mostra "Nenhuma peça selecionada" / "X peça(s) selecionada(s)"
 *   - Botão "Enviar pedido" abre WhatsApp com as peças selecionadas na mensagem
 */
export class CatalogoPage extends BasePage {
  static readonly URL = 'https://catalogobalone.netlify.app/';

  // ── Categorias ─────────────────────────────────────────────────────────────
  readonly btnTudo       = () => this.page.getByRole('button', { name: /^Tudo$/i })
                                   .or(this.page.getByText(/^Tudo$/i)).first();
  readonly btnMiniMuseu  = () => this.page.getByRole('button', { name: /Mini Museu/i })
                                   .or(this.page.getByText(/Mini Museu/i)).first();
  readonly btnBoho       = () => this.page.getByRole('button', { name: /Espaço Boho/i })
                                   .or(this.page.getByText(/Espaço Boho/i)).first();

  readonly secaoMiniMuseu = () => this.page.locator('#js-museu-section, [id*="museu"]').first();
  readonly secaoBoho      = () => this.page.locator('#js-boho-section, [id*="boho"]').first();

  // ── Cards de produto ───────────────────────────────────────────────────────
  /** Cards principais de produto. Exclui wrappers internos como card-foto. */
  readonly cards         = () => this.page.locator('[class*="card"]:not([class*="card-"])').filter({ has: this.page.locator('img') });

  // ── Contador e ação ────────────────────────────────────────────────────────
  readonly contadorTexto  = () => this.page.getByText(/peça.*selecionada|nenhuma peça/i);
  readonly btnEnviarPedido = () => this.page.getByRole('button', { name: /Enviar pedido/i })
                                     .or(this.page.getByRole('link', { name: /Enviar pedido/i }))
                                     .or(this.page.getByText(/Enviar pedido/i)).first();

  // ── Ações ──────────────────────────────────────────────────────────────────

  /** Abre o catálogo. */
  async open(): Promise<this> {
    await this.page.goto(CatalogoPage.URL);
    await this.waitForLoad();
    // Aguarda produtos aparecerem
    await this.page.waitForSelector('img', { timeout: 10_000 }).catch(() => {});
    return this;
  }

  /**
   * Clica em um card de produto pelo índice (0-based).
   * Retorna o título do produto clicado, se encontrado.
   */
  async selecionarProduto(index = 0): Promise<string> {
    const card = this.cards().nth(index);
    const title = await card.locator('h2, h3, p, span').first().textContent().catch(() => '');
    await card.click();
    return title?.trim() ?? '';
  }

  /** Clica no filtro Mini Museu. */
  async filtrarMiniMuseu(): Promise<this> {
    await this.btnMiniMuseu().click();
    await this.page.waitForTimeout(500); // animação de filtro
    return this;
  }

  /** Clica no filtro Espaço Boho. */
  async filtrarBoho(): Promise<this> {
    await this.btnBoho().click();
    await this.page.waitForTimeout(500);
    return this;
  }

  /** Clica em "Tudo" para remover o filtro de categoria. */
  async filtrarTudo(): Promise<this> {
    await this.btnTudo().click();
    await this.page.waitForTimeout(500);
    return this;
  }

  /**
   * Retorna o número de peças selecionadas lendo o texto do contador.
   * "Nenhuma peça selecionada" → 0
   * "1 peça selecionada" → 1
   * "3 peças selecionadas" → 3
   */
  async getPecasSelecionadas(): Promise<number> {
    const texto = await this.contadorTexto().textContent({ timeout: 5_000 }).catch(() => '');
    if (!texto || /nenhuma/i.test(texto)) return 0;
    const match = texto.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Captura o href do botão/link "Enviar pedido" para inspecionar
   * a URL do WhatsApp gerada (sem abrir nova aba).
   */
  async getWhatsAppUrl(): Promise<string> {
    const btn = this.btnEnviarPedido();
    const href = await btn.getAttribute('href').catch(() => null);
    if (href) return href;
    // Pode ser um <button> com onclick — tenta capturar via intercept de navegação
    return '';
  }

  /** Retorna quantos cards estão visíveis na página. */
  async contarProdutos(): Promise<number> {
    return this.cards().count();
  }
}

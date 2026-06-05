import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object para o site institucional — www.brechobalone.com.br
 *
 * Estrutura real do site:
 *   Nav: Início | Espaços | Sobre | Visite | Catálogo | Instagram
 *   Seções: #inicio · #espacos · #sobre · #visite
 *   CTAs: "Conheça a loja" (#sobre) · "Como chegar" (#visite) · "Acessar catálogo"
 *   Contato: WhatsApp (51) 99958-0604 · Instagram @brechobalonefebassi
 */
export class SitePage extends BasePage {
  // ── URLs externas ──────────────────────────────────────────────────────────
  static readonly URL_SITE     = 'https://www.brechobalone.com.br';
  static readonly URL_CATALOGO = 'https://catalogobalone.netlify.app/';
  static readonly URL_WHATSAPP = 'https://wa.me/5551999580604';
  static readonly URL_INSTAGRAM = 'https://instagram.com/brechobalonefebassi';
  static readonly URL_MAPS     = 'https://www.google.com/maps/search/?api=1&query=Av.+Cel.+Marcos,+2353,+Porto+Alegre';

  // ── Navegação ──────────────────────────────────────────────────────────────
  readonly nav              = () => this.page.locator('nav');
  readonly navInicio        = () => this.page.locator('nav a[href="#inicio"], nav a[href*="inicio"]').first();
  readonly navEspacos       = () => this.page.locator('nav a[href="#espacos"], nav a[href*="espacos"]').first();
  readonly navSobre         = () => this.page.locator('nav a[href="#sobre"], nav a[href*="sobre"]').first();
  readonly navVisite        = () => this.page.locator('nav a[href="#visite"], nav a[href*="visite"]').first();
  readonly navCatalogo      = () => this.page.locator('nav a[href*="catalogobalone"]');
  readonly navInstagram     = () => this.page.locator('nav a[href*="instagram"]');

  // ── Hero / Seção inicial ───────────────────────────────────────────────────
  readonly heroSection      = () => this.page.locator('#inicio, section').first();
  readonly heroTagline      = () => this.page.getByText('Viva essa experiência');
  readonly btnConhecaLoja   = () => this.page.getByRole('link', { name: /Conheça a loja/i });
  readonly btnComoChegar    = () => this.page.getByRole('link', { name: /Como chegar/i });

  // ── Seção catálogo online ──────────────────────────────────────────────────
  readonly secaoCatalogo    = () => this.page.getByText('Compre de onde você estiver');
  readonly btnAcessarCatalogo = () => this.page.getByRole('link', { name: /Acessar catálogo/i });

  // ── Seção como funciona ────────────────────────────────────────────────────
  readonly stepAcesseCatalogo = () => this.page.getByText('Acesse o catálogo');
  readonly stepSelecioneAmou  = () => this.page.getByText('Selecione o que amou');
  readonly stepEnvieWhatsApp  = () => this.page.getByText('Envie pelo WhatsApp');

  // ── Seção espaços ──────────────────────────────────────────────────────────
  readonly secaoEspacos     = () => this.page.locator('#espacos');
  readonly miniMuseuCard    = () => this.page.getByText('Mini Museu Balonê');
  readonly espacoBohoCard   = () => this.page.getByText('Espaço Boho');

  // ── Seção sobre ───────────────────────────────────────────────────────────
  readonly secaoSobre       = () => this.page.locator('#sobre');
  // Estrutura: <dt>14</dt><dd>anos de curadoria</dd> — número e label em elementos separados
  readonly sobre14Anos      = () => this.page.getByText(/anos de curadoria/i);
  readonly sobre500Pecas    = () => this.page.getByText(/peças por temporada/i);

  // ── Seção visite ──────────────────────────────────────────────────────────
  readonly secaoVisite      = () => this.page.locator('#visite');
  readonly enderecoTexto    = () => this.page.getByText(/Av\. Cel\. Marcos|Coronel Marcos/i).first();
  readonly linkWhatsApp     = () => this.page.locator('a[href*="wa.me"]').first();
  readonly linkMaps         = () => this.page.locator('a[href*="google.com/maps"]').first();

  // ── Footer ─────────────────────────────────────────────────────────────────
  readonly footer           = () => this.page.locator('footer');
  readonly footerInstagram  = () => this.page.locator('footer a[href*="instagram"]');
  readonly footerWhatsApp   = () => this.page.locator('footer a[href*="wa.me"]');
  readonly footerCopyright  = () => this.page.getByText(/© 2\d{3}/);

  // ── Ações ──────────────────────────────────────────────────────────────────

  /** Abre o site institucional. */
  async open(): Promise<this> {
    await this.page.goto(SitePage.URL_SITE);
    await this.waitForLoad();
    return this;
  }

  /** Rola até a seção pelo ID da âncora. */
  async scrollToSection(id: 'inicio' | 'espacos' | 'sobre' | 'visite'): Promise<this> {
    await this.page.locator(`#${id}`).scrollIntoViewIfNeeded();
    return this;
  }
}

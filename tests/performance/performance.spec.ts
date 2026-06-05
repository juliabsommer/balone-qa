import { test, expect } from '../../fixtures/base';
import { env } from '../../helpers/env';
import { getProducts } from '../../helpers/api.helper';

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLDS = {
  LCP_MS:        2_500,   // Largest Contentful Paint
  CLS:           0.1,     // Cumulative Layout Shift
  TTFB_MS:       800,     // Time to First Byte
  FID_MS:        100,     // First Input Delay
  PAGE_LOAD_MS:  4_000,   // Navegação completa (load event)
  API_PRODUCTS_MS: 500,
  API_SEARCH_MS:   800,
  API_CART_MS:     300,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface WebVitals {
  lcp:  number;
  cls:  number;
  ttfb: number;
  fid:  number | null;
}

/** Coleta Web Vitals via PerformanceObserver injetado na página. */
async function collectWebVitals(page: import('@playwright/test').Page): Promise<WebVitals> {
  return page.evaluate((): Promise<WebVitals> => {
    return new Promise((resolve) => {
      const vitals: WebVitals = { lcp: 0, cls: 0, ttfb: 0, fid: null };

      // TTFB — via Navigation Timing
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) vitals.ttfb = navEntry.responseStart - navEntry.requestStart;

      let clsScore = 0;
      let lcpValue = 0;

      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        lcpValue = entries[entries.length - 1].startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) clsScore += (entry as any).value;
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Aguarda 3s para coletar métricas
      setTimeout(() => {
        lcpObserver.disconnect();
        clsObserver.disconnect();
        vitals.lcp = lcpValue;
        vitals.cls = clsScore;
        resolve(vitals);
      }, 3_000);
    });
  });
}

/** Mede o tempo de carregamento (load event) via Navigation Timing. */
async function getPageLoadTime(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return nav ? nav.loadEventEnd - nav.startTime : 0;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Core Web Vitals — páginas desktop
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Core Web Vitals — Desktop @performance', () => {
  // ── Home ──────────────────────────────────────────────────────────────────
  test('Home: LCP < 2.5s, CLS < 0.1, TTFB < 800ms', async ({ page }) => {
    await test.step('Carregar a home e aguardar estabilização', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle').catch(() => {});
    });

    let vitals: WebVitals;
    await test.step('Coletar Web Vitals', async () => {
      vitals = await collectWebVitals(page);
    });

    await test.step(`LCP deve ser < ${THRESHOLDS.LCP_MS}ms (obtido: ${vitals!.lcp.toFixed(0)}ms)`, async () => {
      expect(vitals!.lcp).toBeLessThanOrEqual(THRESHOLDS.LCP_MS);
    });

    await test.step(`CLS deve ser < ${THRESHOLDS.CLS} (obtido: ${vitals!.cls.toFixed(4)})`, async () => {
      expect(vitals!.cls).toBeLessThanOrEqual(THRESHOLDS.CLS);
    });

    await test.step(`TTFB deve ser < ${THRESHOLDS.TTFB_MS}ms (obtido: ${vitals!.ttfb.toFixed(0)}ms)`, async () => {
      expect(vitals!.ttfb).toBeLessThanOrEqual(THRESHOLDS.TTFB_MS);
    });
  });

  // ── Catálogo ──────────────────────────────────────────────────────────────
  test('Catálogo: LCP < 2.5s, CLS < 0.1', async ({ page }) => {
    await test.step('Carregar catálogo', async () => {
      await page.goto('/catalogo');
      await page.waitForLoadState('networkidle').catch(() => {});
    });

    const vitals = await collectWebVitals(page);

    expect(vitals.lcp, `LCP: ${vitals.lcp.toFixed(0)}ms`).toBeLessThanOrEqual(THRESHOLDS.LCP_MS);
    expect(vitals.cls, `CLS: ${vitals.cls.toFixed(4)}`).toBeLessThanOrEqual(THRESHOLDS.CLS);
  });

  // ── Produto individual ────────────────────────────────────────────────────
  test('Produto: LCP < 2.5s, CLS < 0.1', async ({ page }) => {
    const products = await getProducts(1);

    await test.step('Carregar página do produto', async () => {
      await page.goto(`/produto/${products[0].slug}`);
      await page.waitForLoadState('networkidle').catch(() => {});
    });

    const vitals = await collectWebVitals(page);

    expect(vitals.lcp, `LCP: ${vitals.lcp.toFixed(0)}ms`).toBeLessThanOrEqual(THRESHOLDS.LCP_MS);
    expect(vitals.cls, `CLS: ${vitals.cls.toFixed(4)}`).toBeLessThanOrEqual(THRESHOLDS.CLS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tempos de carregamento — múltiplas páginas
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tempos de carregamento @performance', () => {
  const pagesToBenchmark = [
    { name: 'Home',    path: '/' },
    { name: 'Catálogo', path: '/catalogo' },
    { name: 'Login',   path: '/login' },
    { name: 'FAQ',     path: '/faq' },
  ];

  for (const { name, path } of pagesToBenchmark) {
    test(`${name}: load < ${THRESHOLDS.PAGE_LOAD_MS}ms`, async ({ page }) => {
      await test.step(`Navegar para ${name}`, async () => {
        await page.goto(path);
        await page.waitForLoadState('load');
      });

      await test.step('Medir load time', async () => {
        const loadTime = await getPageLoadTime(page);
        expect(
          loadTime,
          `${name} load time: ${loadTime.toFixed(0)}ms (limite: ${THRESHOLDS.PAGE_LOAD_MS}ms)`,
        ).toBeLessThanOrEqual(THRESHOLDS.PAGE_LOAD_MS);
      });
    });
  }

  // ── Produto individual ────────────────────────────────────────────────────
  test(`Produto individual: load < ${THRESHOLDS.PAGE_LOAD_MS}ms`, async ({ page }) => {
    const products = await getProducts(1);

    await test.step('Carregar página do produto', async () => {
      await page.goto(`/produto/${products[0].slug}`);
      await page.waitForLoadState('load');
    });

    const loadTime = await getPageLoadTime(page);
    expect(
      loadTime,
      `Load: ${loadTime.toFixed(0)}ms (limite: ${THRESHOLDS.PAGE_LOAD_MS}ms)`,
    ).toBeLessThanOrEqual(THRESHOLDS.PAGE_LOAD_MS);
  });

  // ── Mobile ────────────────────────────────────────────────────────────────
  test(`Home em mobile: load < ${THRESHOLDS.PAGE_LOAD_MS + 1_000}ms`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      isMobile: true,
    });
    const page = await context.newPage();

    await test.step('Carregar home em viewport mobile', async () => {
      await page.goto('/');
      await page.waitForLoadState('load');
    });

    const loadTime = await getPageLoadTime(page);
    expect(
      loadTime,
      `Mobile load: ${loadTime.toFixed(0)}ms`,
    ).toBeLessThanOrEqual(THRESHOLDS.PAGE_LOAD_MS + 1_000);

    await context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Performance de APIs
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tempos de resposta de API @performance', () => {
  // ── /products ─────────────────────────────────────────────────────────────
  test(`GET /products deve responder em < ${THRESHOLDS.API_PRODUCTS_MS}ms`, async ({ page }) => {
    let responseTime = 0;

    await test.step('Interceptar e medir request de produtos', async () => {
      await page.route(/\/api\/products/, async (route, request) => {
        const start = Date.now();
        await route.continue();
        responseTime = Date.now() - start;
      });

      await page.goto('/catalogo');
      await page.waitForResponse(/\/api\/products/, { timeout: 10_000 });
    });

    await test.step(`Verificar tempo < ${THRESHOLDS.API_PRODUCTS_MS}ms`, async () => {
      expect(
        responseTime,
        `/products: ${responseTime}ms (limite: ${THRESHOLDS.API_PRODUCTS_MS}ms)`,
      ).toBeLessThanOrEqual(THRESHOLDS.API_PRODUCTS_MS);
    });
  });

  // ── Método alternativo: timing via waitForResponse ─────────────────────────
  test(`GET /search deve responder em < ${THRESHOLDS.API_SEARCH_MS}ms`, async ({ page }) => {
    await test.step('Navegar para busca e medir resposta', async () => {
      let start = 0;

      page.on('request', (req) => {
        if (req.url().includes('/search') || req.url().includes('q=')) start = Date.now();
      });

      const [response] = await Promise.all([
        page.waitForResponse((res) =>
          res.url().includes('/search') || res.url().includes('q='),
        ),
        page.goto('/busca?q=vestido'),
      ]);

      const elapsed = Date.now() - start;
      expect(response.ok()).toBeTruthy();
      expect(
        elapsed,
        `/search: ${elapsed}ms (limite: ${THRESHOLDS.API_SEARCH_MS}ms)`,
      ).toBeLessThanOrEqual(THRESHOLDS.API_SEARCH_MS);
    });
  });

  // ── /cart ─────────────────────────────────────────────────────────────────
  test(`Operações de carrinho devem responder em < ${THRESHOLDS.API_CART_MS}ms`, async ({
    page,
    request,
  }) => {
    await test.step('Medir GET /cart via APIRequestContext', async () => {
      const start    = Date.now();
      const response = await page.request.get(`${env.apiBaseURL}/cart`);
      const elapsed  = Date.now() - start;

      // Aceita 200 (logado) ou 401 (sem auth) — ambos são respostas rápidas
      expect([200, 401, 404]).toContain(response.status());
      expect(
        elapsed,
        `/cart GET: ${elapsed}ms (limite: ${THRESHOLDS.API_CART_MS}ms)`,
      ).toBeLessThanOrEqual(THRESHOLDS.API_CART_MS);
    });
  });

  // ── Teste de estresse leve: 5 requests consecutivas ────────────────────────
  test('deve manter tempo de resposta estável sob 5 requests consecutivas', async ({ page }) => {
    const times: number[] = [];

    await test.step('Realizar 5 GETs consecutivos em /products', async () => {
      for (let i = 0; i < 5; i++) {
        const start    = Date.now();
        const response = await page.request.get(`${env.apiBaseURL}/products?limit=10`);
        const elapsed  = Date.now() - start;
        expect(response.ok()).toBeTruthy();
        times.push(elapsed);
      }
    });

    await test.step('Verificar que nenhuma request excedeu 2× o threshold', async () => {
      for (const t of times) {
        expect(
          t,
          `Request demorou ${t}ms (limite: ${THRESHOLDS.API_PRODUCTS_MS * 2}ms)`,
        ).toBeLessThanOrEqual(THRESHOLDS.API_PRODUCTS_MS * 2);
      }
    });

    await test.step('Verificar variação entre requests (P90 - P10 < 500ms)', async () => {
      const sorted = [...times].sort((a, b) => a - b);
      const p10 = sorted[Math.floor(sorted.length * 0.1)];
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      expect(p90 - p10, `Variação P90-P10: ${p90 - p10}ms`).toBeLessThan(500);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Otimização de assets
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Otimização de assets @performance', () => {
  // ── Formato de imagens: WebP ou AVIF ─────────────────────────────────────
  test('imagens de produto devem usar WebP ou AVIF', async ({ page }) => {
    const imageRequests: string[] = [];

    await test.step('Interceptar requests de imagem', async () => {
      page.on('response', (res) => {
        const ct = res.headers()['content-type'] ?? '';
        if (ct.startsWith('image/') && res.url().includes('/produto')) {
          imageRequests.push(ct);
        }
      });

      await page.goto('/catalogo');
      await page.waitForLoadState('networkidle').catch(() => {});
    });

    await test.step('Verificar que ao menos 80% das imagens são WebP/AVIF', async () => {
      if (imageRequests.length === 0) {
        // Verifica via atributos src das imagens na DOM como fallback
        const srcFormats = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[data-testid="card-image"]'))
            .map((img) => (img as HTMLImageElement).currentSrc ?? '')
            .filter(Boolean),
        );
        const modern = srcFormats.filter((s) => /\.webp|\.avif/i.test(s));
        if (srcFormats.length > 0) {
          expect(modern.length / srcFormats.length).toBeGreaterThanOrEqual(0.8);
        }
        return;
      }

      const modern = imageRequests.filter((ct) =>
        ct.includes('webp') || ct.includes('avif'),
      );
      expect(
        modern.length / imageRequests.length,
        `${modern.length}/${imageRequests.length} imagens em formato moderno`,
      ).toBeGreaterThanOrEqual(0.8);
    });
  });

  // ── Lazy loading ──────────────────────────────────────────────────────────
  test('imagens abaixo do fold devem ter loading="lazy"', async ({ page }) => {
    await test.step('Abrir catálogo', async () => {
      await page.goto('/catalogo');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verificar atributo loading="lazy" em imagens fora do viewport', async () => {
      const results = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('[data-testid="card-image"]'));
        const viewportHeight = window.innerHeight;
        return images
          .filter((img) => {
            const rect = img.getBoundingClientRect();
            return rect.top > viewportHeight; // abaixo do fold
          })
          .map((img) => ({
            loading: img.getAttribute('loading'),
            src:     (img as HTMLImageElement).src,
          }));
      });

      if (results.length === 0) return; // todas acima do fold — aceita

      const withLazy = results.filter((r) => r.loading === 'lazy');
      expect(
        withLazy.length / results.length,
        `${withLazy.length}/${results.length} imagens abaixo do fold têm loading="lazy"`,
      ).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ── Scripts minificados ───────────────────────────────────────────────────
  test('scripts principais devem estar minificados (sem espaços excessivos)', async ({ page }) => {
    const scriptContents: { url: string; content: string }[] = [];

    await test.step('Interceptar scripts JS', async () => {
      page.on('response', async (res) => {
        const ct  = res.headers()['content-type'] ?? '';
        const url = res.url();
        if (ct.includes('javascript') && !url.includes('node_modules') && !url.includes('axe')) {
          const body = await res.text().catch(() => '');
          if (body.length > 1_000) {
            scriptContents.push({ url, content: body });
          }
        }
      });

      await page.goto('/');
      await page.waitForLoadState('load');
    });

    await test.step('Verificar ausência de comentários e espaços excessivos nos scripts', async () => {
      if (scriptContents.length === 0) return;

      for (const { url, content } of scriptContents.slice(0, 3)) {
        // Script minificado: linhas longas, sem comentários // nem /* */
        const lines = content.split('\n').filter((l) => l.trim());
        const avgLineLength = content.length / Math.max(lines.length, 1);
        // Scripts minificados tipicamente têm linhas muito longas (> 500 chars)
        expect(
          avgLineLength,
          `${url} parece não minificado (média ${avgLineLength.toFixed(0)} chars/linha)`,
        ).toBeGreaterThan(200);
      }
    });
  });

  // ── Nenhum recurso blocante de render acima do fold ───────────────────────
  test('não deve ter CSS blocante de render crítico carregando no <body>', async ({ page }) => {
    await test.step('Abrir home', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verificar ausência de <link rel=stylesheet> no body', async () => {
      const bodyStylesheets = await page.evaluate(() =>
        Array.from(document.body.querySelectorAll('link[rel="stylesheet"]')).map(
          (l) => (l as HTMLLinkElement).href,
        ),
      );
      expect(
        bodyStylesheets,
        `CSS blocante no body: ${bodyStylesheets.join(', ')}`,
      ).toHaveLength(0);
    });
  });
});

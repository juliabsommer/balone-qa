import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './tests',

  // Paralelismo e retentativas
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : undefined,

  // Timeouts globais
  timeout: Number(process.env.DEFAULT_TIMEOUT) || 30_000,
  expect: { timeout: 5_000 },

  // Setup / Teardown globais
  globalSetup: './support/global-setup.ts',
  globalTeardown: './support/global-teardown.ts',

  // Reporters
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    [
      'allure-playwright',
      {
        detail: true,
        outputFolder: process.env.ALLURE_RESULTS_DIR || 'allure-results',
        suiteTitle: false,
      },
    ],
  ],

  // Configuração base de todos os projetos
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Artefatos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Navegação
    navigationTimeout: Number(process.env.NAVIGATION_TIMEOUT) || 60_000,
    actionTimeout: Number(process.env.ACTION_TIMEOUT) || 10_000,

    // Localização
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    geolocation: { longitude: -46.6333, latitude: -23.5505 }, // São Paulo
    permissions: ['geolocation'],
  },

  // Projetos (browsers + dispositivos móveis)
  projects: [
    // ── Desktop ──────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },

    // ── Mobile ────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
    },

    // ── Tablet ────────────────────────────────────────────
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],

  // Pasta de saída dos artefatos
  outputDir: 'test-results',
});

import { Browser, BrowserContext, Page, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { env } from './env';

const STORAGE_STATE_DIR  = path.resolve(__dirname, '../.auth');
const AUTH_USER_FILE     = path.join(STORAGE_STATE_DIR, 'user.json');
const AUTH_ADMIN_FILE    = path.join(STORAGE_STATE_DIR, 'admin.json');

/** Garante que o diretório .auth/ existe. */
function ensureAuthDir(): void {
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
  }
}

/** Verifica se um storageState salvo ainda é válido (menos de 2 horas). */
function isStorageStateValid(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const { mtimeMs } = fs.statSync(filePath);
  return Date.now() - mtimeMs < 2 * 60 * 60 * 1000; // 2 horas
}

export interface AuthCredentials {
  email:    string;
  password: string;
}

/**
 * Realiza o login via UI e salva o storageState para reutilização.
 * Retorna o caminho do arquivo salvo.
 *
 * @param page        - Instância do Page do Playwright
 * @param credentials - E-mail e senha
 * @param filePath    - Caminho de destino do arquivo JSON
 */
export async function loginAndSaveState(
  page: Page,
  credentials: AuthCredentials,
  filePath: string,
): Promise<string> {
  ensureAuthDir();

  await page.goto(`${env.baseURL}/login`);
  await page.getByTestId('login-email').fill(credentials.email);
  await page.getByTestId('login-password').fill(credentials.password);

  await Promise.all([
    page.waitForURL(/\/(conta|perfil|$)/),
    page.getByTestId('login-submit').click(),
  ]);

  await page.context().storageState({ path: filePath });
  return filePath;
}

/**
 * Retorna o storageState do usuário de teste.
 * Reutiliza o arquivo em cache se ainda for válido.
 *
 * @param page - Instância do Page (usada apenas se precisar fazer novo login)
 */
export async function getUserStorageState(page: Page): Promise<string> {
  if (isStorageStateValid(AUTH_USER_FILE)) return AUTH_USER_FILE;

  return loginAndSaveState(
    page,
    { email: env.testUserEmail, password: env.testUserPassword },
    AUTH_USER_FILE,
  );
}

/**
 * Retorna o storageState do admin.
 * Reutiliza o arquivo em cache se ainda for válido.
 *
 * @param page - Instância do Page (usada apenas se precisar fazer novo login)
 */
export async function getAdminStorageState(page: Page): Promise<string> {
  if (isStorageStateValid(AUTH_ADMIN_FILE)) return AUTH_ADMIN_FILE;

  return loginAndSaveState(
    page,
    { email: env.adminEmail, password: env.adminPassword },
    AUTH_ADMIN_FILE,
  );
}

/**
 * Cria um contexto de browser já autenticado como usuário de teste.
 * Ideal para uso em global-setup ou fixtures que precisam de sessão pronta.
 *
 * @param browser - Instância do Browser
 */
export async function createAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
  if (isStorageStateValid(AUTH_USER_FILE)) {
    return browser.newContext({ storageState: AUTH_USER_FILE });
  }

  const context = await browser.newContext();
  const page    = await context.newPage();

  await loginAndSaveState(
    page,
    { email: env.testUserEmail, password: env.testUserPassword },
    AUTH_USER_FILE,
  );

  await page.close();
  return browser.newContext({ storageState: AUTH_USER_FILE });
}

/**
 * Realiza logout via API (invalida o token no servidor).
 * Mais rápido que navegar para a tela de logout.
 *
 * @param context - Contexto de browser autenticado
 */
export async function apiLogout(context: BrowserContext): Promise<void> {
  await context.request.post(`${env.apiBaseURL}/auth/logout`).catch(() => {
    // ignora falhas — o storageState é descartado de qualquer forma
  });
  await context.clearCookies();
}

/**
 * Remove os arquivos de storageState em cache.
 * Use no global-teardown para forçar novo login na próxima execução.
 */
export function clearStorageStateCache(): void {
  [AUTH_USER_FILE, AUTH_ADMIN_FILE].forEach((file) => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
}

export { AUTH_USER_FILE, AUTH_ADMIN_FILE };

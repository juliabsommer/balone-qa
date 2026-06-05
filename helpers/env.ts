import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  baseURL:             optional('BASE_URL', 'http://localhost:3000'),
  apiBaseURL:          optional('API_BASE_URL', 'http://localhost:3001'),
  testUserEmail:       optional('TEST_USER_EMAIL'),
  testUserPassword:    optional('TEST_USER_PASSWORD'),
  testUserName:        optional('TEST_USER_NAME'),
  adminEmail:          optional('ADMIN_EMAIL'),
  adminPassword:       optional('ADMIN_PASSWORD'),
  testEnv:             optional('TEST_ENV', 'local'),
  isCI:                optional('CI', 'false') === 'true',
  defaultTimeout:      Number(optional('DEFAULT_TIMEOUT', '30000')),
  navigationTimeout:   Number(optional('NAVIGATION_TIMEOUT', '60000')),
  actionTimeout:       Number(optional('ACTION_TIMEOUT', '10000')),
};

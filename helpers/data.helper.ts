import { faker } from '@faker-js/faker/locale/pt_BR';
import type { RegisterData } from '../pages/AuthPage';
import type { AddressData } from '../pages/CheckoutPage';
import type { CreditCardData } from '../pages/CheckoutPage';

// ── Usuários ──────────────────────────────────────────────────────────────────

/**
 * Gera dados completos de um novo usuário.
 * Garante senha válida (maiúscula + número + especial).
 */
export function generateUser(): RegisterData & { password: string } {
  const firstName = faker.person.firstName();
  const lastName  = faker.person.lastName();
  return {
    firstName,
    lastName,
    email:    faker.internet
      .email({ firstName, lastName, provider: 'qatest.com' })
      .toLowerCase(),
    password: `Test${faker.string.alphanumeric(8)}!1`,
    phone:    faker.phone.number({ style: 'national' }),
    cpf:      generateCPF(),
  };
}

/**
 * Gera um CPF válido no formato XXX.XXX.XXX-XX.
 * Não usa CPFs com todos os dígitos iguais.
 */
export function generateCPF(): string {
  const n = Array.from({ length: 9 }, () => faker.number.int({ min: 0, max: 9 }));

  const d1 = computeCPFDigit(n, 10);
  const d2 = computeCPFDigit([...n, d1], 11);

  return `${n.slice(0, 3).join('')}.${n.slice(3, 6).join('')}.${n.slice(6, 9).join('')}-${d1}${d2}`;
}

function computeCPFDigit(digits: number[], multiplierStart: number): number {
  const sum = digits.reduce((acc, d, i) => acc + d * (multiplierStart - i), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

// ── Endereços ─────────────────────────────────────────────────────────────────

/** CEPs de teste por estado (válidos no formato, mas fictícios). */
const TEST_ZIPCODES: Record<string, string> = {
  SP: '01310-100', // Av. Paulista, São Paulo
  RJ: '22040-020', // Copacabana, Rio de Janeiro
  MG: '30112-010', // Centro, Belo Horizonte
  RS: '90040-371', // Moinhos de Vento, Porto Alegre
  PR: '80010-010', // Centro, Curitiba
};

/**
 * Gera um endereço brasileiro de teste.
 * @param state - UF para usar um CEP de teste específico (padrão: SP)
 */
export function generateAddress(state: keyof typeof TEST_ZIPCODES = 'SP'): AddressData {
  return {
    zipCode:      TEST_ZIPCODES[state] ?? TEST_ZIPCODES.SP,
    street:       faker.location.street(),
    number:       faker.number.int({ min: 1, max: 9999 }).toString(),
    complement:   faker.helpers.maybe(
      () => faker.helpers.arrayElement(['Apto 12', 'Bloco B', 'Casa 2', 'Sala 301']),
      { probability: 0.4 },
    ),
    neighborhood: faker.location.county(),
    city:         faker.location.city(),
    state,
  };
}

// ── Cartões de crédito ─────────────────────────────────────────────────────────

/**
 * Cartões de teste por bandeira (números gerados por Luhn, aceitos em sandboxes).
 */
const TEST_CARDS: Record<string, string> = {
  visa:       '4111111111111111',
  mastercard: '5500005555555559',
  amex:       '378282246310005',
  elo:        '6362970000457013',
};

/**
 * Gera dados de cartão de crédito para ambiente de teste.
 * @param brand - Bandeira do cartão (padrão: visa)
 */
export function generateCreditCard(
  brand: keyof typeof TEST_CARDS = 'visa',
): CreditCardData {
  return {
    number:       TEST_CARDS[brand] ?? TEST_CARDS.visa,
    name:         faker.person.fullName().toUpperCase(),
    expiry:       '12/28',
    cvv:          '123',
    installments: 1,
  };
}

// ── Buscas & Conteúdo ─────────────────────────────────────────────────────────

/** Termos de busca válidos para o contexto de brechó. */
const VALID_SEARCH_TERMS = [
  'vestido', 'camiseta', 'calça', 'blusa', 'jaqueta',
  'tênis', 'sandália', 'bolsa', 'acessório', 'vintage',
];

/** Termos de busca que não devem retornar resultados. */
const INVALID_SEARCH_TERMS = [
  'xyzabc123', 'zzznaoexiste', '!!!@@@###', '            ',
];

/** Retorna um termo de busca válido aleatório. */
export function randomSearchTerm(): string {
  return faker.helpers.arrayElement(VALID_SEARCH_TERMS);
}

/** Retorna um termo de busca inválido (sem resultados esperados). */
export function randomInvalidSearchTerm(): string {
  return faker.helpers.arrayElement(INVALID_SEARCH_TERMS);
}

// ── Newsletter ─────────────────────────────────────────────────────────────────

/** Gera um e-mail único para teste de newsletter. */
export function generateNewsletterEmail(): string {
  return `newsletter-${Date.now()}-${faker.string.alphanumeric(6)}@qatest.com`;
}

// ── Cupons ─────────────────────────────────────────────────────────────────────

/** Gera um código de cupom único. */
export function generateCouponCode(): string {
  return `TEST-${faker.string.alphanumeric(8).toUpperCase()}`;
}

// ── Timestamps & IDs ──────────────────────────────────────────────────────────

/** Retorna um timestamp legível para nomear artefatos de teste. */
export function testTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/** Gera um ID único de execução de teste. */
export function testRunId(): string {
  return `run-${Date.now()}-${faker.string.alphanumeric(4)}`;
}

export { faker };

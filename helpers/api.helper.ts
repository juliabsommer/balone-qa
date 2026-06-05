import { APIRequestContext, request } from '@playwright/test';
import { env } from './env';

/**
 * Cria um APIRequestContext autenticado com o token de admin.
 * Útil em setup/teardown para manipular dados diretamente via API.
 */
export async function createApiContext(token?: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: env.apiBaseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/**
 * Obtém um token de acesso via credenciais (sem UI).
 * @param email    - E-mail do usuário
 * @param password - Senha do usuário
 */
export async function getAuthToken(email: string, password: string): Promise<string> {
  const ctx      = await createApiContext();
  const response = await ctx.post('/auth/login', { data: { email, password } });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Falha ao obter token: ${response.status()} — ${body}`);
  }

  const { token, access_token } = await response.json();
  await ctx.dispose();
  return token ?? access_token;
}

// ── Usuários ──────────────────────────────────────────────────────────────────

export interface CreateUserPayload {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  phone?:    string;
  cpf?:      string;
}

/**
 * Cria um usuário diretamente via API (setup de teste).
 * @param payload - Dados do usuário
 * @param token   - Token de admin
 */
export async function createUser(
  payload: CreateUserPayload,
  token: string,
): Promise<{ id: string; email: string }> {
  const ctx      = await createApiContext(token);
  const response = await ctx.post('/admin/users', { data: payload });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Falha ao criar usuário: ${response.status()} — ${body}`);
  }

  const user = await response.json();
  await ctx.dispose();
  return { id: user.id, email: user.email };
}

/**
 * Remove um usuário por ID (teardown de teste).
 * @param userId - ID do usuário
 * @param token  - Token de admin
 */
export async function deleteUser(userId: string, token: string): Promise<void> {
  const ctx = await createApiContext(token);
  await ctx.delete(`/admin/users/${userId}`);
  await ctx.dispose();
}

// ── Carrinho & Pedidos ─────────────────────────────────────────────────────────

/**
 * Esvazia o carrinho de um usuário via API.
 * @param token - Token do usuário
 */
export async function clearCart(token: string): Promise<void> {
  const ctx = await createApiContext(token);
  await ctx.delete('/cart');
  await ctx.dispose();
}

/**
 * Adiciona um produto ao carrinho via API (mais rápido que UI para setup).
 * @param productId - ID do produto
 * @param quantity  - Quantidade
 * @param token     - Token do usuário
 */
export async function addToCartApi(
  productId: string,
  quantity: number,
  token: string,
): Promise<void> {
  const ctx = await createApiContext(token);
  await ctx.post('/cart/items', { data: { productId, quantity } });
  await ctx.dispose();
}

/**
 * Cancela um pedido por ID (teardown).
 * @param orderId - ID do pedido
 * @param token   - Token de admin ou do próprio usuário
 */
export async function cancelOrder(orderId: string, token: string): Promise<void> {
  const ctx = await createApiContext(token);
  await ctx.post(`/orders/${orderId}/cancel`);
  await ctx.dispose();
}

// ── Produtos ───────────────────────────────────────────────────────────────────

export interface ProductSummary {
  id:    string;
  slug:  string;
  title: string;
  price: number;
}

/**
 * Retorna a lista de produtos disponíveis.
 * @param limit - Máximo de produtos a retornar
 */
export async function getProducts(limit = 10): Promise<ProductSummary[]> {
  const ctx      = await createApiContext();
  const response = await ctx.get(`/products?limit=${limit}&status=active`);
  const data     = await response.json();
  await ctx.dispose();
  return Array.isArray(data) ? data : data.products ?? data.items ?? [];
}

/**
 * Busca um produto pelo slug.
 * @param slug - Slug do produto
 */
export async function getProductBySlug(slug: string): Promise<ProductSummary> {
  const ctx      = await createApiContext();
  const response = await ctx.get(`/products/${slug}`);
  const product  = await response.json();
  await ctx.dispose();
  return product;
}

// ── Cupons ─────────────────────────────────────────────────────────────────────

/**
 * Cria um cupom de desconto via API (setup).
 * @param code       - Código do cupom
 * @param discount   - Valor de desconto (percentual ou fixo)
 * @param type       - "percentage" ou "fixed"
 * @param token      - Token de admin
 */
export async function createCoupon(
  code: string,
  discount: number,
  type: 'percentage' | 'fixed',
  token: string,
): Promise<void> {
  const ctx = await createApiContext(token);
  await ctx.post('/admin/coupons', {
    data: { code, discount, type, active: true },
  });
  await ctx.dispose();
}

/**
 * Remove um cupom pelo código (teardown).
 * @param code  - Código do cupom
 * @param token - Token de admin
 */
export async function deleteCoupon(code: string, token: string): Promise<void> {
  const ctx = await createApiContext(token);
  await ctx.delete(`/admin/coupons/${code}`);
  await ctx.dispose();
}

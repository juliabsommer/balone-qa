import { test, expect } from '../../../fixtures/base';
import { generateUser } from '../../../helpers/data.helper';
import { getAuthToken, createUser, deleteUser } from '../../../helpers/api.helper';
import { env } from '../../../helpers/env';

// ─────────────────────────────────────────────────────────────────────────────
// Setup compartilhado
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Autenticação @critical', () => {
  // ── 1. Login com credenciais válidas ────────────────────────────────────────
  test('deve fazer login com credenciais válidas @smoke', async ({ authPage, page }) => {
    await test.step('Abrir página de login', async () => {
      await authPage.openLogin();
      await authPage.assertUrl(/\/login/);
    });

    await test.step('Preencher e submeter credenciais', async () => {
      await authPage.login({
        email:    env.testUserEmail,
        password: env.testUserPassword,
      });
    });

    await test.step('Verificar redirecionamento pós-login', async () => {
      await expect(page).toHaveURL(/\/(conta|perfil|$)/);
    });

    await test.step('Verificar estado autenticado na UI', async () => {
      // O botão de conta não deve mais exibir "Entrar"
      await expect(page.getByTestId('nav-account')).not.toContainText('Entrar');
    });
  });

  // ── 2. Login com credenciais inválidas ──────────────────────────────────────
  test('deve exibir erro com credenciais inválidas', async ({ authPage }) => {
    await test.step('Abrir página de login', async () => {
      await authPage.openLogin();
    });

    await test.step('Submeter senha errada', async () => {
      await authPage.login({
        email:    env.testUserEmail,
        password: 'SenhaErrada999!',
      });
    });

    await test.step('Verificar mensagem de erro', async () => {
      await authPage.assertLoginError(/e-mail ou senha incorretos/i);
    });

    await test.step('Permanecer na página de login', async () => {
      await authPage.assertUrl(/\/login/);
    });
  });

  // ── 3. Rate limiting após 5 tentativas ──────────────────────────────────────
  test('deve bloquear após 5 tentativas consecutivas inválidas', async ({ authPage }) => {
    await test.step('Abrir página de login', async () => {
      await authPage.openLogin();
    });

    await test.step('Realizar 5 tentativas de login inválidas', async () => {
      for (let attempt = 1; attempt <= 5; attempt++) {
        await authPage.loginEmailInput().fill(env.testUserEmail);
        await authPage.loginPasswordInput().fill(`SenhaErrada${attempt}!`);
        await authPage.loginSubmitButton().click();
        // Aguarda a resposta antes de tentar novamente
        await authPage.loginError().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
      }
    });

    await test.step('Verificar mensagem de bloqueio por rate limit', async () => {
      await authPage.assertLoginError(/muitas tentativas|conta bloqueada|tente novamente/i);
    });

    await test.step('Verificar que o botão está desabilitado', async () => {
      await authPage.assertLoginSubmitDisabled();
    });
  });

  // ── 4. Manter sessão ao recarregar ──────────────────────────────────────────
  test('deve manter sessão após recarregar a página', async ({ authPage, page }) => {
    await test.step('Fazer login', async () => {
      await authPage.openLogin();
      await authPage.loginAndRedirect({
        email:    env.testUserEmail,
        password: env.testUserPassword,
      });
    });

    await test.step('Recarregar a página', async () => {
      await page.reload();
      await authPage.waitForLoad();
    });

    await test.step('Verificar que ainda está autenticado', async () => {
      await expect(page.getByTestId('nav-account')).not.toContainText('Entrar');
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  // ── 5. Logout + revogação de sessão ─────────────────────────────────────────
  test('deve fazer logout e revogar a sessão', async ({ authPage, profilePage, page }) => {
    await test.step('Fazer login', async () => {
      await authPage.openLogin();
      await authPage.loginAndRedirect({
        email:    env.testUserEmail,
        password: env.testUserPassword,
      });
    });

    await test.step('Realizar logout', async () => {
      await profilePage.open();
      await profilePage.logout();
    });

    await test.step('Verificar redirecionamento para login/home', async () => {
      await expect(page).toHaveURL(/\/(login|$)/);
    });

    await test.step('Verificar que sessão foi revogada — acesso a área protegida redireciona', async () => {
      await page.goto('/conta');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ── 6. Redirect pós-login para página solicitada ────────────────────────────
  test('deve redirecionar para página solicitada após login', async ({ page }) => {
    const targetPath = '/conta/pedidos';

    await test.step('Tentar acessar página protegida sem autenticação', async () => {
      await page.goto(targetPath);
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step('Verificar parâmetro de redirect na URL', async () => {
      await expect(page).toHaveURL(new RegExp(`redirect.*${encodeURIComponent(targetPath)}|next=.*pedidos`));
    });

    await test.step('Fazer login', async () => {
      await page.getByTestId('login-email').fill(env.testUserEmail);
      await page.getByTestId('login-password').fill(env.testUserPassword);
      await page.getByTestId('login-submit').click();
    });

    await test.step('Verificar redirecionamento para a página originalmente solicitada', async () => {
      await expect(page).toHaveURL(new RegExp(targetPath));
    });
  });

  // ── 7. Registro de novo usuário ─────────────────────────────────────────────
  test('deve registrar novo usuário com sucesso @smoke', async ({ authPage, page }) => {
    const newUser = generateUser();
    let userId: string | undefined;

    await test.step('Abrir página de cadastro', async () => {
      await authPage.openRegister();
    });

    await test.step('Preencher formulário de cadastro', async () => {
      await authPage.register(newUser);
    });

    await test.step('Verificar redirecionamento para área logada', async () => {
      await expect(page).toHaveURL(/\/(conta|perfil|bem-vindo)/);
    });

    await test.step('Verificar boas-vindas na UI', async () => {
      await expect(page.getByTestId('profile-name')).toContainText(newUser.firstName);
    });

    // Teardown via API
    await test.step('Teardown: remover usuário criado', async () => {
      try {
        const token = await getAuthToken(env.adminEmail, env.adminPassword);
        const userData = await page.evaluate(() => {
          // tenta pegar o id do usuário do localStorage ou de um meta tag
          return document.querySelector('[data-user-id]')?.getAttribute('data-user-id');
        });
        if (userData) {
          await deleteUser(userData, token);
        }
      } catch {
        // tolerante — o usuário de teste pode ser limpo manualmente
      }
    });
  });

  // ── 8. Bloqueio de e-mail duplicado ─────────────────────────────────────────
  test('deve impedir cadastro com e-mail já existente', async ({ authPage }) => {
    await test.step('Abrir página de cadastro', async () => {
      await authPage.openRegister();
    });

    await test.step('Tentar registrar com e-mail já cadastrado', async () => {
      await authPage.register({
        ...generateUser(),
        email: env.testUserEmail, // e-mail já existente
      });
    });

    await test.step('Verificar mensagem de e-mail duplicado', async () => {
      await authPage.assertRegisterError(/e-mail.*já.*cadastrado|já existe/i);
    });

    await test.step('Permanecer na página de cadastro', async () => {
      await authPage.assertUrl(/\/cadastro/);
    });
  });

  // ── 9. Validação de força de senha ──────────────────────────────────────────
  test('deve exibir indicador de força da senha em tempo real', async ({ authPage }) => {
    await test.step('Abrir página de cadastro', async () => {
      await authPage.openRegister();
    });

    await test.step('Digitar senha fraca — somente letras minúsculas', async () => {
      await authPage.registerPassword().fill('abcdefgh');
      await authPage.assertPasswordStrength('fraca');
    });

    await test.step('Digitar senha média — letras + números', async () => {
      await authPage.registerPassword().fill('abcdef12');
      await authPage.assertPasswordStrength('média');
    });

    await test.step('Digitar senha forte — maiúscula + número + especial', async () => {
      await authPage.registerPassword().fill('Abcdef12!');
      await authPage.assertPasswordStrength('forte');
    });

    await test.step('Verificar que o botão de cadastro está habilitado com senha forte', async () => {
      // preenche o mínimo para habilitar o submit
      const user = generateUser();
      await authPage.registerFirstName().fill(user.firstName);
      await authPage.registerLastName().fill(user.lastName);
      await authPage.registerEmail().fill(user.email);
      await authPage.registerConfirmPass().fill('Abcdef12!');
      await authPage.registerTerms().check();
      await expect(authPage.registerSubmitButton()).toBeEnabled();
    });
  });

  // ── 10. Recuperação de senha por e-mail ─────────────────────────────────────
  test('deve enviar e-mail de recuperação de senha', async ({ authPage }) => {
    await test.step('Navegar para recuperação de senha', async () => {
      await authPage.openLogin();
      await authPage.goToForgotPassword();
      await authPage.assertUrl(/\/esqueci-a-senha/);
    });

    await test.step('Submeter e-mail cadastrado', async () => {
      await authPage.requestPasswordReset(env.testUserEmail);
    });

    await test.step('Verificar mensagem de sucesso', async () => {
      await authPage.assertForgotPasswordSuccess();
    });

    await test.step('Deve exibir erro para e-mail não cadastrado', async () => {
      await authPage.openForgotPassword();
      await authPage.requestPasswordReset('naoexiste@qatest.com');
      await expect(authPage.forgotErrorMessage()).toBeVisible();
    });
  });

  // ── 11. Segurança: JWT adulterado retorna 401 ────────────────────────────────
  test('deve rejeitar JWT adulterado com 401', async ({ page, request }) => {
    await test.step('Fazer login legítimo', async () => {
      await page.goto('/login');
      await page.getByTestId('login-email').fill(env.testUserEmail);
      await page.getByTestId('login-password').fill(env.testUserPassword);
      await page.getByTestId('login-submit').click();
      await page.waitForURL(/\/(conta|perfil|$)/);
    });

    await test.step('Adulterar o token no localStorage', async () => {
      await page.evaluate(() => {
        // Tenta corromper o token em diversas chaves comuns
        ['token', 'access_token', 'authToken', 'jwt'].forEach((key) => {
          const stored = localStorage.getItem(key);
          if (stored) localStorage.setItem(key, stored + 'ADULTERADO');
        });
        // Também tenta via cookie
        document.cookie = 'token=TOKENFALSO; path=/';
      });
    });

    await test.step('Chamar endpoint protegido com token adulterado e verificar 401', async () => {
      const response = await page.request.get(`${env.apiBaseURL}/profile`);
      expect(response.status()).toBe(401);
    });

    await test.step('Recarregar a página deve redirecionar para login', async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

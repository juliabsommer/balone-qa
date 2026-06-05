import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface LoginData {
  email:    string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  phone?:    string;
  cpf?:      string;
}

export class AuthPage extends BasePage {
  // ── Locators — Login ──────────────────────────────────────────────────────

  readonly loginForm          = () => this.getByTestId('login-form');
  readonly loginEmailInput    = () => this.getByTestId('login-email');
  readonly loginPasswordInput = () => this.getByTestId('login-password');
  readonly loginSubmitButton  = () => this.getByTestId('login-submit');
  readonly loginError         = () => this.getByTestId('login-error-message');
  readonly loginSuccess       = () => this.getByTestId('login-success-message');

  readonly rememberMeCheckbox = () => this.getByTestId('remember-me');
  readonly forgotPasswordLink = () => this.getByTestId('forgot-password-link');
  readonly registerLink       = () => this.getByTestId('register-link');
  readonly googleLoginButton  = () => this.getByTestId('google-login');

  // ── Locators — Cadastro ───────────────────────────────────────────────────

  readonly registerForm         = () => this.getByTestId('register-form');
  readonly registerFirstName    = () => this.getByTestId('register-first-name');
  readonly registerLastName     = () => this.getByTestId('register-last-name');
  readonly registerEmail        = () => this.getByTestId('register-email');
  readonly registerPassword     = () => this.getByTestId('register-password');
  readonly registerConfirmPass  = () => this.getByTestId('register-confirm-password');
  readonly registerPhone        = () => this.getByTestId('register-phone');
  readonly registerCPF          = () => this.getByTestId('register-cpf');
  readonly registerTerms        = () => this.getByTestId('register-terms-checkbox');
  readonly registerSubmitButton = () => this.getByTestId('register-submit');
  readonly registerError        = () => this.getByTestId('register-error-message');
  readonly loginRedirectLink    = () => this.getByTestId('login-redirect-link');

  // Força da senha
  readonly passwordStrength     = () => this.getByTestId('password-strength-indicator');
  readonly passwordStrengthText = () => this.getByTestId('password-strength-text');

  // ── Locators — Recuperação de senha ──────────────────────────────────────

  readonly forgotPasswordForm   = () => this.getByTestId('forgot-password-form');
  readonly forgotEmailInput     = () => this.getByTestId('forgot-email-input');
  readonly forgotSubmitButton   = () => this.getByTestId('forgot-submit-button');
  readonly forgotSuccessMessage = () => this.getByTestId('forgot-success-message');
  readonly forgotErrorMessage   = () => this.getByTestId('forgot-error-message');
  readonly backToLoginLink      = () => this.getByTestId('back-to-login-link');

  // ── Ações — Login ─────────────────────────────────────────────────────────

  /** Abre a página de login. */
  async openLogin(): Promise<this> {
    await this.navigate('/login');
    return this;
  }

  /** Abre a página de cadastro. */
  async openRegister(): Promise<this> {
    await this.navigate('/cadastro');
    return this;
  }

  /** Abre a página de recuperação de senha. */
  async openForgotPassword(): Promise<this> {
    await this.navigate('/esqueci-a-senha');
    return this;
  }

  /**
   * Realiza login com e-mail e senha.
   * @param data - Credenciais de login
   */
  async login(data: LoginData): Promise<this> {
    await this.loginEmailInput().fill(data.email);
    await this.loginPasswordInput().fill(data.password);
    await this.waitForAPI(
      /auth|login|session/,
      async () => this.loginSubmitButton().click(),
    );
    return this;
  }

  /**
   * Realiza login e aguarda redirecionamento para a home (fluxo feliz).
   * @param data - Credenciais de login
   */
  async loginAndRedirect(data: LoginData): Promise<this> {
    await this.login(data);
    await this.page.waitForURL(/\/(conta|perfil|$)/, { timeout: 10_000 });
    return this;
  }

  /**
   * Preenche e submete o formulário de cadastro.
   * @param data - Dados do novo usuário
   */
  async register(data: RegisterData): Promise<this> {
    await this.registerFirstName().fill(data.firstName);
    await this.registerLastName().fill(data.lastName);
    await this.registerEmail().fill(data.email);
    await this.registerPassword().fill(data.password);
    await this.registerConfirmPass().fill(data.password);

    if (data.phone) await this.registerPhone().fill(data.phone);
    if (data.cpf)   await this.registerCPF().fill(data.cpf);

    await this.registerTerms().check();

    await this.waitForAPI(
      /users|register|signup/,
      async () => this.registerSubmitButton().click(),
    );
    return this;
  }

  /**
   * Envia o formulário de recuperação de senha.
   * @param email - E-mail cadastrado
   */
  async requestPasswordReset(email: string): Promise<this> {
    await this.forgotEmailInput().fill(email);
    await this.waitForAPI(
      /password|reset|forgot/,
      async () => this.forgotSubmitButton().click(),
    );
    return this;
  }

  /** Navega da tela de login para o cadastro. */
  async goToRegister(): Promise<this> {
    await this.registerLink().click();
    await this.waitForLoad();
    return this;
  }

  /** Navega da tela de login para recuperação de senha. */
  async goToForgotPassword(): Promise<this> {
    await this.forgotPasswordLink().click();
    await this.waitForLoad();
    return this;
  }

  /** Volta para o login a partir da tela de recuperação. */
  async backToLogin(): Promise<this> {
    await this.backToLoginLink().click();
    await this.waitForLoad();
    return this;
  }

  // ── Asserções ─────────────────────────────────────────────────────────────

  /** Verifica que o erro de login está visível com o texto esperado. */
  async assertLoginError(text?: string | RegExp): Promise<this> {
    await expect(this.loginError()).toBeVisible();
    if (text) await expect(this.loginError()).toContainText(text);
    return this;
  }

  /** Verifica que o erro de cadastro está visível. */
  async assertRegisterError(text?: string | RegExp): Promise<this> {
    await expect(this.registerError()).toBeVisible();
    if (text) await expect(this.registerError()).toContainText(text);
    return this;
  }

  /** Verifica que o e-mail de recuperação foi enviado com sucesso. */
  async assertForgotPasswordSuccess(): Promise<this> {
    await expect(this.forgotSuccessMessage()).toBeVisible();
    return this;
  }

  /** Verifica que o indicador de força da senha exibe o nível esperado. */
  async assertPasswordStrength(level: 'fraca' | 'média' | 'forte'): Promise<this> {
    await expect(this.passwordStrengthText()).toContainText(level, { ignoreCase: true });
    return this;
  }

  /** Verifica que o botão de submit do login está desabilitado. */
  async assertLoginSubmitDisabled(): Promise<this> {
    await expect(this.loginSubmitButton()).toBeDisabled();
    return this;
  }
}

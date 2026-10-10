/**
 * Regras dos formulários de acesso — sem DOM e sem Firebase, para dar para
 * testar. O Firebase valida de novo do lado dele; aqui é só para o jogador
 * ver o erro na hora, sem esperar a rede.
 */

export const MIN_PASSWORD = 6;
export const MAX_NAME = 14;

export type AuthField = 'name' | 'email' | 'password';
export type FieldErrors = Partial<Record<AuthField, string>>;

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export type SignInInput = Omit<SignUpInput, 'name'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Digite o seu e-mail.';
  if (!EMAIL_RE.test(value)) return 'Esse e-mail não parece válido.';
  return undefined;
}

export function validateSignUp({ name, email, password }: SignUpInput): FieldErrors {
  const errors: FieldErrors = {};
  const cleanName = name.trim();
  if (!cleanName) errors.name = 'Digite o seu nome.';
  else if (cleanName.length > MAX_NAME) errors.name = `Use até ${MAX_NAME} letras.`;

  const mail = emailError(email);
  if (mail) errors.email = mail;

  if (!password) errors.password = 'Crie uma senha.';
  else if (password.length < MIN_PASSWORD) {
    errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  }
  return errors;
}

export function validateSignIn({ email, password }: SignInInput): FieldErrors {
  const errors: FieldErrors = {};
  const mail = emailError(email);
  if (mail) errors.email = mail;
  if (!password) errors.password = 'Digite a sua senha.';
  return errors;
}

export const hasErrors = (errors: FieldErrors): boolean => Object.keys(errors).length > 0;

/** Erro vindo do Firebase, já traduzido e apontando o campo culpado (se houver). */
export interface AuthFailure {
  field?: AuthField;
  message: string;
}

export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown };
    if (typeof code === 'string') return code;
  }
  return '';
}

export function describeAuthError(code: string): AuthFailure {
  switch (code) {
    case 'auth/email-already-in-use':
      return { field: 'email', message: 'Esse e-mail já tem cadastro. Toque em Entrar.' };
    case 'auth/invalid-email':
      return { field: 'email', message: 'Esse e-mail não parece válido.' };
    case 'auth/weak-password':
      return {
        field: 'password',
        message: `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`,
      };
    // O Firebase não diz qual dos dois errou (proteção contra enumeração de
    // e-mails), então a mensagem também não diz.
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { message: 'E-mail ou senha incorretos.' };
    case 'auth/too-many-requests':
      return { message: 'Muitas tentativas. Espere um pouco e tente de novo.' };
    case 'auth/network-request-failed':
      return { message: 'Sem conexão. Confira a internet e tente de novo.' };
    case 'auth/user-disabled':
      return { message: 'Essa conta foi desativada.' };
    case 'auth/operation-not-allowed':
      return { message: 'O acesso por e-mail e senha não está ativado no Firebase.' };
    case 'auth/not-configured':
      return { message: 'Acesso indisponível: o Firebase ainda não foi configurado.' };
    default:
      return { message: 'Não deu para concluir agora. Tente de novo.' };
  }
}

/** Nome exibido no HUD: o da conta, ou o começo do e-mail se faltar. */
export function displayNameFor(name: string | null | undefined, email: string | null | undefined): string {
  const base = name?.trim() || email?.split('@')[0] || 'Jogador';
  return base.slice(0, MAX_NAME);
}

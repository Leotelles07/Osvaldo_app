import { describe, expect, it } from 'vitest';
import {
  describeAuthError,
  displayNameFor,
  errorCode,
  hasErrors,
  validateSignIn,
  validateSignUp,
} from '../validation';

const valid = { name: 'Leonardo', email: 'leo@exemplo.com', password: '123456' };

describe('validateSignUp', () => {
  it('aceita um cadastro completo', () => {
    expect(hasErrors(validateSignUp(valid))).toBe(false);
  });

  it('exige nome, e-mail e senha', () => {
    const errors = validateSignUp({ name: '  ', email: '', password: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password']);
  });

  it('recusa senha com menos de 6 caracteres', () => {
    expect(validateSignUp({ ...valid, password: '12345' }).password).toMatch(/6 caracteres/);
    expect(validateSignUp({ ...valid, password: '123456' }).password).toBeUndefined();
  });

  it('recusa e-mail sem formato de e-mail', () => {
    for (const email of ['leo', 'leo@', 'leo@exemplo', 'leo @exemplo.com']) {
      expect(validateSignUp({ ...valid, email }).email).toBeDefined();
    }
    expect(validateSignUp({ ...valid, email: '  leo@exemplo.com ' }).email).toBeUndefined();
  });

  it('limita o nome ao tamanho que cabe no HUD', () => {
    expect(validateSignUp({ ...valid, name: 'A'.repeat(14) }).name).toBeUndefined();
    expect(validateSignUp({ ...valid, name: 'A'.repeat(15) }).name).toBeDefined();
  });
});

describe('validateSignIn', () => {
  it('só pede e-mail e senha, sem regra de tamanho', () => {
    expect(hasErrors(validateSignIn({ email: 'leo@exemplo.com', password: '1' }))).toBe(false);
    expect(Object.keys(validateSignIn({ email: '', password: '' })).sort()).toEqual(['email', 'password']);
  });
});

describe('erros do Firebase', () => {
  it('lê o código de um erro do Firebase', () => {
    expect(errorCode({ code: 'auth/invalid-email' })).toBe('auth/invalid-email');
    expect(errorCode(new Error('x'))).toBe('');
    expect(errorCode(null)).toBe('');
  });

  it('aponta o campo certo quando dá', () => {
    expect(describeAuthError('auth/email-already-in-use').field).toBe('email');
    expect(describeAuthError('auth/weak-password').field).toBe('password');
  });

  it('não revela se foi o e-mail ou a senha que errou', () => {
    for (const code of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found']) {
      const failure = describeAuthError(code);
      expect(failure.field).toBeUndefined();
      expect(failure.message).toBe('E-mail ou senha incorretos.');
    }
  });

  it('tem uma mensagem para erros desconhecidos', () => {
    expect(describeAuthError('auth/qualquer-coisa').message).toBeTruthy();
  });
});

describe('displayNameFor', () => {
  it('usa o nome da conta, ou o começo do e-mail', () => {
    expect(displayNameFor(' Leo ', 'leo@exemplo.com')).toBe('Leo');
    expect(displayNameFor(null, 'osvaldo@exemplo.com')).toBe('osvaldo');
    expect(displayNameFor('', null)).toBe('Jogador');
    expect(displayNameFor('Nome muito comprido demais', null)).toHaveLength(14);
  });
});

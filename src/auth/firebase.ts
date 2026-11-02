/**
 * Acesso com e-mail e senha pelo Firebase Auth.
 *
 * A configuração do Firebase mora em firebase/app.ts (compartilhada com o
 * banco). Sem as variáveis o jogo abre normalmente e as telas de acesso avisam.
 *
 * "Continuar logado" é o comportamento padrão do getAuth() no navegador: a
 * sessão fica no IndexedDB e volta sozinha ao reabrir o app.
 */
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
} from 'firebase/auth';
import { firebaseApp, isFirebaseConfigured } from '../firebase/app';
import { displayNameFor, type SignInInput, type SignUpInput } from './validation';

export interface Account {
  uid: string;
  name: string;
  email: string;
}

export const isAuthConfigured = isFirebaseConfigured;

let auth: Auth | null = null;

function requireAuth(): Auth {
  if (!isAuthConfigured) throw Object.assign(new Error('Firebase sem configuração'), { code: 'auth/not-configured' });
  if (!auth) {
    auth = getAuth(firebaseApp());
    auth.languageCode = 'pt-BR';
  }
  return auth;
}

/** Avisa quem está logado: uma vez ao abrir o app e de novo a cada mudança. */
export function watchAccount(callback: (account: Account | null) => void): void {
  if (!isAuthConfigured) {
    callback(null);
    return;
  }
  onAuthStateChanged(requireAuth(), (user) => {
    callback(
      user
        ? { uid: user.uid, name: displayNameFor(user.displayName, user.email), email: user.email ?? '' }
        : null,
    );
  });
}

export async function signUp({ name, email, password }: SignUpInput): Promise<Account> {
  const { user } = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  const cleanName = name.trim();
  try {
    await updateProfile(user, { displayName: cleanName });
  } catch {
    /* a conta já existe; o nome só não ficou salvo no perfil desta vez */
  }
  return { uid: user.uid, name: displayNameFor(cleanName, user.email), email: user.email ?? '' };
}

export async function signIn({ email, password }: SignInInput): Promise<Account> {
  const { user } = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  return { uid: user.uid, name: displayNameFor(user.displayName, user.email), email: user.email ?? '' };
}

export async function signOut(): Promise<void> {
  if (isAuthConfigured) await firebaseSignOut(requireAuth());
}

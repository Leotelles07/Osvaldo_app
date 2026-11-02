/**
 * Um único app do Firebase para o projeto inteiro: o login (auth/firebase.ts)
 * e o banco (data/store.ts) pegam a mesma instância daqui.
 *
 * As chaves vêm de variáveis VITE_FIREBASE_* (ver .env). Elas são a
 * configuração pública do app web — vão para o bundle de qualquer jeito —, e
 * quem protege as contas e os dados são as regras do Firebase
 * (firestore.rules), não o segredo delas.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';

/**
 * Desenvolvimento local contra os emuladores do Firebase (login e banco de
 * mentira, nada encosta no projeto real). Ligue com VITE_USE_EMULATORS=1 no
 * .env.local e rode `npm run emulators` em outro terminal.
 */
export const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === '1';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // Projeto "demo-" nos emuladores: o SDK nunca tenta falar com a nuvem.
  projectId: useEmulators ? 'demo-osvaldo' : import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Opcionais: o login e o Firestore funcionam sem eles.
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

/** Os quatro campos sem os quais nem o login nem o banco funcionam. */
export const isFirebaseConfigured = [config.apiKey, config.authDomain, config.projectId, config.appId].every(
  Boolean,
);

export function firebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

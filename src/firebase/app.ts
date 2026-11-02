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

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
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

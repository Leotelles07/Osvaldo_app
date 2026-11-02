/**
 * O banco do app. Este arquivo só é carregado sob demanda (import dinâmico em
 * data/cloud.ts), para o SDK do Firestore não pesar na abertura do jogo.
 *
 * Cache local persistente (IndexedDB): o perfil e o ranking aparecem mesmo
 * sem rede, e uma partida terminada offline fica na fila e sobe sozinha
 * quando a conexão voltar. Navegadores sem IndexedDB caem no cache em memória.
 */
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { firebaseApp, useEmulators } from '../firebase/app';
import * as ops from './firestore';
import type { MatchRecord, UserProfile } from './schema';

let db: Firestore | null = null;

function database(): Firestore {
  if (db) return db;
  try {
    db = initializeFirestore(firebaseApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch {
    db = getFirestore(firebaseApp()); // já inicializado (recarga a quente do Vite)
  }
  return db;
}

export const watchProfile = (
  uid: string,
  fresh: () => UserProfile,
  onProfile: (profile: UserProfile) => void,
  onError: (error: unknown) => void,
) => ops.watchProfile(database(), uid, fresh, onProfile, onError);

export const savePrefs = (uid: string, prefs: ops.ProfilePrefs) => ops.savePrefs(database(), uid, prefs);

export const recordMatch = (uid: string, profile: UserProfile, match: MatchRecord) =>
  ops.recordMatch(database(), uid, profile, match);

export const fetchLeaderboard = () => ops.fetchLeaderboard(database());

export const fetchRank = (bestScore: number) => ops.fetchRank(database(), bestScore);

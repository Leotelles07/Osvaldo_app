/**
 * O jogador no banco, do ponto de vista das telas: conecta ao entrar,
 * desconecta ao sair, guarda o perfil atual e salva partidas e preferências.
 *
 * Tudo aqui é "melhor esforço": sem Firebase configurado, sem rede ou com o
 * banco recusando, o jogo segue normalmente — só não salva. As falhas vão
 * para o console, nunca para a tela de jogo.
 */
import { isFirebaseConfigured } from '../firebase/app';
import type { Account } from '../auth/firebase';
import type { LeaderboardEntry, MatchRecord, UserProfile } from './schema';

type Store = typeof import('./store');

let storePromise: Promise<Store> | null = null;
const loadStore = (): Promise<Store> => (storePromise ??= import('./store'));

let uid: string | null = null;
let profile: UserProfile | null = null;
let stopWatching: (() => void) | null = null;
/** Muda a cada entrada/saída: respostas atrasadas de outra sessão são descartadas. */
let session = 0;
/** Última gravação de partida, para o ranking esperar ela subir. */
let lastCommit: Promise<unknown> = Promise.resolve();

const warn = (what: string) => (error: unknown) => console.warn(`[Osvaldo] ${what}:`, error);

/**
 * Começa a acompanhar o perfil da conta. `fresh` monta o perfil inicial caso
 * ele ainda não exista no banco; `onProfile` recebe cada versão do perfil.
 */
export function connect(
  account: Account,
  fresh: () => UserProfile,
  onProfile: (profile: UserProfile) => void,
): void {
  disconnect();
  if (!isFirebaseConfigured) return;
  const mine = ++session;
  uid = account.uid;
  loadStore()
    .then((store) => {
      if (mine !== session) return;
      stopWatching = store.watchProfile(
        account.uid,
        fresh,
        (next) => {
          if (mine !== session) return;
          profile = next;
          onProfile(next);
        },
        warn('perfil'),
      );
    })
    .catch(warn('carregar o banco'));
}

export function disconnect(): void {
  session++;
  stopWatching?.();
  stopWatching = null;
  uid = null;
  profile = null;
}

export function currentProfile(): UserProfile | null {
  return profile;
}

/** Salva cor/som se mudaram em relação ao perfil do banco. */
export function savePrefs(prefs: Partial<Pick<UserProfile, 'furColor' | 'soundMuted'>>): void {
  if (!uid || !profile) return;
  const changed = Object.entries(prefs).filter(
    ([key, value]) => profile?.[key as keyof UserProfile] !== value,
  );
  if (changed.length === 0) return;
  const target = uid;
  loadStore()
    .then((store) => store.savePrefs(target, Object.fromEntries(changed)))
    .catch(warn('salvar preferências'));
}

/**
 * Salva a partida (com estatísticas e ranking). Precisa do perfil já
 * carregado — é dele que sai o recorde que as regras conferem. Devolve se a
 * partida foi enviada.
 */
export function saveMatch(match: MatchRecord): boolean {
  if (!uid || !profile) {
    console.warn('[Osvaldo] partida não salva: perfil ainda não carregou');
    return false;
  }
  const target = uid;
  const snapshot = profile;
  lastCommit = loadStore()
    .then((store) => store.recordMatch(target, snapshot, match).committed)
    .catch(warn('salvar partida'));
  return true;
}

export interface Ranking {
  top: LeaderboardEntry[];
  /** Posição do jogador logado, quando ele já tem recorde (null se não deu para saber). */
  myRank: number | null;
}

/** Top 5 e a posição do jogador. Rejeita se não der para falar com o banco. */
export async function loadRanking(): Promise<Ranking> {
  if (!isFirebaseConfigured) throw new Error('Firebase sem configuração');
  const store = await loadStore();
  // Dá um tempinho para a última partida subir antes de ler o ranking.
  await Promise.race([lastCommit, new Promise((done) => setTimeout(done, 2500))]);
  const top = await store.fetchLeaderboard();
  const best = profile?.bestScore ?? 0;
  let myRank: number | null = null;
  if (best > 0) {
    myRank = await store.fetchRank(best).catch(() => null);
  }
  return { top, myRank };
}

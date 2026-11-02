/**
 * Leitura e gravação no Firestore. Cada função recebe o banco como parâmetro,
 * então os testes das regras (tests/rules) exercitam exatamente as gravações
 * que o app faz, contra o emulador.
 *
 * O app não importa este arquivo direto: ele passa por data/store.ts, que cria
 * o banco sob demanda e engole falhas de rede (o jogo nunca para por causa do
 * banco).
 */
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  COLLECTIONS,
  LEADERBOARD_SIZE,
  parseLeaderboardEntry,
  parseProfile,
  statsAfter,
  type LeaderboardEntry,
  type MatchRecord,
  type UserProfile,
} from './schema';

const userRef = (db: Firestore, uid: string) => doc(db, COLLECTIONS.users, uid);
const leaderboardRef = (db: Firestore, uid: string) => doc(db, COLLECTIONS.leaderboard, uid);

/* ------------------------------------------------------------ perfil -- */

/** Cria o perfil com estatísticas zeradas (as regras exigem isso). */
export function createProfile(db: Firestore, uid: string, profile: UserProfile): Promise<void> {
  return setDoc(userRef(db, uid), {
    name: profile.name,
    furColor: profile.furColor,
    soundMuted: profile.soundMuted,
    bestScore: 0,
    gamesPlayed: 0,
    totalPoints: 0,
    lastMatchId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastPlayedAt: null,
  });
}

/**
 * Acompanha o perfil do jogador (inclusive mudanças feitas em outro aparelho).
 * Se o servidor confirmar que ele não existe — conta nova, ou criada antes do
 * banco existir —, cria um a partir de `fresh`. Só confia no "não existe" que
 * vem do servidor: o cache local vazio não quer dizer nada.
 */
export function watchProfile(
  db: Firestore,
  uid: string,
  fresh: () => UserProfile,
  onProfile: (profile: UserProfile) => void,
  onError: (error: unknown) => void = () => {},
): Unsubscribe {
  let creating = false;
  return onSnapshot(
    userRef(db, uid),
    (snapshot) => {
      const profile = parseProfile(snapshot.data());
      if (profile) {
        onProfile(profile);
        return;
      }
      if (snapshot.metadata.fromCache || creating) return;
      creating = true;
      createProfile(db, uid, fresh()).catch(onError);
    },
    onError,
  );
}

export type ProfilePrefs = Partial<Pick<UserProfile, 'furColor' | 'soundMuted'>>;

export function savePrefs(db: Firestore, uid: string, prefs: ProfilePrefs): Promise<void> {
  return updateDoc(userRef(db, uid), { ...prefs, updatedAt: serverTimestamp() });
}

/* ----------------------------------------------------------- partida -- */

export interface RecordedMatch {
  matchId: string;
  stats: ReturnType<typeof statsAfter>;
  /** Resolve quando o servidor aceitar; fica pendente enquanto estiver offline. */
  committed: Promise<void>;
}

/**
 * Grava a partida, as estatísticas do perfil e, se for recorde, o ranking —
 * tudo num lote só: ou entra tudo, ou nada. Sem internet, o lote fica na fila
 * do cache local e sobe sozinho quando a conexão voltar.
 *
 * `profile` precisa ser o perfil atual (o de watchProfile): o recorde é
 * calculado aqui e as regras conferem com o que está no servidor.
 */
export function recordMatch(
  db: Firestore,
  uid: string,
  profile: UserProfile,
  match: MatchRecord,
): RecordedMatch {
  const stats = statsAfter(profile, match.score);
  const user = userRef(db, uid);
  const matchDoc = doc(collection(user, COLLECTIONS.matches));
  const batch = writeBatch(db);

  batch.set(matchDoc, { ...match, playedAt: serverTimestamp() });
  batch.update(user, {
    gamesPlayed: increment(1),
    totalPoints: increment(match.score),
    bestScore: stats.bestScore,
    lastMatchId: matchDoc.id,
    lastPlayedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (stats.isRecord) {
    batch.set(leaderboardRef(db, uid), {
      name: profile.name,
      furColor: match.furColor,
      bestScore: stats.bestScore,
      updatedAt: serverTimestamp(),
    });
  }

  return { matchId: matchDoc.id, stats, committed: batch.commit() };
}

/* ----------------------------------------------------------- ranking -- */

/** Os melhores jogadores; no empate, fica na frente quem chegou primeiro. */
export async function fetchLeaderboard(db: Firestore, size = LEADERBOARD_SIZE): Promise<LeaderboardEntry[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.leaderboard),
      orderBy('bestScore', 'desc'),
      orderBy('updatedAt', 'asc'),
      limit(size),
    ),
  );
  return snapshot.docs
    .map((entry) => parseLeaderboardEntry(entry.id, entry.data()))
    .filter((entry): entry is LeaderboardEntry => entry !== null);
}

/** Posição de um recorde no ranking geral (1 = primeiro lugar). */
export async function fetchRank(db: Firestore, bestScore: number): Promise<number> {
  const snapshot = await getCountFromServer(
    query(collection(db, COLLECTIONS.leaderboard), where('bestScore', '>', bestScore)),
  );
  return snapshot.data().count + 1;
}

/**
 * Formato dos dados do Osvaldo no Firestore — sem SDK e sem DOM, para dar para
 * testar. As faixas aqui precisam bater com as de `firestore.rules`: o app
 * nunca manda um valor que as regras recusariam.
 *
 *   users/{uid}                  UserProfile   (só o dono)
 *   users/{uid}/matches/{id}     MatchRecord   (só o dono, só cria)
 *   leaderboard/{uid}            LeaderboardEntry (público para logados)
 */
import { GOOD_TREATS, type GoodTreatKind } from '../game/config';
import type { DeathCause } from '../game/core';
import { DEFAULT_FUR_COLOR, FUR_PALETTES, type FurColorId } from '../game/draw';

export const COLLECTIONS = {
  users: 'users',
  matches: 'matches',
  leaderboard: 'leaderboard',
} as const;

/** Quantos jogadores aparecem no ranking. */
export const LEADERBOARD_SIZE = 5;

export const LIMITS = {
  maxScore: 10_000,
  maxName: 20,
  maxDurationMs: 24 * 60 * 60 * 1000,
  maxLength: 1000,
  maxChocolates: 3,
  maxLabel: 24,
} as const;

export const DEATH_CAUSES: readonly DeathCause[] = ['tail', 'wall', 'bomb', 'chocolate'];
export const GOOD_TREAT_KINDS = Object.keys(GOOD_TREATS) as GoodTreatKind[];

export type InputKind = 'touch' | 'keyboard';
export type TreatCounts = Record<GoodTreatKind, number>;

/** Perfil e estatísticas do jogador (sem e-mail: ele já mora no Firebase Auth). */
export interface UserProfile {
  name: string;
  furColor: FurColorId;
  soundMuted: boolean;
  bestScore: number;
  gamesPlayed: number;
  totalPoints: number;
  lastMatchId: string | null;
}

/** Uma partida terminada. As datas são carimbadas pelo servidor. */
export interface MatchRecord {
  score: number;
  cause: DeathCause;
  durationMs: number;
  treats: TreatCounts;
  chocolates: number;
  length: number;
  furColor: FurColorId;
  colorway: string;
  input: InputKind;
  appVersion: string;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  furColor: FurColorId;
  bestScore: number;
}

/* ------------------------------------------------------------- helpers -- */

const clampInt = (value: unknown, max: number): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(max, Math.max(0, n));
};

const label = (value: string): string => value.slice(0, LIMITS.maxLabel);

export const isFurColor = (value: unknown): value is FurColorId =>
  typeof value === 'string' && value in FUR_PALETTES;

export function cleanName(name: string): string {
  return name.trim().slice(0, LIMITS.maxName) || 'Jogador';
}

export function emptyTreats(): TreatCounts {
  return Object.fromEntries(GOOD_TREAT_KINDS.map((kind) => [kind, 0])) as TreatCounts;
}

/** Pontos que os petiscos valem — a mesma conta que as regras conferem. */
export function treatPoints(treats: TreatCounts): number {
  return GOOD_TREAT_KINDS.reduce((sum, kind) => sum + treats[kind] * GOOD_TREATS[kind].points, 0);
}

/* ------------------------------------------------------------ perfil -- */

/** Perfil de quem acabou de chegar: zerado, com as preferências do aparelho. */
export function newProfile(name: string, furColor: FurColorId, soundMuted: boolean): UserProfile {
  return {
    name: cleanName(name),
    furColor,
    soundMuted,
    bestScore: 0,
    gamesPlayed: 0,
    totalPoints: 0,
    lastMatchId: null,
  };
}

/** Lê um perfil vindo do banco tolerando campos faltando ou estranhos. */
export function parseProfile(data: Record<string, unknown> | undefined): UserProfile | null {
  if (!data) return null;
  return {
    name: cleanName(typeof data.name === 'string' ? data.name : ''),
    furColor: isFurColor(data.furColor) ? data.furColor : DEFAULT_FUR_COLOR,
    soundMuted: data.soundMuted === true,
    bestScore: clampInt(data.bestScore, LIMITS.maxScore),
    gamesPlayed: clampInt(data.gamesPlayed, Number.MAX_SAFE_INTEGER),
    totalPoints: clampInt(data.totalPoints, Number.MAX_SAFE_INTEGER),
    lastMatchId: typeof data.lastMatchId === 'string' ? data.lastMatchId : null,
  };
}

/** Estatísticas depois de uma partida, e se ela bateu o recorde. */
export function statsAfter(
  profile: Pick<UserProfile, 'bestScore' | 'gamesPlayed' | 'totalPoints'>,
  score: number,
): { bestScore: number; gamesPlayed: number; totalPoints: number; isRecord: boolean } {
  const isRecord = score > profile.bestScore;
  return {
    bestScore: isRecord ? score : profile.bestScore,
    gamesPlayed: profile.gamesPlayed + 1,
    totalPoints: profile.totalPoints + score,
    isRecord,
  };
}

/* ----------------------------------------------------------- partida -- */

export interface MatchInput {
  cause: DeathCause;
  durationMs: number;
  treats: Partial<TreatCounts>;
  chocolates: number;
  length: number;
  furColor: FurColorId;
  colorway: string;
  input: InputKind;
  appVersion: string;
}

/**
 * Monta o registro da partida. Os pontos saem dos petiscos (e não do placar
 * solto), então sempre batem com a conferência das regras.
 */
export function buildMatch(input: MatchInput): MatchRecord {
  const treats = emptyTreats();
  for (const kind of GOOD_TREAT_KINDS) treats[kind] = clampInt(input.treats[kind], LIMITS.maxScore);
  return {
    score: Math.min(LIMITS.maxScore, treatPoints(treats)),
    cause: DEATH_CAUSES.includes(input.cause) ? input.cause : 'tail',
    durationMs: clampInt(input.durationMs, LIMITS.maxDurationMs),
    treats,
    chocolates: clampInt(input.chocolates, LIMITS.maxChocolates),
    length: Math.max(1, clampInt(input.length, LIMITS.maxLength)),
    furColor: isFurColor(input.furColor) ? input.furColor : DEFAULT_FUR_COLOR,
    colorway: label(input.colorway),
    input: input.input === 'touch' ? 'touch' : 'keyboard',
    appVersion: label(input.appVersion),
  };
}

/* ----------------------------------------------------------- ranking -- */

export function parseLeaderboardEntry(
  uid: string,
  data: Record<string, unknown> | undefined,
): LeaderboardEntry | null {
  if (!data) return null;
  const bestScore = clampInt(data.bestScore, LIMITS.maxScore);
  if (bestScore <= 0) return null;
  return {
    uid,
    name: cleanName(typeof data.name === 'string' ? data.name : ''),
    furColor: isFurColor(data.furColor) ? data.furColor : DEFAULT_FUR_COLOR,
    bestScore,
  };
}

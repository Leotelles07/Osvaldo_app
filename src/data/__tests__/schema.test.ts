import { describe, expect, it } from 'vitest';
import {
  buildMatch,
  cleanName,
  emptyTreats,
  newProfile,
  parseLeaderboardEntry,
  parseProfile,
  statsAfter,
  treatPoints,
  LIMITS,
  type MatchInput,
} from '../schema';
import { GOOD_TREATS } from '../../game/config';

const input: MatchInput = {
  cause: 'bomb',
  durationMs: 61_500.7,
  treats: { bone: 3, beef: 2, watermelon: 1 },
  chocolates: 2,
  length: 11,
  furColor: 'preto',
  colorway: 'magenta',
  input: 'keyboard',
  appVersion: '1.0.0',
};

describe('dados do Osvaldo', () => {
  it('conta os pontos pelos mesmos valores do catálogo de petiscos', () => {
    const treats = emptyTreats();
    treats.watermelon = 2;
    treats.beef = 1;
    treats.bone = 4;
    expect(treatPoints(treats)).toBe(
      2 * GOOD_TREATS.watermelon.points + GOOD_TREATS.beef.points + 4 * GOOD_TREATS.bone.points,
    );
  });

  it('monta a partida com os pontos saindo dos petiscos', () => {
    const match = buildMatch(input);
    expect(match.score).toBe(3 + 4 + 3);
    expect(match.treats).toEqual({ bone: 3, strawberry: 0, banana: 0, avocado: 0, beef: 2, watermelon: 1 });
    expect(match.durationMs).toBe(61_500);
    expect(match).toMatchObject({ cause: 'bomb', chocolates: 2, length: 11, furColor: 'preto', input: 'keyboard' });
  });

  it('corta valores fora das faixas que as regras aceitam', () => {
    const match = buildMatch({
      ...input,
      durationMs: -5,
      chocolates: 9,
      length: 0,
      colorway: 'x'.repeat(80),
      treats: { bone: Number.NaN, beef: -3 },
    });
    expect(match.durationMs).toBe(0);
    expect(match.chocolates).toBe(LIMITS.maxChocolates);
    expect(match.length).toBe(1);
    expect(match.colorway).toHaveLength(LIMITS.maxLabel);
    expect(match.score).toBe(0);
  });

  it('recorde só sobe quando a partida passa do anterior', () => {
    const base = { bestScore: 10, gamesPlayed: 4, totalPoints: 30 };
    expect(statsAfter(base, 12)).toEqual({ bestScore: 12, gamesPlayed: 5, totalPoints: 42, isRecord: true });
    expect(statsAfter(base, 10)).toEqual({ bestScore: 10, gamesPlayed: 5, totalPoints: 40, isRecord: false });
    expect(statsAfter({ bestScore: 0, gamesPlayed: 0, totalPoints: 0 }, 0).isRecord).toBe(false);
  });

  it('perfil novo nasce zerado e com nome limpo', () => {
    expect(newProfile('  Leo  ', 'marrom', true)).toEqual({
      name: 'Leo',
      furColor: 'marrom',
      soundMuted: true,
      bestScore: 0,
      gamesPlayed: 0,
      totalPoints: 0,
      lastMatchId: null,
    });
    expect(cleanName('   ')).toBe('Jogador');
    expect(cleanName('a'.repeat(40))).toHaveLength(LIMITS.maxName);
  });

  it('lê perfis e linhas do ranking tolerando dados estranhos', () => {
    expect(parseProfile(undefined)).toBeNull();
    expect(parseProfile({ name: 'Ana', furColor: 'rosa', bestScore: '9', soundMuted: 'sim' })).toMatchObject({
      name: 'Ana',
      furColor: 'default',
      bestScore: 0,
      soundMuted: false,
      lastMatchId: null,
    });
    expect(parseLeaderboardEntry('u1', { name: 'Ana', furColor: 'branco', bestScore: 15 })).toEqual({
      uid: 'u1',
      name: 'Ana',
      furColor: 'branco',
      bestScore: 15,
    });
    expect(parseLeaderboardEntry('u2', { name: 'Zé', bestScore: 0 })).toBeNull();
  });
});

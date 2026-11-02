/**
 * Regras do Firestore contra o emulador. Rode com `npm run test:rules`.
 *
 * Sempre que possível as gravações passam pelas mesmas funções que o app usa
 * (src/data/firestore.ts), então o teste prova que o app e as regras concordam.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createProfile,
  fetchLeaderboard,
  fetchRank,
  recordMatch,
  savePrefs,
} from '../../src/data/firestore';
import { buildMatch, newProfile, type MatchInput, type UserProfile } from '../../src/data/schema';

let env: RulesTestEnvironment;

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-osvaldo',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

/** Banco visto por um jogador logado (ou por um visitante, sem uid). */
const as = (uid?: string): Firestore =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore() as unknown as Firestore;

const baseMatch: MatchInput = {
  cause: 'tail',
  durationMs: 42_000,
  treats: { bone: 2, beef: 1, watermelon: 1 }, // 2 + 2 + 3 = 7 pontos
  chocolates: 1,
  length: 9,
  furColor: 'marrom',
  colorway: 'teal',
  input: 'touch',
  appVersion: '1.0.0',
};

const leo = (): UserProfile => newProfile('Leo', 'default', false);

/** Cria o perfil do jogador com as regras desligadas (estado de partida). */
async function seedProfile(uid: string, data: Partial<UserProfile> = {}): Promise<UserProfile> {
  const profile = { ...leo(), ...data };
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, 'users', uid), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastPlayedAt: null,
    });
  });
  return profile;
}

async function seedLeaderboard(uid: string, name: string, bestScore: number): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, 'leaderboard', uid), {
      name,
      furColor: 'preto',
      bestScore,
      updatedAt: serverTimestamp(),
    });
  });
}

/* ------------------------------------------------------------------ */

describe('sem login', () => {
  it('não lê nem grava nada', async () => {
    await seedProfile('leo');
    const db = as();
    await assertFails(getDoc(doc(db, 'users/leo')));
    await assertFails(getDocs(collection(db, 'leaderboard')));
    await assertFails(createProfile(db, 'leo', leo()));
  });
});

describe('users/{uid}', () => {
  it('o dono cria o próprio perfil zerado', async () => {
    await assertSucceeds(createProfile(as('leo'), 'leo', leo()));
  });

  it('ninguém cria perfil no lugar de outro', async () => {
    await assertFails(createProfile(as('ana'), 'leo', leo()));
  });

  it('perfil novo não pode nascer com recorde', async () => {
    await assertFails(
      setDoc(doc(as('leo'), 'users/leo'), {
        ...leo(),
        bestScore: 500,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastPlayedAt: null,
      }),
    );
  });

  it('recusa campos fora da lista e datas do aparelho', async () => {
    const db = as('leo');
    const valid = { ...leo(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastPlayedAt: null };
    await assertFails(setDoc(doc(db, 'users/leo'), { ...valid, email: 'leo@x.com' }));
    await assertFails(setDoc(doc(db, 'users/leo'), { ...valid, createdAt: new Date() }));
    await assertFails(setDoc(doc(db, 'users/leo'), { ...valid, furColor: 'rosa' }));
    await assertFails(setDoc(doc(db, 'users/leo'), { ...valid, name: '' }));
  });

  it('só o dono lê o perfil', async () => {
    await seedProfile('leo');
    await assertSucceeds(getDoc(doc(as('leo'), 'users/leo')));
    await assertFails(getDoc(doc(as('ana'), 'users/leo')));
  });

  it('o dono troca cor e som', async () => {
    await seedProfile('leo');
    await assertSucceeds(savePrefs(as('leo'), 'leo', { furColor: 'branco', soundMuted: true }));
  });

  it('ninguém mexe nas preferências de outro', async () => {
    await seedProfile('leo');
    await assertFails(savePrefs(as('ana'), 'leo', { furColor: 'branco' }));
  });

  it('não dá para inflar estatísticas sem uma partida', async () => {
    await seedProfile('leo');
    const db = as('leo');
    await assertFails(updateDoc(doc(db, 'users/leo'), { bestScore: 999, updatedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(doc(db, 'users/leo'), {
        gamesPlayed: increment(1),
        totalPoints: increment(50),
        bestScore: 50,
        lastMatchId: 'inventada',
        lastPlayedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('perfil não é apagado pelo app', async () => {
    await seedProfile('leo');
    await assertFails(deleteDoc(doc(as('leo'), 'users/leo')));
  });
});

describe('fim de partida (partida + perfil + ranking)', () => {
  it('grava tudo junto quando é recorde', async () => {
    const profile = await seedProfile('leo');
    const db = as('leo');
    const result = recordMatch(db, 'leo', profile, buildMatch(baseMatch));
    await assertSucceeds(result.committed);
    expect(result.stats).toMatchObject({ bestScore: 7, gamesPlayed: 1, totalPoints: 7, isRecord: true });

    const saved = (await getDoc(doc(db, 'users/leo'))).data();
    expect(saved).toMatchObject({ bestScore: 7, gamesPlayed: 1, totalPoints: 7, lastMatchId: result.matchId });
    const match = (await getDoc(doc(db, `users/leo/matches/${result.matchId}`))).data();
    expect(match).toMatchObject({ score: 7, cause: 'tail', furColor: 'marrom' });
    const entry = (await getDoc(doc(db, 'leaderboard/leo'))).data();
    expect(entry).toMatchObject({ name: 'Leo', bestScore: 7, furColor: 'marrom' });
  });

  it('funciona a partir de um perfil criado pelo próprio app', async () => {
    const db = as('leo');
    await assertSucceeds(createProfile(db, 'leo', leo()));
    await assertSucceeds(recordMatch(db, 'leo', leo(), buildMatch(baseMatch)).committed);
  });

  it('partida abaixo do recorde soma os pontos e não mexe no ranking', async () => {
    const profile = await seedProfile('leo', { bestScore: 20, gamesPlayed: 3, totalPoints: 40, lastMatchId: 'm0' });
    await seedLeaderboard('leo', 'Leo', 20);
    const db = as('leo');
    const result = recordMatch(db, 'leo', profile, buildMatch(baseMatch));
    await assertSucceeds(result.committed);
    expect((await getDoc(doc(db, 'users/leo'))).data()).toMatchObject({
      bestScore: 20,
      gamesPlayed: 4,
      totalPoints: 47,
    });
    expect((await getDoc(doc(db, 'leaderboard/leo'))).data()?.bestScore).toBe(20);
  });

  it('partida zerada também entra no histórico', async () => {
    const profile = await seedProfile('leo');
    const result = recordMatch(as('leo'), 'leo', profile, buildMatch({ ...baseMatch, treats: {} }));
    await assertSucceeds(result.committed);
    expect(result.stats.isRecord).toBe(false);
  });

  it('recusa partida sozinha, sem atualizar o perfil', async () => {
    await seedProfile('leo');
    const db = as('leo');
    await assertFails(
      setDoc(doc(db, 'users/leo/matches/m1'), { ...buildMatch(baseMatch), playedAt: serverTimestamp() }),
    );
  });

  it('recusa pontos que não batem com os petiscos', async () => {
    await seedProfile('leo');
    const db = as('leo');
    const batch = writeBatch(db);
    const match = { ...buildMatch(baseMatch), score: 900 };
    batch.set(doc(db, 'users/leo/matches/m1'), { ...match, playedAt: serverTimestamp() });
    batch.update(doc(db, 'users/leo'), {
      gamesPlayed: increment(1),
      totalPoints: increment(900),
      bestScore: 900,
      lastMatchId: 'm1',
      lastPlayedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  });

  it('recusa recorde que não é o da partida', async () => {
    await seedProfile('leo');
    const db = as('leo');
    // Partida de 7 pontos tentando gravar recorde de 999.
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/leo/matches/m2'), { ...buildMatch(baseMatch), playedAt: serverTimestamp() });
    batch.update(doc(db, 'users/leo'), {
      gamesPlayed: increment(1),
      totalPoints: increment(7),
      bestScore: 999,
      lastMatchId: 'm2',
      lastPlayedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  });

  it('recusa gravar partida no perfil de outro jogador', async () => {
    const profile = await seedProfile('leo');
    await assertFails(recordMatch(as('ana'), 'leo', profile, buildMatch(baseMatch)).committed);
  });

  it('histórico é imutável e privado', async () => {
    const profile = await seedProfile('leo');
    const { matchId, committed } = recordMatch(as('leo'), 'leo', profile, buildMatch(baseMatch));
    await committed;
    const path = `users/leo/matches/${matchId}`;
    await assertFails(updateDoc(doc(as('leo'), path), { score: 3 }));
    await assertFails(deleteDoc(doc(as('leo'), path)));
    await assertFails(getDoc(doc(as('ana'), path)));
    await assertSucceeds(getDoc(doc(as('leo'), path)));
  });
});

describe('leaderboard/{uid}', () => {
  it('qualquer jogador logado vê o top 5, em ordem', async () => {
    const scores = [12, 40, 7, 33, 21, 5];
    await Promise.all(scores.map((score, i) => seedLeaderboard(`p${i}`, `Jogador ${i}`, score)));
    const top = await assertSucceeds(fetchLeaderboard(as('leo')));
    expect(top.map((entry) => entry.bestScore)).toEqual([40, 33, 21, 12, 7]);
    expect(await fetchRank(as('leo'), 21)).toBe(3);
    expect(await fetchRank(as('leo'), 1)).toBe(7);
  });

  it('não aceita recorde que não está no perfil', async () => {
    await seedProfile('leo', { bestScore: 10 });
    const db = as('leo');
    const entry = { name: 'Leo', furColor: 'default', bestScore: 99, updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(db, 'leaderboard/leo'), entry));
    await assertSucceeds(setDoc(doc(db, 'leaderboard/leo'), { ...entry, bestScore: 10 }));
  });

  it('não aceita nome diferente do perfil, nem baixar o recorde', async () => {
    await seedProfile('leo', { bestScore: 10 });
    await seedLeaderboard('leo', 'Leo', 10);
    const db = as('leo');
    const entry = { name: 'Leo', furColor: 'default', bestScore: 10, updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(db, 'leaderboard/leo'), { ...entry, name: 'Campeão' }));
    await assertFails(setDoc(doc(db, 'leaderboard/leo'), entry)); // não subiu: nada a gravar
  });

  it('ninguém grava nem apaga a linha de outro', async () => {
    await seedProfile('leo', { bestScore: 10 });
    await seedLeaderboard('leo', 'Leo', 10);
    const db = as('ana');
    await assertFails(
      setDoc(doc(db, 'leaderboard/leo'), { name: 'Leo', furColor: 'default', bestScore: 10, updatedAt: serverTimestamp() }),
    );
    await assertFails(deleteDoc(doc(db, 'leaderboard/leo')));
  });
});

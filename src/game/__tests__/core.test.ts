import { describe, expect, it } from 'vitest';
import { Game } from '../core';
import { CONFIG, GOOD_TREATS, type GoodTreatKind, type HazardKind } from '../config';

/** Avança exatamente `count` passos da simulação, sem depender do relógio real. */
function step(game: Game, count = 1): void {
  for (let i = 0; i < count; i++) {
    // update() limita o delta para absorver travadas; 120ms é o teto.
    // Usa a velocidade atual: enjoado de chocolate, o passo é mais longo.
    let remaining = Math.ceil(1000 / game.stepsPerSecond) + 1;
    while (remaining > 0) {
      const slice = Math.min(120, remaining);
      game.update(slice);
      remaining -= slice;
    }
  }
}

/** Coloca um petisco bom logo à frente da cabeça (Osvaldo andando para a direita). */
function treatAhead(game: Game, kind: GoodTreatKind = 'bone'): void {
  game.treat = { x: game.head.x + 1, y: game.head.y, kind };
}

/** Coloca um perigo logo à frente da cabeça. */
function hazardAhead(game: Game, kind: HazardKind): void {
  game.hazards = [{ x: game.head.x + 1, y: game.head.y, kind }];
}

function newGame(cols = 15, rows = 15): Game {
  const game = new Game();
  game.setGrid(cols, rows);
  game.start();
  return game;
}

describe('Osvaldo', () => {
  it('começa com o tamanho configurado e parado na fase "ready"', () => {
    const game = new Game();
    expect(game.phase).toBe('ready');
    expect(game.body).toHaveLength(CONFIG.startLength);
    // Corpo alinhado na horizontal, cabeça à frente.
    expect(new Set(game.body.map((c) => c.y)).size).toBe(1);
    expect(game.body[0].x).toBeGreaterThan(game.body[1].x);
  });

  it('anda para a direita e o corpo segue a cabeça', () => {
    const game = newGame();
    const before = game.body.map((c) => ({ ...c }));
    step(game);
    expect(game.body[0]).toEqual({ x: before[0].x + 1, y: before[0].y });
    expect(game.body[1]).toEqual(before[0]);
    expect(game.body).toHaveLength(before.length);
  });

  it('heading reflete a última curva pedida, antes mesmo do passo', () => {
    const game = newGame();
    expect(game.heading).toBe('right');
    game.turn('up');
    expect(game.heading).toBe('up');
    expect(game.direction).toBe('right');
    game.turn('left');
    expect(game.heading).toBe('left');
    step(game, 2);
    expect(game.direction).toBe('left');
    expect(game.heading).toBe('left');
  });

  it('ignora a curva de 180 graus (o Osvaldo não se dobra ao meio)', () => {
    const game = newGame();
    game.turn('left');
    step(game);
    expect(game.direction).toBe('right');
  });

  it('come o petisco, ganha 1 ponto, cresce e acelera', () => {
    const game = newGame();
    const lengthBefore = game.body.length;
    const speedBefore = game.stepsPerSecond;

    // Coloca o petisco exatamente na frente da cabeça.
    treatAhead(game);
    step(game);
    expect(game.score).toBe(1);

    step(game); // o crescimento aparece no passo seguinte
    expect(game.body.length).toBe(lengthBefore + CONFIG.growPerTreat);
    expect(game.stepsPerSecond).toBeGreaterThan(speedBefore);
  });

  it('nunca coloca o petisco em cima do Osvaldo', () => {
    const game = newGame();
    for (let i = 0; i < 200; i++) {
      treatAhead(game);
      step(game);
      // Se morreu, o petisco da vez foi o que o próprio teste pôs à frente da cabeça.
      if (game.phase !== 'running') break;
      const occupied = game.body.some((c) => c.x === game.treat.x && c.y === game.treat.y);
      expect(occupied).toBe(false);
      const onHazard = game.hazards.some((h) => h.x === game.treat.x && h.y === game.treat.y);
      expect(onHazard).toBe(false);
    }
  });

  it('acelera a cada petisco, mas respeita o piso de velocidade', () => {
    // Tabuleiro largo o bastante para comer em linha reta sem se enroscar.
    const game = newGame(80, 80);
    const treatsToReachFloor =
      Math.ceil((CONFIG.startStepMs - CONFIG.minStepMs) / CONFIG.speedUpPerTreat) + 5;

    let previous = game.stepsPerSecond;
    for (let i = 0; i < treatsToReachFloor; i++) {
      treatAhead(game);
      step(game);
      expect(game.phase).toBe('running');
      expect(game.stepsPerSecond).toBeGreaterThanOrEqual(previous);
      previous = game.stepsPerSecond;
    }

    expect(game.score).toBe(treatsToReachFloor);
    expect(game.stepsPerSecond).toBeCloseTo(1000 / CONFIG.minStepMs, 5);
  });

  it('encerra a partida quando morde o próprio rabo', () => {
    const game = newGame();
    // Com 5 segmentos, quatro curvas seguidas fecham o laço sobre o corpo.
    game.turn('down');
    step(game);
    game.turn('left');
    step(game);
    game.turn('up');
    step(game);

    expect(game.phase).toBe('over');
    expect(game.deathCell).not.toBeNull();
  });

  it('atravessa a borda e reaparece do outro lado', () => {
    const game = newGame();
    const startY = game.head.y;
    for (let i = 0; i < game.cols + 2; i++) {
      step(game);
      expect(game.phase).toBe('running');
      expect(game.head.x).toBeGreaterThanOrEqual(0);
      expect(game.head.x).toBeLessThan(game.cols);
    }
    expect(game.head.y).toBe(startY);
  });

  it('avisa a pontuação ao comer e ao perder', () => {
    const eaten: number[] = [];
    let died: number | null = null;
    const game = new Game({ onEat: (s) => eaten.push(s), onDeath: (s) => (died = s) });
    game.setGrid(15, 15);
    game.start();

    treatAhead(game);
    step(game);
    expect(eaten).toEqual([1]);

    game.turn('down');
    step(game);
    game.turn('left');
    step(game);
    game.turn('up');
    step(game);
    expect(died).toBe(1);
  });

  it('não redimensiona o tabuleiro com a partida em andamento', () => {
    const game = newGame(15, 15);
    expect(game.setGrid(20, 20)).toBe(false);
    expect(game.cols).toBe(15);
  });

  it('reinicia limpo depois de perder', () => {
    const game = newGame();
    treatAhead(game);
    step(game, 2);
    game.reset();
    expect(game.score).toBe(0);
    expect(game.phase).toBe('ready');
    expect(game.body).toHaveLength(CONFIG.startLength);
    expect(game.stepsPerSecond).toBeCloseTo(1000 / CONFIG.startStepMs, 5);
  });

  it('petiscos valem pontos diferentes, mas todos fazem crescer', () => {
    const game = newGame(80, 80);
    const lengthBefore = game.body.length;
    treatAhead(game, 'watermelon');
    step(game);
    expect(game.score).toBe(GOOD_TREATS.watermelon.points);
    treatAhead(game, 'beef');
    step(game);
    expect(game.score).toBe(GOOD_TREATS.watermelon.points + GOOD_TREATS.beef.points);
    step(game);
    expect(game.body.length).toBe(lengthBefore + 2 * CONFIG.growPerTreat);
  });

  it('o petisco sorteado é sempre um petisco bom', () => {
    const game = newGame(80, 80);
    for (let i = 0; i < 60; i++) {
      treatAhead(game);
      step(game);
      expect(game.treat.kind in GOOD_TREATS).toBe(true);
    }
  });

  it('chocolate faz passar mal: sem pontos, sem crescer e mais devagar', () => {
    const sick: number[] = [];
    const game = new Game({ onSick: (count) => sick.push(count) });
    game.setGrid(15, 15);
    game.start();
    const lengthBefore = game.body.length;
    const speedBefore = game.stepsPerSecond;

    hazardAhead(game, 'chocolate');
    step(game);
    expect(game.phase).toBe('running');
    expect(sick).toEqual([1]);
    expect(game.chocolates).toBe(1);
    expect(game.score).toBe(0);
    expect(game.hazards).toHaveLength(0);
    expect(game.sickness).toBeGreaterThan(0);
    expect(game.stepsPerSecond).toBeLessThan(speedBefore);

    step(game);
    expect(game.body.length).toBe(lengthBefore);
  });

  it('o mal-estar passa depois de um tempo', () => {
    const game = newGame(80, 80);
    const speedBefore = game.stepsPerSecond;
    hazardAhead(game, 'chocolate');
    step(game);
    for (let t = 0; t < CONFIG.sickMs + 200; t += 100) game.update(100);
    expect(game.phase).toBe('running');
    expect(game.sickness).toBe(0);
    expect(game.stepsPerSecond).toBeCloseTo(speedBefore, 5);
  });

  it(`perde no chocolate de número ${CONFIG.chocolateLimit}`, () => {
    let cause: string | null = null;
    const game = new Game({ onDeath: (_, c) => (cause = c) });
    game.setGrid(80, 80);
    game.start();
    for (let i = 1; i < CONFIG.chocolateLimit; i++) {
      hazardAhead(game, 'chocolate');
      step(game);
      expect(game.phase).toBe('running');
    }
    hazardAhead(game, 'chocolate');
    step(game);
    expect(game.phase).toBe('over');
    expect(cause).toBe('chocolate');
    expect(game.deathCause).toBe('chocolate');
  });

  it('dinamite encerra a partida na hora', () => {
    const game = newGame();
    hazardAhead(game, 'bomb');
    step(game);
    expect(game.phase).toBe('over');
    expect(game.deathCause).toBe('bomb');
    expect(game.deathCell).toEqual(game.head);
  });

  it('perigos só aparecem depois de alguns pontos e nunca colados na cabeça', () => {
    const game = newGame(40, 40);
    let sawHazard = false;
    for (let i = 0; i < 80; i++) {
      treatAhead(game);
      step(game);
      if (game.score < CONFIG.hazardsFromScore) expect(game.hazards).toHaveLength(0);
      expect(game.hazards.length).toBeLessThanOrEqual(CONFIG.maxHazards);
      for (const h of game.hazards) {
        const dx = Math.min(Math.abs(h.x - game.head.x), game.cols - Math.abs(h.x - game.head.x));
        const dy = Math.min(Math.abs(h.y - game.head.y), game.rows - Math.abs(h.y - game.head.y));
        expect(Math.max(dx, dy)).toBeGreaterThan(CONFIG.hazardSafeRadius);
        expect(h.x === game.treat.x && h.y === game.treat.y).toBe(false);
        if (h.kind === 'bomb') expect(game.score).toBeGreaterThanOrEqual(CONFIG.bombsFromScore);
        sawHazard = true;
      }
      if (game.phase !== 'running') break;
    }
    expect(sawHazard).toBe(true);
  });

  it('os perigos antigos somem quando o próximo petisco bom é comido', () => {
    const game = newGame(40, 40);
    const far = { x: (game.head.x + 20) % game.cols, y: (game.head.y + 20) % game.rows };
    game.hazards = [{ ...far, kind: 'bomb' }];
    treatAhead(game);
    step(game);
    expect(game.hazards).toHaveLength(0); // score 1: ainda não surgem perigos novos
  });

  it('reiniciar zera chocolates, mal-estar e perigos', () => {
    const game = newGame();
    hazardAhead(game, 'chocolate');
    step(game);
    game.hazards = [{ x: 0, y: 0, kind: 'bomb' }];
    game.reset();
    expect(game.chocolates).toBe(0);
    expect(game.sickness).toBe(0);
    expect(game.hazards).toHaveLength(0);
    expect(game.deathCause).toBeNull();
  });
});

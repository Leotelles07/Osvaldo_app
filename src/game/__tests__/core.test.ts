import { describe, expect, it } from 'vitest';
import { Game } from '../core';
import { CONFIG } from '../config';

/** Avança exatamente `count` passos da simulação, sem depender do relógio real. */
function step(game: Game, count = 1): void {
  for (let i = 0; i < count; i++) {
    // update() limita o delta para absorver travadas; 120ms é o teto.
    let remaining = CONFIG.startStepMs + 1;
    while (remaining > 0) {
      const slice = Math.min(120, remaining);
      game.update(slice);
      remaining -= slice;
    }
  }
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
    game.treat = { x: game.head.x + 1, y: game.head.y };
    step(game);
    expect(game.score).toBe(1);

    step(game); // o crescimento aparece no passo seguinte
    expect(game.body.length).toBe(lengthBefore + CONFIG.growPerTreat);
    expect(game.stepsPerSecond).toBeGreaterThan(speedBefore);
  });

  it('nunca coloca o petisco em cima do Osvaldo', () => {
    const game = newGame();
    for (let i = 0; i < 200; i++) {
      game.treat = { x: game.head.x + 1, y: game.head.y };
      step(game);
      const occupied = game.body.some((c) => c.x === game.treat.x && c.y === game.treat.y);
      expect(occupied).toBe(false);
      if (game.phase !== 'running') break;
    }
  });

  it('acelera a cada petisco, mas respeita o piso de velocidade', () => {
    // Tabuleiro largo o bastante para comer em linha reta sem se enroscar.
    const game = newGame(80, 80);
    const treatsToReachFloor =
      Math.ceil((CONFIG.startStepMs - CONFIG.minStepMs) / CONFIG.speedUpPerTreat) + 5;

    let previous = game.stepsPerSecond;
    for (let i = 0; i < treatsToReachFloor; i++) {
      game.treat = { x: game.head.x + 1, y: game.head.y };
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

    game.treat = { x: game.head.x + 1, y: game.head.y };
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
    game.treat = { x: game.head.x + 1, y: game.head.y };
    step(game, 2);
    game.reset();
    expect(game.score).toBe(0);
    expect(game.phase).toBe('ready');
    expect(game.body).toHaveLength(CONFIG.startLength);
    expect(game.stepsPerSecond).toBeCloseTo(1000 / CONFIG.startStepMs, 5);
  });
});

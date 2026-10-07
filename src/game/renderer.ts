/**
 * Liga o estado do jogo ao canvas: cuida do dimensionamento (DPR), converte
 * células em pixels e resolve a travessia das bordas.
 */
import { CONFIG, type Cell } from './config';
import type { Game } from './core';
import { getColorway } from '../brand/colorways';
import {
  drawArena,
  drawExplosion,
  drawOsvaldo,
  drawPopup,
  drawScorch,
  drawTreat,
  lerp,
  FUR_PALETTES,
  DEFAULT_FUR_COLOR,
  type FurColorId,
  type Point,
} from './draw';

/** Distância (em células) acima da qual dois segmentos vizinhos estão "quebrados" pela borda. */
const BREAK_DISTANCE = 1.6;

/** Quanto tempo um texto flutuante ("+2", "Eca!") fica na tela. */
const POPUP_MS = 900;

interface Popup {
  cell: Cell;
  text: string;
  color: string;
  at: number;
}

export interface RenderEffects {
  /** 0..1: força da mastigada (língua de fora). */
  chomp: number;
  /** Instante (performance.now) em que a partida acabou, se acabou. */
  deathAt: number | null;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  cell = 20;
  private cssWidth = 0;
  private cssHeight = 0;
  private fur = FUR_PALETTES[DEFAULT_FUR_COLOR];
  private popups: Popup[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D não está disponível neste navegador.');
    this.ctx = ctx;
  }

  /** Define a cor do Osvaldo usada nas próximas renderizações. */
  setFurColor(colorId: FurColorId): void {
    this.fur = FUR_PALETTES[colorId];
  }

  /** Mostra um texto flutuante saindo de uma célula do tabuleiro. */
  addPopup(cell: Cell, text: string, color: string, time: number): void {
    this.popups.push({ cell: { ...cell }, text, color, at: time });
  }

  clearPopups(): void {
    this.popups = [];
  }

  /**
   * Quantas colunas e linhas cabem confortavelmente no espaço disponível,
   * mantendo as células perto do tamanho alvo (bom para o dedo).
   */
  static pickGrid(availableWidth: number, availableHeight: number): { cols: number; rows: number } {
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const target = clamp(
      Math.min(availableWidth, availableHeight) / CONFIG.cellsOnShortSide,
      CONFIG.minCellPx,
      CONFIG.maxCellPx,
    );
    return {
      cols: clamp(Math.round(availableWidth / target), CONFIG.minCols, CONFIG.maxCols),
      rows: clamp(Math.round(availableHeight / target), CONFIG.minRows, CONFIG.maxRows),
    };
  }

  /** Ajusta o tabuleiro ao espaço disponível mantendo as células quadradas. */
  resize(availableWidth: number, availableHeight: number, cols: number, rows: number): void {
    const cell = Math.max(8, Math.floor(Math.min(availableWidth / cols, availableHeight / rows)));
    const cssWidth = cell * cols;
    const cssHeight = cell * rows;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (cell === this.cell && cssWidth === this.cssWidth && cssHeight === this.cssHeight) return;

    this.cell = cell;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Centro do segmento, em pixels CSS relativos ao canvas. */
  private toPixel(x: number, y: number): Point {
    return { x: (x + 0.5) * this.cell, y: (y + 0.5) * this.cell };
  }

  /**
   * Posições interpoladas de todos os segmentos. Quando um segmento atravessa a
   * borda, a posição anterior é reescrita para fora do tabuleiro, de modo que a
   * animação deslize para fora/para dentro em vez de teleportar.
   */
  private interpolated(game: Game): Point[] {
    const t = game.alpha;
    const result: Point[] = [];
    for (let i = 0; i < game.body.length; i++) {
      const cur = game.body[i];
      const prev = game.prevBody[i] ?? cur;
      let px = prev.x;
      let py = prev.y;
      if (cur.x - px > 1) px += game.cols;
      else if (px - cur.x > 1) px -= game.cols;
      if (cur.y - py > 1) py += game.rows;
      else if (py - cur.y > 1) py -= game.rows;
      result.push(this.toPixel(lerp(px, cur.x, t), lerp(py, cur.y, t)));
    }
    return result;
  }

  /** Posição da cabeça em pixels — usada pelo controle por toque. */
  headPixel(game: Game): Point {
    const pts = this.interpolated(game);
    return pts[0] ?? this.toPixel(0, 0);
  }

  render(game: Game, time: number, fx: RenderEffects): void {
    const ctx = this.ctx;
    const cell = this.cell;
    const { chomp, deathAt } = fx;
    const exploded = game.phase === 'over' && game.deathCause === 'bomb' && game.deathCell;

    const cw = getColorway();
    drawArena(ctx, this.cssWidth, this.cssHeight, cell, cw.field, cw.fieldAlt);
    if (exploded) drawScorch(ctx, this.toPixel(game.deathCell!.x, game.deathCell!.y), cell);
    drawTreat(ctx, game.treat.kind, this.toPixel(game.treat.x, game.treat.y), cell, time);
    for (const hazard of game.hazards) {
      drawTreat(ctx, hazard.kind, this.toPixel(hazard.x, hazard.y), cell, time);
    }

    const points = this.interpolated(game);

    // Quebra o corpo nos pontos onde ele atravessa a borda.
    const runs: Array<{ points: Point[]; offset: number }> = [];
    let current: Point[] = [points[0]];
    let offset = 0;
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      if (d > BREAK_DISTANCE * cell) {
        runs.push({ points: current, offset });
        offset = i;
        current = [];
      }
      current.push(points[i]);
    }
    runs.push({ points: current, offset });

    const dead = game.phase === 'over';
    const moving = game.phase === 'running';
    // Quem morreu de chocolate fica verde de vez.
    const sick = dead && game.deathCause === 'chocolate' ? 1 : game.sickness;

    for (const run of runs) {
      const draws: Array<{ dx: number; dy: number }> = [{ dx: 0, dy: 0 }];
      // Se o trecho está saindo do tabuleiro, desenha também a cópia do outro
      // lado: o Osvaldo sai por uma borda e entra pela oposta ao mesmo tempo.
      const xs = run.points.map((p) => p.x);
      const ys = run.points.map((p) => p.y);
      if (Math.min(...xs) < 0) draws.push({ dx: this.cssWidth, dy: 0 });
      if (Math.max(...xs) > this.cssWidth) draws.push({ dx: -this.cssWidth, dy: 0 });
      if (Math.min(...ys) < 0) draws.push({ dx: 0, dy: this.cssHeight });
      if (Math.max(...ys) > this.cssHeight) draws.push({ dx: 0, dy: -this.cssHeight });

      for (const d of draws) {
        ctx.save();
        ctx.translate(d.dx, d.dy);
        drawOsvaldo(ctx, {
          points: run.points,
          cell,
          time,
          indexOffset: run.offset,
          totalSegments: points.length,
          dead,
          chomp,
          moving,
          withHead: run.offset === 0,
          withTail: run.offset + run.points.length === points.length,
          fur: this.fur,
          sick,
        });
        ctx.restore();
      }
    }

    if (exploded && deathAt !== null) {
      drawExplosion(ctx, this.toPixel(game.deathCell!.x, game.deathCell!.y), cell, time - deathAt);
    }

    this.popups = this.popups.filter((p) => time - p.at < POPUP_MS);
    for (const p of this.popups) {
      drawPopup(ctx, this.toPixel(p.cell.x, p.cell.y), cell, p.text, p.color, time - p.at);
    }
  }
}

/**
 * Núcleo do jogo: apenas estado e regras, sem canvas e sem DOM.
 * Isso mantém a simulação determinística (mesmos inputs = mesma partida)
 * e permite testar/ajustar as regras isoladamente.
 */
import { CONFIG, DELTA, OPPOSITE, type Cell, type Direction } from './config';

export type Phase = 'ready' | 'running' | 'over';

export interface GameEvents {
  onEat?: (score: number) => void;
  onDeath?: (score: number) => void;
}

export class Game {
  /** Dimensões do tabuleiro em células (ajustadas ao formato da tela). */
  cols: number = CONFIG.defaultCols;
  rows: number = CONFIG.defaultRows;
  /** Segmentos do Osvaldo, da cabeça (índice 0) até a ponta do rabo. */
  body: Cell[] = [];
  /** Posição dos segmentos no passo anterior — usada para interpolar o desenho. */
  prevBody: Cell[] = [];
  direction: Direction = 'right';
  treat: Cell = { x: 0, y: 0 };
  score = 0;
  phase: Phase = 'ready';
  /** Progresso (0..1) entre o passo anterior e o atual. */
  alpha = 0;
  /** Guardado para a animação de "morreu aqui". */
  deathCell: Cell | null = null;

  private queue: Direction[] = [];
  private pendingGrowth = 0;
  private accumulator = 0;
  private stepMs: number = CONFIG.startStepMs;
  private events: GameEvents;

  constructor(events: GameEvents = {}) {
    this.events = events;
    this.reset();
  }

  /**
   * Redimensiona o tabuleiro. Só vale entre partidas: mudar o tamanho com o
   * Osvaldo correndo deixaria segmentos fora do mapa.
   */
  setGrid(cols: number, rows: number): boolean {
    if (this.phase === 'running') return false;
    if (cols === this.cols && rows === this.rows) return false;
    this.cols = cols;
    this.rows = rows;
    this.reset();
    return true;
  }

  reset(): void {
    const midY = Math.floor(this.rows / 2);
    const startX = Math.floor(this.cols / 3) + 1;

    this.body = [];
    for (let i = 0; i < CONFIG.startLength; i++) {
      this.body.push({ x: startX - i, y: midY });
    }
    this.prevBody = this.body.map((c) => ({ ...c }));
    this.direction = 'right';
    this.queue = [];
    this.pendingGrowth = 0;
    this.accumulator = 0;
    this.alpha = 0;
    this.score = 0;
    this.stepMs = CONFIG.startStepMs;
    this.phase = 'ready';
    this.deathCell = null;
    this.placeTreat();
  }

  start(): void {
    if (this.phase === 'ready') {
      this.phase = 'running';
      this.accumulator = 0;
      this.alpha = 0;
    }
  }

  /** Velocidade atual em passos por segundo (usada pelas animações). */
  get stepsPerSecond(): number {
    return 1000 / this.stepMs;
  }

  get head(): Cell {
    return this.body[0];
  }

  /**
   * Registra uma direção desejada. Curvas de 180 graus são ignoradas —
   * o Osvaldo é comprido, não consegue se dobrar ao meio.
   */
  turn(next: Direction): void {
    const last = this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.direction;
    if (next === last || next === OPPOSITE[last]) return;
    if (this.queue.length >= CONFIG.maxQueuedDirections) return;
    this.queue.push(next);
  }

  /**
   * Avança o tempo. A lógica roda em passos discretos de tamanho fixo; o render
   * interpola entre eles, então o movimento fica suave em qualquer taxa de quadros.
   */
  update(deltaMs: number): void {
    if (this.phase !== 'running') return;

    // Um pico de lag não pode teletransportar o Osvaldo.
    this.accumulator += Math.min(deltaMs, 120);

    while (this.accumulator >= this.stepMs) {
      this.accumulator -= this.stepMs;
      this.step();
      if (this.phase !== 'running') {
        this.alpha = 1;
        return;
      }
    }
    this.alpha = this.accumulator / this.stepMs;
  }

  private step(): void {
    const nextDir = this.queue.shift();
    if (nextDir) this.direction = nextDir;

    const delta = DELTA[this.direction];
    const head = this.body[0];
    let nx = head.x + delta.x;
    let ny = head.y + delta.y;

    if (CONFIG.wrapWalls) {
      nx = (nx + this.cols) % this.cols;
      ny = (ny + this.rows) % this.rows;
    } else if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) {
      this.die({ x: head.x, y: head.y });
      return;
    }

    // A ponta do rabo sai do lugar neste mesmo passo, então só é obstáculo
    // quando o Osvaldo está crescendo.
    const ignoreTail = this.pendingGrowth === 0;
    const limit = ignoreTail ? this.body.length - 1 : this.body.length;
    for (let i = 0; i < limit; i++) {
      if (this.body[i].x === nx && this.body[i].y === ny) {
        this.die({ x: nx, y: ny });
        return;
      }
    }

    this.prevBody = this.body.map((c) => ({ ...c }));
    this.body.unshift({ x: nx, y: ny });

    if (this.pendingGrowth > 0) {
      this.pendingGrowth--;
      // Cresceu: o rabo fica onde estava, então o prevBody precisa do segmento extra.
      this.prevBody.push({ ...this.prevBody[this.prevBody.length - 1] });
    } else {
      this.body.pop();
    }

    if (nx === this.treat.x && ny === this.treat.y) {
      this.eat();
    }
  }

  private eat(): void {
    this.score += 1;
    this.pendingGrowth += CONFIG.growPerTreat;
    this.stepMs = Math.max(CONFIG.minStepMs, this.stepMs - CONFIG.speedUpPerTreat);
    this.placeTreat();
    this.events.onEat?.(this.score);
  }

  private die(at: Cell): void {
    this.phase = 'over';
    this.deathCell = at;
    this.events.onDeath?.(this.score);
  }

  /**
   * Sorteia um petisco em uma célula livre. Percorre as células livres em vez de
   * sortear "até dar certo", para não travar quando o tabuleiro estiver cheio.
   */
  private placeTreat(): void {
    const occupied = new Set(this.body.map((c) => c.y * this.cols + c.x));
    const free: number[] = [];
    for (let i = 0; i < this.cols * this.rows; i++) {
      if (!occupied.has(i)) free.push(i);
    }
    if (free.length === 0) return; // tabuleiro lotado: vitória absoluta do jogador
    const pick = free[Math.floor(Math.random() * free.length)];
    this.treat = { x: pick % this.cols, y: Math.floor(pick / this.cols) };
  }
}

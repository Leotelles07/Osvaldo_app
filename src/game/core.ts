/**
 * Núcleo do jogo: apenas estado e regras, sem canvas e sem DOM.
 * Isso mantém a simulação determinística (mesmos inputs = mesma partida)
 * e permite testar/ajustar as regras isoladamente.
 */
import {
  CONFIG,
  DELTA,
  GOOD_TREATS,
  OPPOSITE,
  type Cell,
  type Direction,
  type GoodTreatKind,
  type HazardKind,
} from './config';

export type Phase = 'ready' | 'running' | 'over';

/** O que encerrou a partida: mordida no rabo, cerca, dinamite ou chocolate demais. */
export type DeathCause = 'tail' | 'wall' | 'bomb' | 'chocolate';

export interface GoodTreat extends Cell {
  kind: GoodTreatKind;
}

export interface Hazard extends Cell {
  kind: HazardKind;
}

export interface GameEvents {
  onEat?: (score: number, treat: GoodTreat, points: number) => void;
  /** Comeu chocolate e sobreviveu: `count` é quantos já comeu na partida. */
  onSick?: (count: number, at: Cell) => void;
  onDeath?: (score: number, cause: DeathCause) => void;
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
  /** O petisco bom da vez — sempre existe exatamente um. */
  treat: GoodTreat = { x: 0, y: 0, kind: 'bone' };
  /** Chocolates e dinamites espalhados pelo tabuleiro. */
  hazards: Hazard[] = [];
  score = 0;
  /** Quantos chocolates o Osvaldo já comeu nesta partida. */
  chocolates = 0;
  phase: Phase = 'ready';
  /** Progresso (0..1) entre o passo anterior e o atual. */
  alpha = 0;
  /** Guardado para a animação de "morreu aqui". */
  deathCell: Cell | null = null;
  deathCause: DeathCause | null = null;

  private sickRemainingMs = 0;
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
    this.deathCause = null;
    this.chocolates = 0;
    this.sickRemainingMs = 0;
    this.hazards = [];
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
    return 1000 / this.currentStepMs;
  }

  /** Intensidade do mal-estar do chocolate: 1 logo após comer, 0 quando passou. */
  get sickness(): number {
    return this.sickRemainingMs / CONFIG.sickMs;
  }

  /** Passando mal, o Osvaldo anda mais devagar. */
  private get currentStepMs(): number {
    return this.sickRemainingMs > 0 ? this.stepMs * CONFIG.sickSlowFactor : this.stepMs;
  }

  get head(): Cell {
    return this.body[0];
  }

  /**
   * Para onde o Osvaldo vai depois de consumir a fila de curvas: a última
   * direção pedida, ou a atual se não há nenhuma pendente.
   */
  get heading(): Direction {
    return this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.direction;
  }

  /**
   * Registra uma direção desejada. Curvas de 180 graus são ignoradas —
   * o Osvaldo é comprido, não consegue se dobrar ao meio.
   */
  turn(next: Direction): void {
    const last = this.heading;
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
    const delta = Math.min(deltaMs, 120);
    this.accumulator += delta;
    this.sickRemainingMs = Math.max(0, this.sickRemainingMs - delta);

    while (this.accumulator >= this.currentStepMs) {
      this.accumulator -= this.currentStepMs;
      this.step();
      if (this.phase !== 'running') {
        this.alpha = 1;
        return;
      }
    }
    this.alpha = this.accumulator / this.currentStepMs;
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
      this.die({ x: head.x, y: head.y }, 'wall');
      return;
    }

    // A ponta do rabo sai do lugar neste mesmo passo, então só é obstáculo
    // quando o Osvaldo está crescendo.
    const ignoreTail = this.pendingGrowth === 0;
    const limit = ignoreTail ? this.body.length - 1 : this.body.length;
    for (let i = 0; i < limit; i++) {
      if (this.body[i].x === nx && this.body[i].y === ny) {
        this.die({ x: nx, y: ny }, 'tail');
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

    const hazardIndex = this.hazards.findIndex((h) => h.x === nx && h.y === ny);
    if (hazardIndex >= 0) {
      const [hazard] = this.hazards.splice(hazardIndex, 1);
      this.eatHazard(hazard);
    } else if (nx === this.treat.x && ny === this.treat.y) {
      this.eat();
    }
  }

  private eat(): void {
    const eaten = this.treat;
    const points = GOOD_TREATS[eaten.kind].points;
    this.score += points;
    this.pendingGrowth += CONFIG.growPerTreat;
    this.stepMs = Math.max(CONFIG.minStepMs, this.stepMs - CONFIG.speedUpPerTreat);
    this.placeTreat();
    this.placeHazards();
    this.events.onEat?.(this.score, eaten, points);
  }

  private eatHazard(hazard: Hazard): void {
    const at = { x: hazard.x, y: hazard.y };
    if (hazard.kind === 'bomb') {
      this.die(at, 'bomb');
      return;
    }
    this.chocolates += 1;
    if (this.chocolates >= CONFIG.chocolateLimit) {
      this.die(at, 'chocolate');
      return;
    }
    this.sickRemainingMs = CONFIG.sickMs;
    this.events.onSick?.(this.chocolates, at);
  }

  private die(at: Cell, cause: DeathCause): void {
    this.phase = 'over';
    this.deathCell = at;
    this.deathCause = cause;
    this.sickRemainingMs = 0;
    this.events.onDeath?.(this.score, cause);
  }

  /**
   * Células livres para um novo item. Percorre o tabuleiro em vez de sortear
   * "até dar certo", para não travar quando ele estiver quase cheio.
   */
  private freeCells(extraBlocked: (x: number, y: number) => boolean = () => false): number[] {
    const occupied = new Set(this.body.map((c) => c.y * this.cols + c.x));
    for (const h of this.hazards) occupied.add(h.y * this.cols + h.x);
    const free: number[] = [];
    for (let i = 0; i < this.cols * this.rows; i++) {
      if (!occupied.has(i) && !extraBlocked(i % this.cols, Math.floor(i / this.cols))) free.push(i);
    }
    return free;
  }

  /** Sorteia o próximo petisco bom (tipo ponderado pelo catálogo) em uma célula livre. */
  private placeTreat(): void {
    // Os perigos antigos saem junto com o petisco comido.
    this.hazards = [];
    const free = this.freeCells();
    if (free.length === 0) return; // tabuleiro lotado: vitória absoluta do jogador
    const pick = free[Math.floor(Math.random() * free.length)];
    this.treat = { x: pick % this.cols, y: Math.floor(pick / this.cols), kind: pickGoodKind() };
  }

  /**
   * Espalha chocolates (e, mais adiante, dinamites). Eles ficam no tabuleiro até
   * serem comidos ou até o próximo petisco bom ser comido. Nunca surgem colados
   * na cabeça, para o jogador sempre ter tempo de desviar.
   */
  private placeHazards(): void {
    if (this.score < CONFIG.hazardsFromScore) return;
    const slots = Math.min(
      CONFIG.maxHazards,
      1 + Math.floor((this.score - CONFIG.hazardsFromScore) / CONFIG.pointsPerHazardSlot),
    );
    const head = this.head;
    const nearHead = (x: number, y: number) => {
      // Distância considerando a travessia das bordas.
      const dx = Math.min(Math.abs(x - head.x), this.cols - Math.abs(x - head.x));
      const dy = Math.min(Math.abs(y - head.y), this.rows - Math.abs(y - head.y));
      return Math.max(dx, dy) <= CONFIG.hazardSafeRadius;
    };
    const isTreat = (x: number, y: number) => x === this.treat.x && y === this.treat.y;

    for (let i = 0; i < slots; i++) {
      if (Math.random() >= CONFIG.hazardChance) continue;
      const free = this.freeCells((x, y) => isTreat(x, y) || nearHead(x, y));
      if (free.length === 0) return;
      const pick = free[Math.floor(Math.random() * free.length)];
      const kind: HazardKind =
        this.score >= CONFIG.bombsFromScore && Math.random() < CONFIG.bombChance ? 'bomb' : 'chocolate';
      this.hazards.push({ x: pick % this.cols, y: Math.floor(pick / this.cols), kind });
    }
  }
}

function pickGoodKind(): GoodTreatKind {
  const entries = Object.entries(GOOD_TREATS) as Array<[GoodTreatKind, { weight: number }]>;
  const total = entries.reduce((sum, [, t]) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (const [kind, t] of entries) {
    roll -= t.weight;
    if (roll < 0) return kind;
  }
  return 'bone';
}

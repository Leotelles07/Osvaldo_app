/**
 * Parâmetros de balanceamento do jogo.
 * Tudo que define "como o jogo se sente" mora aqui, para ficar fácil de ajustar
 * sem mexer na lógica.
 */
export const CONFIG = {
  /**
   * O tabuleiro é montado com quantas colunas/linhas couberem no espaço
   * disponível, de modo a preencher tanto a tela alta do celular quanto a tela
   * larga do computador. O tamanho alvo da célula acompanha a menor dimensão
   * da tela (cerca de `cellsOnShortSide` células nela), com limites para o
   * Osvaldo nunca ficar minúsculo nem gigante.
   */
  cellsOnShortSide: 13,
  minCellPx: 26,
  maxCellPx: 46,
  minCols: 11,
  maxCols: 22,
  minRows: 11,
  maxRows: 24,

  /** Tabuleiro usado antes do primeiro cálculo de layout. */
  defaultCols: 15,
  defaultRows: 19,

  /** Quantos segmentos o Osvaldo tem no começo (cabeça + corpo + rabo). */
  startLength: 5,

  /** Quantos segmentos ele cresce por petisco. */
  growPerTreat: 1,

  /** Tempo (ms) entre dois passos no início da partida. Maior = mais devagar. */
  startStepMs: 210,

  /** Piso de velocidade: nunca fica mais rápido que isso. */
  minStepMs: 78,

  /** Quanto o intervalo entre passos diminui a cada petisco comido. */
  speedUpPerTreat: 5,

  /**
   * Paredes atravessáveis: ao sair por uma borda, o Osvaldo reaparece na outra.
   * A única forma de perder é morder o próprio rabo (regra do enunciado).
   * Troque para false se quiser que bater na cerca também encerre a partida.
   */
  wrapWalls: true,

  /** Distância mínima (px) entre o dedo e a cabeça para registrar uma direção. */
  touchDeadZone: 22,

  /** Quantas direções ficam na fila de input (evita perder curvas rápidas). */
  maxQueuedDirections: 2,

  /** A partir de quantos pontos começam a aparecer chocolates. */
  hazardsFromScore: 3,
  /** A partir de quantos pontos as bombas também podem aparecer. */
  bombsFromScore: 8,
  /** Chance de cada vaga de perigo ser preenchida ao surgir um novo petisco bom. */
  hazardChance: 0.6,
  /** Chance de uma vaga de perigo virar bomba (quando bombas já estão liberadas). */
  bombChance: 0.35,
  /** Quantos perigos no máximo ficam no tabuleiro ao mesmo tempo. */
  maxHazards: 3,
  /** A cada quantos pontos abre mais uma vaga de perigo. */
  pointsPerHazardSlot: 10,
  /** Perigos nunca surgem a esta distância (em células) da cabeça: sem armadilhas injustas. */
  hazardSafeRadius: 2,

  /** No chocolate de número `chocolateLimit` o Osvaldo não aguenta e a partida acaba. */
  chocolateLimit: 3,
  /** Quanto tempo (ms de jogo) dura o mal-estar depois de um chocolate. */
  sickMs: 4000,
  /** Enquanto passa mal, o intervalo entre passos é multiplicado por isso (mais lento). */
  sickSlowFactor: 1.4,
} as const;

/** Petiscos bons: o Osvaldo come, ganha pontos e cresce. */
export type GoodTreatKind = 'bone' | 'beef' | 'strawberry' | 'banana' | 'avocado' | 'watermelon';
/** Petiscos perigosos: chocolate faz mal, dinamite encerra a partida na hora. */
export type HazardKind = 'chocolate' | 'bomb';
export type TreatKind = GoodTreatKind | HazardKind;

/**
 * Catálogo dos petiscos bons. `weight` é a chance relativa de sorteio: quanto
 * mais pontos o petisco vale, mais raro ele é.
 */
export const GOOD_TREATS: Record<GoodTreatKind, { points: number; weight: number }> = {
  bone: { points: 1, weight: 30 },
  strawberry: { points: 1, weight: 16 },
  banana: { points: 1, weight: 16 },
  avocado: { points: 1, weight: 14 },
  beef: { points: 2, weight: 14 },
  watermelon: { points: 3, weight: 8 },
};

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  x: number;
  y: number;
}

export const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

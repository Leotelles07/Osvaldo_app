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
} as const;

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

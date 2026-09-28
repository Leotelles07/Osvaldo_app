/**
 * Osvaldo Game — ponto de entrada.
 * Junta telas, contagem regressiva, loop de animação, HUD e controles.
 */
import './styles.css';
import { Game } from './game/core';
import { Renderer } from './game/renderer';
import { attachInput } from './game/input';
import { audio } from './game/audio';
import { startMascot } from './ui/mascot';
import type { Direction } from './game/config';
import { FUR_PALETTES, DEFAULT_FUR_COLOR, type FurColorId } from './game/draw';

/* ------------------------------------------------------------- elementos -- */

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
};

const screenStart = $('screen-start');
const screenColor = $('screen-color');
const screenGame = $('screen-game');
const nameInput = $<HTMLInputElement>('player-name');
const startForm = $<HTMLFormElement>('start-form');
const colorOptions = $('color-options');
const btnConfirmColor = $<HTMLButtonElement>('btn-confirm-color');
const stage = $('stage');
const board = $<HTMLCanvasElement>('board');
const hudPlayer = $('hud-player');
const hudScore = $('hud-score');
const overlayCountdown = $('overlay-countdown');
const countdownText = $('countdown-text');
const overlayPause = $('overlay-pause');
const overlayGameOver = $('overlay-gameover');
const gameOverScore = $('gameover-score');
const gameOverBadge = $('gameover-badge');
const gameOverText = $('gameover-text');
const btnPause = $<HTMLButtonElement>('btn-pause');
const btnResume = $<HTMLButtonElement>('btn-resume');
const btnQuit = $<HTMLButtonElement>('btn-quit');
const btnAgain = $<HTMLButtonElement>('btn-again');
const btnChange = $<HTMLButtonElement>('btn-change');
const btnSound = $<HTMLButtonElement>('btn-sound');
const soundIcon = $('sound-icon');

/* ----------------------------------------------------------------- estado -- */

type AppScreen = 'start' | 'color' | 'game';

const NAME_KEY = 'osvaldo:player';
const MAX_NAME = 14;

let playerName = '';
/** Recorde do jogador nesta sessão (zera ao trocar de jogador). */
let sessionRecord = 0;
let paused = false;
let countdownTimer: number | null = null;
let lastEatAt = -Infinity;
let stopMascot: (() => void) | null = null;
let stopColorMascot: (() => void) | null = null;
/**
 * Cor escolhida pelo jogador para a partida. Vive só em memória (não é
 * persistida): atualizar a página sempre volta para a escolha padrão, mas
 * "jogar de novo" na mesma sessão mantém a cor já confirmada.
 */
let selectedColorId: FurColorId = DEFAULT_FUR_COLOR;

const renderer = new Renderer(board);
const game = new Game({
  onEat: (score) => {
    lastEatAt = performance.now();
    audio.play('eat');
    vibrate(12);
    updateScore(score, true);
  },
  onDeath: (score) => {
    audio.play('death');
    vibrate([24, 60, 90]);
    window.setTimeout(() => showGameOver(score), 550);
  },
});

/* --------------------------------------------------------------- helpers -- */

const pad = (value: number, size = 4): string => String(Math.max(0, value)).padStart(size, '0');

function vibrate(pattern: number | number[]): void {
  if (audio.muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* navegador sem suporte: tudo bem */
  }
}

function updateScore(score: number, bump = false): void {
  hudScore.textContent = pad(score);
  hudScore.classList.remove('is-compact');
  if (!bump) return;
  hudScore.classList.remove('is-bump');
  void hudScore.offsetWidth; // reinicia a animação
  hudScore.classList.add('is-bump');
}

function showScreen(screen: AppScreen): void {
  screenStart.classList.toggle('is-active', screen === 'start');
  screenColor.classList.toggle('is-active', screen === 'color');
  screenGame.classList.toggle('is-active', screen === 'game');

  if (screen === 'start') {
    stopMascot ??= startMascot($<HTMLCanvasElement>('mascot'));
  } else {
    stopMascot?.();
    stopMascot = null;
  }

  if (screen === 'color') {
    stopColorMascot ??= startMascot(
      $<HTMLCanvasElement>('mascot-color'),
      () => FUR_PALETTES[selectedColorId],
    );
  } else {
    stopColorMascot?.();
    stopColorMascot = null;
  }
}

function hideOverlays(): void {
  overlayCountdown.hidden = true;
  overlayPause.hidden = true;
  overlayGameOver.hidden = true;
}

function fitBoard(): void {
  const rect = stage.getBoundingClientRect();
  const width = Math.max(120, (rect.width || window.innerWidth) - 4);
  const height = Math.max(120, (rect.height || window.innerHeight * 0.7) - 4);
  // O formato do tabuleiro acompanha o formato da tela, mas só muda entre
  // partidas — nunca com o Osvaldo correndo.
  const { cols, rows } = Renderer.pickGrid(width, height);
  game.setGrid(cols, rows);
  renderer.resize(width, height, game.cols, game.rows);
}

/* ----------------------------------------------------- fluxo de partida -- */

function beginRound(): void {
  hideOverlays();
  paused = false;
  lastEatAt = -Infinity;
  game.reset();
  updateScore(0);
  fitBoard();
  runCountdown();
}

function runCountdown(): void {
  const steps = ['3', '2', '1', 'Go!!'];
  let index = 0;
  overlayCountdown.hidden = false;

  const tick = () => {
    if (index >= steps.length) {
      overlayCountdown.hidden = true;
      countdownTimer = null;
      game.start();
      return;
    }
    const label = steps[index];
    countdownText.textContent = label;
    countdownText.classList.toggle('is-go', label === 'Go!!');
    // Reinicia a animação de "pop" a cada número.
    countdownText.style.animation = 'none';
    void countdownText.offsetWidth;
    countdownText.style.animation = '';
    audio.play(label === 'Go!!' ? 'go' : 'tick');
    index++;
    countdownTimer = window.setTimeout(tick, label === 'Go!!' ? 450 : 750);
  };

  tick();
}

function cancelCountdown(): void {
  if (countdownTimer !== null) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
  }
  overlayCountdown.hidden = true;
}

function showGameOver(score: number): void {
  const isRecord = score > sessionRecord;
  if (isRecord) sessionRecord = score;

  const line = `${pad(score)}/${pad(sessionRecord)}`;
  gameOverScore.textContent = line;
  hudScore.textContent = line; // formato pedido: pontos/recorde da sessão
  hudScore.classList.add('is-compact');
  gameOverBadge.hidden = !isRecord || score === 0;
  gameOverText.textContent =
    score === 0
      ? 'O Osvaldo se enrolou logo de cara. Bora de novo!'
      : `O Osvaldo mordeu o próprio rabo depois de ${score} ${score === 1 ? 'petisco' : 'petiscos'}.`;
  if (isRecord && score > 0) audio.play('record');
  overlayGameOver.hidden = false;
}

function togglePause(force?: boolean): void {
  if (game.phase !== 'running') return;
  const next = force ?? !paused;
  if (next === paused) return;
  paused = next;
  overlayPause.hidden = !paused;
}

function quitToStart(): void {
  cancelCountdown();
  hideOverlays();
  paused = false;
  game.phase = 'over';
  showScreen('start');
  nameInput.focus();
}

/* ------------------------------------------------------- loop principal -- */

let lastFrame = performance.now();

function frame(now: number): void {
  const delta = now - lastFrame;
  lastFrame = now;

  if (screenGame.classList.contains('is-active')) {
    if (!paused) game.update(delta);
    const chomp = Math.max(0, 1 - (now - lastEatAt) / 320);
    renderer.render(game, now, chomp);
  }

  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- eventos -- */

startForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = nameInput.value.trim().slice(0, MAX_NAME);
  if (!value) {
    nameInput.classList.add('is-invalid');
    nameInput.focus();
    window.setTimeout(() => nameInput.classList.remove('is-invalid'), 400);
    return;
  }

  audio.unlock(); // gesto do usuário: hora de liberar o áudio

  if (value !== playerName) sessionRecord = 0; // recorde é por jogador/sessão
  playerName = value;
  hudPlayer.textContent = playerName;
  try {
    localStorage.setItem(NAME_KEY, playerName);
  } catch {
    /* segue sem persistir */
  }

  nameInput.blur(); // fecha o teclado do celular antes de começar
  showScreen('color');
});

colorOptions.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.color-swatch');
  if (!button) return;
  const colorId = button.dataset.color as FurColorId | undefined;
  if (!colorId || !(colorId in FUR_PALETTES)) return;

  selectedColorId = colorId;
  for (const swatch of colorOptions.querySelectorAll<HTMLButtonElement>('.color-swatch')) {
    const isSelected = swatch === button;
    swatch.classList.toggle('is-selected', isSelected);
    swatch.setAttribute('aria-checked', String(isSelected));
  }
});

btnConfirmColor.addEventListener('click', () => {
  renderer.setFurColor(selectedColorId);
  showScreen('game');
  beginRound();
});

btnAgain.addEventListener('click', () => {
  audio.unlock();
  beginRound();
});

btnChange.addEventListener('click', () => {
  nameInput.value = playerName;
  quitToStart();
});

btnPause.addEventListener('click', () => togglePause());
btnResume.addEventListener('click', () => togglePause(false));
btnQuit.addEventListener('click', quitToStart);

btnSound.addEventListener('click', () => {
  audio.unlock();
  const muted = audio.toggleMute();
  soundIcon.textContent = muted ? '🔇' : '🔊';
  btnSound.setAttribute('aria-pressed', String(muted));
});

attachInput(board, {
  onDirection: (dir: Direction) => game.turn(dir),
  onPauseToggle: () => {
    if (screenGame.classList.contains('is-active')) togglePause();
  },
  headPixel: () => renderer.headPixel(game),
  isPlaying: () => game.phase === 'running' && !paused,
});

// Perdeu o foco (trocou de aba, atendeu o telefone): pausa sozinho.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) togglePause(true);
});
window.addEventListener('blur', () => togglePause(true));

const onResize = () => fitBoard();
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => window.setTimeout(onResize, 120));
if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(stage);

/* ----------------------------------------------------------------- boot -- */

try {
  const saved = localStorage.getItem(NAME_KEY);
  if (saved) nameInput.value = saved;
} catch {
  /* sem localStorage disponível */
}

if (import.meta.env.DEV) {
  // Gancho de depuração (apenas no servidor de desenvolvimento): permite
  // inspecionar e pilotar o jogo pelo console ou por testes automatizados.
  (window as unknown as Record<string, unknown>).__osvaldo = { game, renderer };
}

// A dica do rodapé acompanha o aparelho: dedo no celular, teclado no desktop.
const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
$('controls-hint').textContent = coarsePointer
  ? 'Deslize o dedo para guiar o Osvaldo'
  : 'Use as setas ou W A S D';

soundIcon.textContent = audio.muted ? '🔇' : '🔊';
showScreen('start');
fitBoard();
requestAnimationFrame((t) => {
  lastFrame = t;
  frame(t);
});

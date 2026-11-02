/**
 * Osvaldo Games — ponto de entrada.
 * Junta telas, contagem regressiva, loop de animação, HUD e controles.
 */
import './styles/tokens.css';
import './styles.css';
import { applyColorway, getColorway, pickColorway, DEFAULT_COLORWAY } from './brand/colorways';
import { Game, type DeathCause } from './game/core';
import { Renderer } from './game/renderer';
import { attachInput, attachDpad } from './game/input';
import { audio } from './game/audio';
import { startMascot } from './ui/mascot';
import { startFurHeads } from './ui/furHeads';
import { CONFIG, OPPOSITE, type Direction } from './game/config';
import { FUR_PALETTES, DEFAULT_FUR_COLOR, type FurColorId } from './game/draw';
import { isAuthConfigured, signIn, signOut, signUp, watchAccount, type Account } from './auth/firebase';
import {
  describeAuthError,
  errorCode,
  hasErrors,
  type FieldErrors,
  validateSignIn,
  validateSignUp,
} from './auth/validation';
import { bindAuthForm, type AuthForm } from './ui/authForm';
import { bindRanking } from './ui/ranking';
import * as cloud from './data/cloud';
import { buildMatch, newProfile, type UserProfile } from './data/schema';

/* ------------------------------------------------------------- elementos -- */

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
};

const screenSignup = $('screen-signup');
const screenLogin = $('screen-login');
const screenColor = $('screen-color');
const screenGame = $('screen-game');
const screenRanking = $('screen-ranking');
const signupFormEl = $<HTMLFormElement>('signup-form');
const loginFormEl = $<HTMLFormElement>('login-form');
const btnGoLogin = $<HTMLButtonElement>('btn-go-login');
const btnGoSignup = $<HTMLButtonElement>('btn-go-signup');
const colorPlayerName = $('color-player-name');
const btnLogoutColor = $<HTMLButtonElement>('btn-logout-color');
const colorOptions = $('color-options');
const btnConfirmColor = $<HTMLButtonElement>('btn-confirm-color');
const btnRankingColor = $<HTMLButtonElement>('btn-ranking-color');
const btnRankingGameOver = $<HTMLButtonElement>('btn-ranking-gameover');
const btnRankingBack = $<HTMLButtonElement>('btn-ranking-back');
const stage = $('stage');
const board = $<HTMLCanvasElement>('board');
const hudPlayer = $('hud-player');
const hudScore = $('hud-score');
const hudChoco = $('hud-choco');
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
const btnLogout = $<HTMLButtonElement>('btn-logout');
const btnSound = $<HTMLButtonElement>('btn-sound');
const soundIcon = $('sound-icon');
const dpad = $('dpad');
const dpadButtons = [...dpad.querySelectorAll<HTMLButtonElement>('[data-dir]')];

/* ----------------------------------------------------------------- estado -- */

/** 'boot': nenhuma tela ainda, enquanto o Firebase diz se há alguém logado. */
type AppScreen = 'boot' | 'signup' | 'login' | 'color' | 'game' | 'ranking';

const signupForm = bindAuthForm(signupFormEl, 'Cadastrando…');
const loginForm = bindAuthForm(loginFormEl, 'Entrando…');
const rankingView = bindRanking($<HTMLOListElement>('ranking-list'), $('ranking-status'));

/** Conta logada; o nome dela é o nome do jogador no HUD. */
let account: Account | null = null;
/**
 * Maior recorde conhecido da conta: o do banco (perfil) ou o desta sessão,
 * se o banco ainda não respondeu. Zera ao trocar de conta.
 */
let sessionRecord = 0;
/** O perfil do banco já foi aplicado às telas nesta entrada? (cor e som) */
let profileApplied = false;
/** O jogador mexeu na cor antes de o perfil chegar? Então a escolha dele vale. */
let colorTouched = false;
/** Para onde o "Voltar" do ranking leva. */
let rankingReturn: 'color' | 'game' = 'color';
/** Pedido de ranking em andamento: respostas de pedidos antigos são ignoradas. */
let rankingRequest = 0;
let paused = false;
let countdownTimer: number | null = null;
let lastEatAt = -Infinity;
let deathAt: number | null = null;
/** Tremida da tela: quando começou, quanto dura e com que força (px). */
let shakeStart = -Infinity;
let shakeDuration = 0;
let shakePower = 0;
let stopColorMascot: (() => void) | null = null;
let stopFurHeads: (() => void) | null = null;
/**
 * Cor escolhida pelo jogador para a partida. Ao entrar, vem do perfil no
 * banco (a última cor confirmada, em qualquer aparelho); sem banco, começa
 * na padrão.
 */
let selectedColorId: FurColorId = DEFAULT_FUR_COLOR;

const renderer = new Renderer(board);
const game = new Game({
  onEat: (score, treat, points) => {
    const now = performance.now();
    lastEatAt = now;
    audio.play(points > 1 ? 'bigEat' : 'eat');
    vibrate(12);
    updateScore(score, true);
    renderer.addPopup(treat, `+${points}`, '#ffe28a', now);
  },
  onSick: (count, at) => {
    const now = performance.now();
    lastEatAt = now;
    audio.play('sick');
    vibrate([40, 40, 40, 40, 40]);
    startShake(7, 700);
    updateChocolates(count);
    renderer.addPopup(at, 'Eca!', '#b6f07a', now);
  },
  onDeath: (score, cause) => {
    deathAt = performance.now();
    if (cause === 'bomb') {
      audio.play('boom');
      vibrate([120, 40, 200]);
      startShake(12, 800);
    } else {
      audio.play('death');
      vibrate([24, 60, 90]);
    }
    if (cause === 'chocolate') {
      updateChocolates(game.chocolates);
      startShake(7, 600);
    }
    // O recorde de antes é guardado aqui: salvar a partida já atualiza o perfil.
    const previousRecord = knownRecord();
    saveFinishedMatch(cause);
    const delay = cause === 'bomb' ? 1150 : cause === 'chocolate' ? 800 : 550;
    window.setTimeout(() => showGameOver(score, cause, previousRecord), delay);
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

/** Quantos chocolates o Osvaldo já comeu; some quando ele está limpo. */
function updateChocolates(count: number): void {
  hudChoco.hidden = count === 0;
  hudChoco.textContent = `🍫 ${count}/${CONFIG.chocolateLimit}`;
  hudChoco.setAttribute('aria-label', `Chocolates comidos: ${count} de ${CONFIG.chocolateLimit}`);
}

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function startShake(power: number, duration: number): void {
  shakeStart = performance.now();
  shakeDuration = duration;
  shakePower = power;
}

/**
 * Treme o tabuleiro: um tranco forte ao comer chocolate/explodir e uma
 * tremedeira leve enquanto o Osvaldo ainda está enjoado.
 */
function applyShake(now: number): void {
  let amp = 0;
  const k = (now - shakeStart) / shakeDuration;
  if (k >= 0 && k < 1) amp = shakePower * (1 - k);
  if (game.phase === 'running' && !paused) amp = Math.max(amp, game.sickness * 2.5);
  if (reducedMotion) amp = 0;

  if (amp < 0.1) {
    if (board.style.transform) board.style.transform = '';
    return;
  }
  const x = Math.sin(now / 23) * amp;
  const y = Math.cos(now / 31) * amp * 0.6;
  const rot = Math.sin(now / 47) * amp * 0.12;
  board.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
}

function showScreen(screen: AppScreen): void {
  screenSignup.classList.toggle('is-active', screen === 'signup');
  screenLogin.classList.toggle('is-active', screen === 'login');
  screenColor.classList.toggle('is-active', screen === 'color');
  screenGame.classList.toggle('is-active', screen === 'game');
  screenRanking.classList.toggle('is-active', screen === 'ranking');

  if (screen === 'color') {
    stopColorMascot ??= startMascot(
      $<HTMLCanvasElement>('mascot-color'),
      () => FUR_PALETTES[selectedColorId],
    );
    stopFurHeads ??= startFurHeads(colorOptions, () => selectedColorId);
  } else {
    stopColorMascot?.();
    stopColorMascot = null;
    stopFurHeads?.();
    stopFurHeads = null;
  }
}

/** Estado das setas da última atualização: só mexe no DOM quando muda. */
let dpadState = '';

/**
 * Setas acompanham o Osvaldo: a direção atual fica em destaque e a meia-volta
 * aparece apagada, já que o jogo a ignora.
 */
function updateDpad(): void {
  const playing = game.phase === 'running' && !paused;
  const heading = game.heading;
  const state = `${heading}:${playing}`;
  if (state === dpadState) return;
  dpadState = state;
  dpad.classList.toggle('is-idle', !playing);
  for (const button of dpadButtons) {
    const dir = button.dataset.dir as Direction;
    button.classList.toggle('is-current', dir === heading);
    button.setAttribute('aria-disabled', String(dir === OPPOSITE[heading]));
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
  // Cada partida veste uma das sete combinações da marca.
  applyColorway(pickColorway());
  hideOverlays();
  paused = false;
  lastEatAt = -Infinity;
  deathAt = null;
  shakeStart = -Infinity;
  game.reset();
  renderer.clearPopups();
  updateScore(0);
  updateChocolates(0);
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

function gameOverMessage(score: number, cause: DeathCause): string {
  const pts = `${score} ${score === 1 ? 'ponto' : 'pontos'}`;
  switch (cause) {
    case 'bomb':
      return `Bum! O Osvaldo mordeu uma dinamite com ${pts}. Fique longe das bombas!`;
    case 'chocolate':
      return `O Osvaldo comeu ${CONFIG.chocolateLimit} chocolates e passou muito mal. Chocolate faz mal para cachorro!`;
    case 'wall':
      return `O Osvaldo bateu na cerca com ${pts}.`;
    case 'tail':
      return score === 0
        ? 'O Osvaldo se enrolou logo de cara. Bora de novo!'
        : `O Osvaldo mordeu o próprio rabo com ${pts}.`;
  }
}

function showGameOver(score: number, cause: DeathCause, previousRecord: number): void {
  const isRecord = score > previousRecord;
  sessionRecord = Math.max(previousRecord, score, sessionRecord);

  const line = `${pad(score)}/${pad(sessionRecord)}`;
  gameOverScore.textContent = line;
  hudScore.textContent = line; // formato pedido: pontos/recorde da sessão
  hudScore.classList.add('is-compact');
  gameOverBadge.hidden = !isRecord || score === 0;
  gameOverText.textContent = gameOverMessage(score, cause);
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

function stopRound(): void {
  cancelCountdown();
  hideOverlays();
  paused = false;
  game.phase = 'over';
}

/* ------------------------------------------------------------- banco -- */

function knownRecord(): number {
  return Math.max(sessionRecord, cloud.currentProfile()?.bestScore ?? 0);
}

/** Salva a partida que acabou de terminar (morte, não desistência). */
function saveFinishedMatch(cause: DeathCause): void {
  cloud.saveMatch(
    buildMatch({
      cause,
      durationMs: game.elapsedMs,
      treats: game.treatsEaten,
      chocolates: game.chocolates,
      length: game.body.length,
      furColor: selectedColorId,
      colorway: getColorway().name,
      input: coarsePointer ? 'touch' : 'keyboard',
      appVersion: __APP_VERSION__,
    }),
  );
}

function selectColor(colorId: FurColorId): void {
  selectedColorId = colorId;
  for (const swatch of colorOptions.querySelectorAll<HTMLButtonElement>('.color-swatch')) {
    const isSelected = swatch.dataset.color === colorId;
    swatch.classList.toggle('is-selected', isSelected);
    swatch.setAttribute('aria-checked', String(isSelected));
  }
}

function setSoundIcon(): void {
  soundIcon.textContent = audio.muted ? '🔇' : '🔊';
  btnSound.setAttribute('aria-pressed', String(audio.muted));
}

/**
 * Chegou uma versão do perfil. Na primeira, a cor e o som da conta passam a
 * valer neste aparelho; nas seguintes, só o recorde é atualizado.
 */
function applyProfile(profile: UserProfile): void {
  sessionRecord = Math.max(sessionRecord, profile.bestScore);
  if (profileApplied) return;
  profileApplied = true;
  if (!colorTouched && game.phase !== 'running') selectColor(profile.furColor);
  audio.setMuted(profile.soundMuted);
  setSoundIcon();
}

async function openRanking(from: 'color' | 'game'): Promise<void> {
  rankingReturn = from;
  showScreen('ranking');
  rankingView.showLoading();
  const request = ++rankingRequest;
  try {
    const ranking = await cloud.loadRanking();
    if (request !== rankingRequest || !account) return;
    const profile = cloud.currentProfile();
    const me = profile
      ? { uid: account.uid, name: profile.name, furColor: profile.furColor, bestScore: profile.bestScore }
      : null;
    rankingView.show(ranking, me);
  } catch (error) {
    console.warn('[Osvaldo] ranking:', error);
    if (request === rankingRequest) rankingView.showError();
  }
}

/* --------------------------------------------------------------- acesso -- */

/** Entrou (cadastro, login ou sessão salva): segue direto para a cor. */
function enterAs(next: Account): void {
  if (account?.uid !== next.uid) {
    sessionRecord = 0; // recorde é por conta
    profileApplied = false;
    colorTouched = false;
    cloud.connect(next, () => newProfile(next.name, selectedColorId, audio.muted), applyProfile);
  }
  account = next;
  hudPlayer.textContent = next.name;
  colorPlayerName.textContent = next.name;
  signupForm.clear();
  loginForm.clear();
  showScreen('color');
}

function showAuth(screen: 'signup' | 'login'): void {
  showScreen(screen);
  (screen === 'signup' ? signupForm : loginForm).focusFirst();
}

async function logout(): Promise<void> {
  stopRound();
  cloud.disconnect();
  account = null; // antes do signOut, para o watchAccount não navegar de novo
  showAuth('login');
  try {
    await signOut();
  } catch {
    /* a tela já voltou para Entrar; no pior caso a sessão reaparece ao reabrir */
  }
}

async function submitAuth(
  form: AuthForm,
  errors: FieldErrors,
  request: () => Promise<Account>,
): Promise<void> {
  form.showMessage('');
  form.showErrors(errors);
  if (hasErrors(errors)) return;

  audio.unlock(); // gesto do usuário: hora de liberar o áudio
  (document.activeElement as HTMLElement | null)?.blur(); // fecha o teclado do celular
  form.setBusy(true);
  try {
    enterAs(await request());
  } catch (error) {
    const failure = describeAuthError(errorCode(error));
    if (failure.field) form.showErrors({ [failure.field]: failure.message });
    else form.showMessage(failure.message);
  } finally {
    form.setBusy(false);
  }
}

/* ------------------------------------------------------- loop principal -- */

let lastFrame = performance.now();

function frame(now: number): void {
  const delta = now - lastFrame;
  lastFrame = now;

  if (screenGame.classList.contains('is-active')) {
    if (!paused) game.update(delta);
    const chomp = Math.max(0, 1 - (now - lastEatAt) / 320);
    renderer.render(game, now, { chomp, deathAt });
    applyShake(now);
    updateDpad();
  }

  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- eventos -- */

signupFormEl.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = signupForm.values();
  void submitAuth(signupForm, validateSignUp(values), () => signUp(values));
});

loginFormEl.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = loginForm.values();
  void submitAuth(loginForm, validateSignIn(values), () => signIn(values));
});

btnGoLogin.addEventListener('click', () => showAuth('login'));
btnGoSignup.addEventListener('click', () => showAuth('signup'));
btnLogoutColor.addEventListener('click', () => void logout());

colorOptions.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.color-swatch');
  if (!button) return;
  const colorId = button.dataset.color as FurColorId | undefined;
  if (!colorId || !(colorId in FUR_PALETTES)) return;

  colorTouched = true;
  selectColor(colorId);
});

btnConfirmColor.addEventListener('click', () => {
  renderer.setFurColor(selectedColorId);
  cloud.savePrefs({ furColor: selectedColorId });
  showScreen('game');
  beginRound();
});

btnAgain.addEventListener('click', () => {
  audio.unlock();
  beginRound();
});

btnLogout.addEventListener('click', () => void logout());

btnRankingColor.addEventListener('click', () => void openRanking('color'));
btnRankingGameOver.addEventListener('click', () => void openRanking('game'));
btnRankingBack.addEventListener('click', () => {
  rankingRequest++; // descarta um carregamento que ainda esteja a caminho
  showScreen(rankingReturn);
});

btnPause.addEventListener('click', () => togglePause());
btnResume.addEventListener('click', () => togglePause(false));
btnQuit.addEventListener('click', () => {
  stopRound();
  showScreen('color');
});

btnSound.addEventListener('click', () => {
  audio.unlock();
  const muted = audio.toggleMute();
  setSoundIcon();
  cloud.savePrefs({ soundMuted: muted });
});

attachInput(board, {
  onDirection: (dir: Direction) => game.turn(dir),
  onPauseToggle: () => {
    if (screenGame.classList.contains('is-active')) togglePause();
  },
  headPixel: () => renderer.headPixel(game),
  isPlaying: () => game.phase === 'running' && !paused,
});

attachDpad(dpad, {
  onDirection: (dir: Direction) => {
    game.turn(dir);
    updateDpad(); // destaque imediato, sem esperar o próximo quadro
  },
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

if (import.meta.env.DEV) {
  // Gancho de depuração (apenas no servidor de desenvolvimento): permite
  // inspecionar e pilotar o jogo pelo console ou por testes automatizados.
  (window as unknown as Record<string, unknown>).__osvaldo = { game, renderer };
}

// A dica do rodapé acompanha o aparelho: dedo no celular, teclado no desktop.
const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
$('controls-hint').textContent = coarsePointer
  ? 'Toque nas setas ou deslize o dedo'
  : 'Use as setas ou W A S D';

// Cor inicial da marca; cada partida sorteia a sua a partir daqui.
applyColorway(DEFAULT_COLORWAY);

setSoundIcon();

if (!isAuthConfigured) {
  for (const form of [signupForm, loginForm]) {
    form.showMessage(describeAuthError('auth/not-configured').message);
  }
}

// Sessão salva entra direto; sem sessão, a primeira tela é o cadastro.
showScreen('boot');
let booted = false;
watchAccount((current) => {
  if (!booted) {
    booted = true;
    if (current) enterAs(current);
    else showAuth('signup');
    return;
  }
  // Depois da abertura, cadastro e login navegam sozinhos (ver submitAuth).
  // Aqui só interessa a sessão que caiu por fora (expirou, saiu em outra aba).
  if (!current && account) {
    stopRound();
    cloud.disconnect();
    account = null;
    showAuth('login');
  }
});
fitBoard();
requestAnimationFrame((t) => {
  lastFrame = t;
  frame(t);
});

/**
 * Controles. Três linguagens, mesmo resultado:
 *
 * - Teclado (web): setas ou W A S D, espaço/Esc para pausar.
 * - Setas na tela (mobile): tocou, virou — veja `attachDpad`.
 * - Toque (mobile): o dedo funciona como guia. A direção é sempre a do dedo em
 *   relação à cabeça do Osvaldo, então dá para "puxar" o cachorro até o petisco
 *   arrastando o dedo, e um deslize rápido também funciona.
 */
import { CONFIG, type Direction } from './config';

export interface InputHandlers {
  onDirection: (dir: Direction) => void;
  onPauseToggle: () => void;
  /** Posição atual da cabeça, em pixels CSS relativos ao canvas. */
  headPixel: () => { x: number; y: number };
  /** Só reage a comandos quando a partida está rolando. */
  isPlaying: () => boolean;
}

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  W: 'up',
  A: 'left',
  S: 'down',
  D: 'right',
};

/** O foco está num campo de texto? */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true;
}

function axisDirection(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export function attachInput(canvas: HTMLCanvasElement, handlers: InputHandlers): () => void {
  let steering = false;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  const onKeyDown = (event: KeyboardEvent) => {
    // Enquanto o jogador digita o nome, o teclado é dele: sem isso, "W", "A",
    // "S", "D" e o espaço seriam engolidos pelos controles.
    if (isTyping(event.target)) return;

    if (event.key === ' ' || event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      handlers.onPauseToggle();
      return;
    }
    const dir = KEY_MAP[event.key];
    if (!dir) return;
    event.preventDefault(); // trava o scroll da página com as setas
    if (handlers.isPlaying()) handlers.onDirection(dir);
  };

  const localPoint = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const steer = (event: PointerEvent) => {
    if (!handlers.isPlaying()) return;
    const p = localPoint(event);
    const head = handlers.headPixel();

    // 1) direção do dedo em relação à cabeça (guiar)
    const dx = p.x - head.x;
    const dy = p.y - head.y;
    if (Math.hypot(dx, dy) >= CONFIG.touchDeadZone) {
      handlers.onDirection(axisDirection(dx, dy));
      return;
    }
    // 2) fallback: direção do próprio arrasto (deslizar)
    const sx = p.x - startX;
    const sy = p.y - startY;
    if (Math.hypot(sx, sy) >= CONFIG.touchDeadZone) {
      handlers.onDirection(axisDirection(sx, sy));
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    steering = true;
    const p = localPoint(event);
    startX = p.x;
    startY = p.y;
    canvas.setPointerCapture?.(event.pointerId);
    steer(event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!steering || event.pointerId !== pointerId) return;
    event.preventDefault();
    steer(event);
  };

  const endPointer = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    steering = false;
    pointerId = null;
  };

  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  // Impede o menu de contexto do "toque longo" no mobile.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', endPointer);
    canvas.removeEventListener('pointercancel', endPointer);
  };
}

/**
 * Setas na tela (mobile). A curva sai no `pointerdown`, no instante do toque,
 * sem esperar o dedo subir como no `click` — é isso que deixa a resposta rápida.
 */
export function attachDpad(
  dpad: HTMLElement,
  handlers: Pick<InputHandlers, 'onDirection' | 'isPlaying'>,
): () => void {
  const buttonOf = (event: Event) =>
    (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-dir]') ?? null;

  const press = (button: HTMLButtonElement) => {
    if (!handlers.isPlaying()) return;
    handlers.onDirection(button.dataset.dir as Direction);
  };

  const onPointerDown = (event: PointerEvent) => {
    const button = buttonOf(event);
    if (!button) return;
    event.preventDefault(); // sem foco, seleção de texto nem clique fantasma
    button.classList.add('is-pressed');
    press(button);
  };

  const release = (event: PointerEvent) => {
    buttonOf(event)?.classList.remove('is-pressed');
  };

  // Ativação por teclado/leitor de tela (detail === 0); toques já foram tratados.
  const onClick = (event: MouseEvent) => {
    const button = buttonOf(event);
    if (button && event.detail === 0) press(button);
  };

  dpad.addEventListener('pointerdown', onPointerDown);
  dpad.addEventListener('pointerup', release);
  dpad.addEventListener('pointercancel', release);
  dpad.addEventListener('pointerout', release);
  dpad.addEventListener('click', onClick);
  dpad.addEventListener('contextmenu', (e) => e.preventDefault());

  return () => {
    dpad.removeEventListener('pointerdown', onPointerDown);
    dpad.removeEventListener('pointerup', release);
    dpad.removeEventListener('pointercancel', release);
    dpad.removeEventListener('pointerout', release);
    dpad.removeEventListener('click', onClick);
  };
}

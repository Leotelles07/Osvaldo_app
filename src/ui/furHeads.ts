/**
 * Cabecinhas do Osvaldo, de frente, usadas como opções na tela de escolha de
 * cor. Usam as mesmas paletas do jogo, então a cabecinha sempre mostra
 * exatamente a pelagem que o jogador vai ver na partida.
 */
import { FUR_PALETTES, type FurColorId, type FurPalette } from '../game/draw';

/** Tamanho (px CSS) do canvas de cada cabecinha; o desenho usa unidades de 64. */
const SIZE = 64;

interface HeadPose {
  /** Balanço das orelhas, em radianos. */
  earSwing: number;
  /** 0 = olhos abertos, 1 = fechados (piscada). */
  blink: number;
  /** 0..1: quanto da língua está para fora. */
  tongue: number;
  /** Pulinho vertical, em unidades do desenho. */
  bounce: number;
}

const REST: HeadPose = { earSwing: 0, blink: 0, tongue: 0, bounce: 0 };

/** Pose da cabecinha selecionada: orelhas balançando, piscadas e língua de fora. */
function livelyPose(time: number): HeadPose {
  const blinkCycle = time % 3200;
  return {
    earSwing: Math.sin(time / 260) * 0.12,
    blink: blinkCycle < 140 ? Math.sin((blinkCycle / 140) * Math.PI) : 0,
    tongue: 0.75 + Math.sin(time / 180) * 0.25,
    bounce: Math.abs(Math.sin(time / 300)) * -1.6,
  };
}

function drawFrontHead(ctx: CanvasRenderingContext2D, fur: FurPalette, pose: HeadPose): void {
  const cx = 32;
  const cy = 30 + pose.bounce;
  const lw = 1.6;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = fur.outline;
  ctx.lineWidth = lw;

  // Coleira aparecendo embaixo do queixo, com a plaquinha dourada
  ctx.fillStyle = fur.collar;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 20, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(cx, cy + 24.5, 3, 0, Math.PI * 2);
  ctx.fill();

  // Orelhas compridas e caídas dos lados da cabeça
  ctx.fillStyle = fur.ear;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + side * 14, cy - 8);
    ctx.rotate(side * (0.28 + pose.earSwing));
    ctx.beginPath();
    ctx.ellipse(side * 3, 12, 7.5, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Cabeça
  const head = new Path2D();
  head.ellipse(cx, cy, 17, 16.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = fur.base;
  ctx.fill(head);

  // Manchas arlequim, recortadas dentro da cabeça
  ctx.save();
  ctx.clip(head);
  ctx.fillStyle = fur.patchDark;
  ctx.beginPath();
  ctx.ellipse(cx - 9, cy - 11, 7, 5.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 13, cy + 5, 5, 6.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur.patchMid;
  ctx.beginPath();
  ctx.ellipse(cx + 6, cy - 13, 4, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.stroke(head);

  // Sobrancelhas caramelo
  ctx.fillStyle = fur.tan;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * 7, cy - 8.5, 3, 1.9, side * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Focinho: de frente, vira um ovalzinho caramelo na parte de baixo
  ctx.fillStyle = fur.tan;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7, 9.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Língua de fora
  if (pose.tongue > 0.02) {
    ctx.fillStyle = fur.tongue;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12 + pose.tongue * 1.5, 3.2, 3 * pose.tongue + 1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boquinha em "w"
  ctx.strokeStyle = fur.nose;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 9);
  ctx.quadraticCurveTo(cx - 2, cy + 11.5, cx, cy + 8.5);
  ctx.quadraticCurveTo(cx + 2, cy + 11.5, cx + 4, cy + 9);
  ctx.stroke();

  // Nariz
  ctx.fillStyle = fur.nose;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 4.6, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - 1.5, cy + 3, 1.4, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Olhos — um escuro e um azul, típico dos arlequins
  for (const [side, color] of [
    [-1, fur.eye],
    [1, fur.eyeBlue],
  ] as Array<[number, string]>) {
    const ex = cx + side * 7;
    const ey = cy - 3.5;
    if (pose.blink > 0.5) {
      ctx.strokeStyle = fur.nose;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey);
      ctx.quadraticCurveTo(ex, ey + 2, ex + 3, ey);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#fffdf8';
    ctx.beginPath();
    ctx.arc(ex, ey, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ex, ey + 0.3, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + 0.9, ey - 0.9, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Desenha uma cabecinha em cada `canvas[data-color]` dentro de `container`.
 * Só a cor selecionada fica animada. Devolve a função que para a animação.
 */
export function startFurHeads(container: HTMLElement, getSelected: () => FurColorId): () => void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const heads: Array<{ ctx: CanvasRenderingContext2D; color: FurColorId }> = [];

  for (const canvas of container.querySelectorAll<HTMLCanvasElement>('canvas[data-color]')) {
    const color = canvas.dataset.color as FurColorId;
    const ctx = canvas.getContext('2d');
    if (!ctx || !(color in FUR_PALETTES)) continue;
    canvas.width = Math.round(SIZE * dpr);
    canvas.height = Math.round(SIZE * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    heads.push({ ctx, color });
  }

  let raf = 0;
  let stopped = false;

  const frame = (time: number) => {
    if (stopped) return;
    const selected = getSelected();
    for (const { ctx, color } of heads) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      drawFrontHead(ctx, FUR_PALETTES[color], color === selected ? livelyPose(time) : REST);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

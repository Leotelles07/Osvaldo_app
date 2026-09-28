/**
 * Desenho do Osvaldo e do cenário em Canvas 2D.
 *
 * O corpo é uma "fita" (ribbon) construída a partir dos centros dos segmentos,
 * com um círculo em cada junta para arredondar as curvas de 90 graus. Tudo isso
 * vira um único Path2D, preenchido de uma vez — barato mesmo com o Osvaldo bem
 * comprido, e utilizável como região de recorte para as manchas.
 */
import type { TreatKind } from './config';

export interface Point {
  x: number;
  y: number;
}

export interface FurPalette {
  base: string;
  patchDark: string;
  patchMid: string;
  tan: string;
  paw: string;
  pawPad: string;
  outline: string;
  ear: string;
  nose: string;
  eye: string;
  eyeBlue: string;
  tongue: string;
  collar: string;
}

export type FurColorId = 'default' | 'preto' | 'marrom' | 'branco';

/** Paletas de pelagem selecionáveis pelo jogador; todas mantêm o padrão arlequim. */
export const FUR_PALETTES: Record<FurColorId, FurPalette> = {
  default: {
    base: '#efe3d4',
    patchDark: '#3f3d48',
    patchMid: '#736d78',
    tan: '#c98a4b',
    paw: '#d8c6b0',
    pawPad: '#8d7360',
    outline: '#6d5645',
    ear: '#463731',
    nose: '#2b2429',
    eye: '#2b2429',
    eyeBlue: '#4aa3c7',
    tongue: '#e8687f',
    collar: '#e4572e',
  },
  preto: {
    base: '#302f35',
    patchDark: '#121214',
    patchMid: '#4c4b54',
    tan: '#5c5a63',
    paw: '#3d3c43',
    pawPad: '#1a191c',
    outline: '#121213',
    ear: '#19181b',
    nose: '#0d0d0e',
    eye: '#0d0d0e',
    eyeBlue: '#4aa3c7',
    tongue: '#e8687f',
    collar: '#e4572e',
  },
  marrom: {
    base: '#8a5a34',
    patchDark: '#432c17',
    patchMid: '#6b4526',
    tan: '#c98a4b',
    paw: '#a97a4c',
    pawPad: '#553823',
    outline: '#3f2a17',
    ear: '#3f2a17',
    nose: '#2b1c10',
    eye: '#2b2429',
    eyeBlue: '#4aa3c7',
    tongue: '#e8687f',
    collar: '#e4572e',
  },
  branco: {
    base: '#fbf7ec',
    patchDark: '#c7bca8',
    patchMid: '#e2d8c5',
    tan: '#e8b3a4',
    paw: '#f4efe2',
    pawPad: '#d99a92',
    outline: '#c2b6a0',
    ear: '#e2d5c0',
    nose: '#d98d82',
    eye: '#2b2429',
    eyeBlue: '#4aa3c7',
    tongue: '#e8687f',
    collar: '#e4572e',
  },
};

export const DEFAULT_FUR_COLOR: FurColorId = 'default';

/** Paleta usada quando nenhuma é informada explicitamente. */
export const FUR = FUR_PALETTES[DEFAULT_FUR_COLOR];

/** Hash determinístico: o mesmo segmento tem sempre as mesmas manchas. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** `roundRect` só existe em navegadores recentes; o retângulo simples resolve. */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/* -------------------------------------------------------------- cenário -- */

export function drawArena(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number,
): void {
  ctx.fillStyle = '#84c48f';
  ctx.fillRect(0, 0, width, height);

  // Xadrez suave de grama: ajuda a medir distâncias sem poluir a tela.
  ctx.fillStyle = '#7abb85';
  for (let y = 0; y * cell < height; y++) {
    for (let x = 0; x * cell < width; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  const grad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.3,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(20,60,40,0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/* ------------------------------------------------------------- petiscos -- */

/**
 * Preenche a forma com contorno só do lado de fora: o traço (com o dobro da
 * largura) vai por baixo e o preenchimento cobre a metade interna. Assim as
 * junções entre as partes de uma forma composta (ex.: as pontas do osso) não
 * aparecem como linhas no meio do desenho.
 */
function fillOutlined(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  fill: string,
  outline: string,
  width: number,
): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outline;
  ctx.lineWidth = width * 2;
  ctx.stroke(path);
  ctx.fillStyle = fill;
  ctx.fill(path);
}

/** Ossinho maciço: silhueta única, branca, com borda escura bem fina. */
function drawBone(ctx: CanvasRenderingContext2D, r: number, lw: number): void {
  const len = r * 1.3;
  const knob = r * 0.48;
  const bone = new Path2D();
  for (const [sx, sy] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    const cx = (sx * len) / 2;
    const cy = sy * knob * 0.72;
    bone.moveTo(cx + knob, cy);
    bone.arc(cx, cy, knob, 0, Math.PI * 2);
  }
  // Mesmo sentido dos círculos: com a regra "nonzero" tudo vira uma peça só.
  bone.rect(-len / 2, -knob * 0.8, len, knob * 1.6);
  fillOutlined(ctx, bone, '#ffffff', 'rgba(38, 32, 32, 0.8)', lw);
}

function drawBeef(ctx: CanvasRenderingContext2D, r: number, lw: number): void {
  const steak = new Path2D();
  steak.moveTo(-r * 0.95, -r * 0.1);
  steak.bezierCurveTo(-r * 1.0, -r * 0.78, -r * 0.1, -r * 0.88, r * 0.38, -r * 0.62);
  steak.bezierCurveTo(r * 0.98, -r * 0.35, r * 1.06, r * 0.38, r * 0.55, r * 0.64);
  steak.bezierCurveTo(r * 0.1, r * 0.88, -r * 0.9, r * 0.62, -r * 0.95, -r * 0.1);
  steak.closePath();

  // Borda de gordura
  fillOutlined(ctx, steak, '#f6dfcf', '#5c2419', lw);

  // Carne
  ctx.save();
  ctx.translate(r * 0.03, 0);
  ctx.scale(0.8, 0.76);
  ctx.fillStyle = '#c63a2e';
  ctx.fill(steak);
  ctx.restore();

  // Marmoreio
  ctx.strokeStyle = '#ec9a8c';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, -r * 0.4);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.2, r * 0.5, -r * 0.3);
  ctx.moveTo(-r * 0.05, r * 0.15);
  ctx.quadraticCurveTo(r * 0.25, r * 0.35, r * 0.55, r * 0.2);
  ctx.stroke();

  // Ossinho do corte
  ctx.fillStyle = '#fff7ea';
  ctx.strokeStyle = '#5c2419';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(-r * 0.45, -r * 0.08, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawStrawberry(ctx: CanvasRenderingContext2D, r: number, lw: number): void {
  const berry = new Path2D();
  berry.moveTo(0, r * 0.95);
  berry.bezierCurveTo(-r * 0.98, r * 0.35, -r * 0.95, -r * 0.62, 0, -r * 0.48);
  berry.bezierCurveTo(r * 0.95, -r * 0.62, r * 0.98, r * 0.35, 0, r * 0.95);
  berry.closePath();
  fillOutlined(ctx, berry, '#e8323c', '#7a1418', lw);

  // Brilho
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, -r * 0.1, r * 0.12, r * 0.22, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Sementinhas
  ctx.fillStyle = '#ffe07a';
  for (const [sx, sy] of [
    [-0.3, 0.2],
    [0.05, -0.1],
    [0.35, 0.1],
    [-0.05, 0.42],
    [0.25, 0.48],
    [-0.4, -0.25],
    [0.4, -0.3],
  ]) {
    ctx.beginPath();
    ctx.ellipse(sx * r, sy * r, r * 0.05, r * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Folhinhas
  const leaves = new Path2D();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.62 + Math.PI;
    const cx = Math.cos(a) * r * 0.26;
    const cy = -r * 0.52 - Math.sin(a) * r * 0.1;
    leaves.moveTo(cx + r * 0.3, cy);
    leaves.ellipse(cx, cy, r * 0.3, r * 0.11, a, 0, Math.PI * 2);
  }
  fillOutlined(ctx, leaves, '#43a84f', '#1f5a27', lw * 0.8);
}

function drawBanana(ctx: CanvasRenderingContext2D, r: number, lw: number): void {
  ctx.translate(0, -r * 0.12);
  const banana = new Path2D();
  banana.arc(0, -r * 0.8, r * 1.3, Math.PI * 0.22, Math.PI * 0.78);
  banana.arc(0, -r * 1.25, r * 1.3, Math.PI * 0.72, Math.PI * 0.28, true);
  banana.closePath();
  fillOutlined(ctx, banana, '#f9d648', '#7a5a10', lw);

  // Faixa de brilho ao longo da casca
  ctx.strokeStyle = '#fff1a6';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(0, -r * 0.95, r * 1.25, Math.PI * 0.32, Math.PI * 0.62);
  ctx.stroke();

  // Cabinho e pontinha
  ctx.fillStyle = '#6b4a1a';
  ctx.beginPath();
  ctx.ellipse(r * 1.0, -r * 0.14, r * 0.12, r * 0.16, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-r * 0.93, -r * 0.08, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawAvocado(ctx: CanvasRenderingContext2D, r: number, lw: number): void {
  ctx.translate(0, -r * 0.05);
  const shape = new Path2D();
  shape.moveTo(r * 0.72, r * 0.25);
  shape.arc(0, r * 0.25, r * 0.72, 0, Math.PI * 2);
  shape.moveTo(r * 0.45, -r * 0.42);
  shape.arc(0, -r * 0.42, r * 0.45, 0, Math.PI * 2);
  shape.moveTo(-r * 0.45, -r * 0.42);
  shape.lineTo(r * 0.45, -r * 0.42);
  shape.lineTo(r * 0.72, r * 0.25);
  shape.lineTo(-r * 0.72, r * 0.25);
  shape.closePath();

  // Casca
  fillOutlined(ctx, shape, '#2f5d23', '#1b3413', lw);

  // Polpa: borda mais verde, miolo amarelado
  ctx.save();
  ctx.translate(0, r * 0.03);
  ctx.scale(0.8, 0.82);
  ctx.fillStyle = '#b9d36a';
  ctx.fill(shape);
  ctx.scale(0.86, 0.86);
  ctx.fillStyle = '#e6f0a2';
  ctx.fill(shape);
  ctx.restore();

  // Caroço
  ctx.fillStyle = '#8a5a2b';
  ctx.strokeStyle = '#4a2d12';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, r * 0.3, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b37d49';
  ctx.beginPath();
  ctx.arc(-r * 0.1, r * 0.2, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

function drawWatermelon(ctx: CanvasRenderingContext2D, r: number, lw: number): void {
  const cy = -r * 0.35;
  const slice = (radius: number) => {
    const path = new Path2D();
    path.moveTo(radius, cy);
    path.arc(0, cy, radius, 0, Math.PI);
    path.closePath();
    return path;
  };

  // Casca, parte branca e polpa
  fillOutlined(ctx, slice(r * 1.02), '#3c8d3a', '#1d4d1c', lw);
  ctx.fillStyle = '#eaf6d2';
  ctx.fill(slice(r * 0.86));
  ctx.fillStyle = '#f0525e';
  ctx.fill(slice(r * 0.76));

  // Sementes
  ctx.fillStyle = '#2b2429';
  for (const [sx, sy] of [
    [-0.42, -0.16],
    [-0.15, 0.08],
    [0.15, 0.08],
    [0.42, -0.16],
    [0, -0.2],
  ]) {
    ctx.beginPath();
    ctx.ellipse(sx * r, sy * r, r * 0.055, r * 0.09, sx * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Barra de chocolate meio amargo, metade ainda no papel. */
function drawChocolate(ctx: CanvasRenderingContext2D, r: number, lw: number): void {
  const w = r * 1.25;
  const h = r * 1.75;

  ctx.fillStyle = '#3b1f14';
  ctx.strokeStyle = '#140905';
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  roundedRect(ctx, -w / 2, -h / 2, w, h, r * 0.14);
  ctx.fill();
  ctx.stroke();

  // Quadradinhos da barra
  const pad = w * 0.12;
  const sq = (w - pad * 3) / 2;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = -w / 2 + pad + col * (sq + pad);
      const y = -h / 2 + pad + row * (sq + pad);
      ctx.fillStyle = '#5a3221';
      ctx.fillRect(x, y, sq, sq);
      ctx.fillStyle = '#74432c';
      ctx.fillRect(x, y, sq, sq * 0.22);
    }
  }

  // Embrulho vermelho com a borda rasgada
  const top = h * 0.05;
  const teeth = 5;
  const wrap = new Path2D();
  wrap.moveTo(-w / 2, h / 2);
  wrap.lineTo(-w / 2, top);
  for (let i = 1; i <= teeth * 2; i++) {
    wrap.lineTo(-w / 2 + (w * i) / (teeth * 2), top + (i % 2 === 1 ? -r * 0.1 : 0));
  }
  wrap.lineTo(w / 2, h / 2);
  wrap.closePath();
  fillOutlined(ctx, wrap, '#b3202a', '#4f0c11', lw);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(-w / 2, h * 0.24, w, h * 0.07);
}

/** Banana de dinamite: três bananas amarradas e o pavio aceso. */
function drawBomb(ctx: CanvasRenderingContext2D, r: number, lw: number, time: number): void {
  const stickW = r * 0.42;
  const top = -r * 0.5;
  const stickH = r * 1.4;

  for (const x of [-0.44, 0.44, 0]) {
    const cx = x * r;
    ctx.fillStyle = '#d63a2f';
    ctx.strokeStyle = '#5b1410';
    ctx.lineWidth = lw;
    ctx.beginPath();
    roundedRect(ctx, cx - stickW / 2, top + (x === 0 ? -r * 0.08 : 0), stickW, stickH, r * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 170, 150, 0.55)';
    ctx.fillRect(cx - stickW * 0.3, top + r * 0.08, stickW * 0.16, stickH * 0.75);
  }

  // Fita que amarra as bananas
  ctx.fillStyle = '#2b2429';
  ctx.fillRect(-r * 0.7, r * 0.18, r * 1.4, r * 0.2);

  // Pavio
  const fuseEnd = { x: r * 0.42, y: -r * 0.98 };
  ctx.strokeStyle = '#4a3b2a';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, lw * 1.3);
  ctx.beginPath();
  ctx.moveTo(0, top - r * 0.08);
  ctx.quadraticCurveTo(0, -r * 0.95, fuseEnd.x, fuseEnd.y);
  ctx.stroke();

  // Faísca piscando na ponta do pavio
  const flicker = 0.75 + Math.sin(time / 38) * 0.15 + Math.sin(time / 17) * 0.1;
  const spark = r * 0.3 * flicker;
  ctx.save();
  ctx.translate(fuseEnd.x, fuseEnd.y);
  ctx.rotate(time / 90);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = Math.max(1, lw);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    ctx.moveTo(Math.cos(a) * spark, Math.sin(a) * spark);
    ctx.lineTo(-Math.cos(a) * spark, -Math.sin(a) * spark);
  }
  ctx.stroke();
  ctx.fillStyle = '#ff7b1c';
  ctx.beginPath();
  ctx.arc(0, 0, spark * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Desenha qualquer petisco. Os bons têm brilho dourado (chamam o Osvaldo), os
 * perigosos têm uma aura vermelha pulsando — dá para diferenciar de relance.
 */
export function drawTreat(
  ctx: CanvasRenderingContext2D,
  kind: TreatKind,
  p: Point,
  cell: number,
  time: number,
): void {
  const danger = kind === 'chocolate' || kind === 'bomb';
  // Cada item balança num ritmo próprio, para não parecerem sincronizados.
  const phase = p.x * 0.013 + p.y * 0.021;
  const bob = Math.sin(time / 260 + phase) * cell * 0.07;
  const pulse = 1 + Math.sin(time / 210 + phase) * 0.06;
  const r = cell * 0.4 * pulse;
  const lw = Math.max(1, cell * 0.035);

  ctx.save();

  const glowR = r * 1.9;
  const glow = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, glowR);
  if (danger) {
    const a = 0.3 + 0.15 * Math.sin(time / 180 + phase);
    glow.addColorStop(0, `rgba(235, 45, 45, ${a})`);
    glow.addColorStop(1, 'rgba(235, 45, 45, 0)');
  } else {
    glow.addColorStop(0, 'rgba(255, 240, 190, 0.5)');
    glow.addColorStop(1, 'rgba(255, 240, 190, 0)');
  }
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y + bob, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Sombra no chão (não acompanha o pulo do petisco)
  ctx.fillStyle = 'rgba(25, 70, 45, 0.2)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + cell * 0.3, r * 0.75, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(p.x, p.y + bob);
  const sway = Math.sin(time / 520 + phase);
  ctx.rotate(kind === 'bone' ? -0.45 + sway * 0.2 : sway * 0.12);

  switch (kind) {
    case 'bone':
      drawBone(ctx, r, lw);
      break;
    case 'beef':
      drawBeef(ctx, r, lw);
      break;
    case 'strawberry':
      drawStrawberry(ctx, r, lw);
      break;
    case 'banana':
      drawBanana(ctx, r, lw);
      break;
    case 'avocado':
      drawAvocado(ctx, r, lw);
      break;
    case 'watermelon':
      drawWatermelon(ctx, r, lw);
      break;
    case 'chocolate':
      drawChocolate(ctx, r, lw);
      break;
    case 'bomb':
      drawBomb(ctx, r, lw, time);
      break;
  }

  ctx.restore();
}

/* ------------------------------------------------------------- efeitos -- */

/** Marca de queimado no gramado, onde a dinamite estourou. */
export function drawScorch(ctx: CanvasRenderingContext2D, p: Point, cell: number): void {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, cell * 1.3);
  g.addColorStop(0, 'rgba(30, 24, 20, 0.55)');
  g.addColorStop(0.6, 'rgba(30, 24, 20, 0.25)');
  g.addColorStop(1, 'rgba(30, 24, 20, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, cell * 1.3, 0, Math.PI * 2);
  ctx.fill();
}

/** Explosão da dinamite. `elapsed` = ms desde o estouro. */
export function drawExplosion(ctx: CanvasRenderingContext2D, p: Point, cell: number, elapsed: number): void {
  const k = Math.min(1, elapsed / 650);
  if (k >= 1 && elapsed > 1600) return;
  const ease = 1 - (1 - k) * (1 - k);

  ctx.save();

  // Fumaça que sobe e se desfaz
  const smokeK = Math.min(1, elapsed / 1600);
  for (let i = 0; i < 6; i++) {
    const a = hash(i + 1) * Math.PI * 2;
    const dist = cell * (0.4 + smokeK * 1.1);
    ctx.fillStyle = `rgba(70, 66, 70, ${0.4 * (1 - smokeK)})`;
    ctx.beginPath();
    ctx.arc(
      p.x + Math.cos(a) * dist,
      p.y + Math.sin(a) * dist * 0.6 - smokeK * cell * 1.2,
      cell * (0.35 + smokeK * 0.5),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  if (k < 1) {
    // Raios de fogo
    ctx.strokeStyle = `rgba(255, 200, 60, ${1 - k})`;
    ctx.lineCap = 'round';
    ctx.lineWidth = cell * 0.12 * (1 - k) + 1;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + hash(i * 3.3) * 0.4;
      const inner = cell * (0.3 + ease * 1.2);
      const outer = inner + cell * (0.5 + hash(i * 7.1) * 0.6) * (1 - k * 0.5);
      ctx.moveTo(p.x + Math.cos(a) * inner, p.y + Math.sin(a) * inner);
      ctx.lineTo(p.x + Math.cos(a) * outer, p.y + Math.sin(a) * outer);
    }
    ctx.stroke();

    // Bola de fogo
    const radius = cell * (0.4 + ease * 1.8);
    const fire = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    fire.addColorStop(0, `rgba(255, 255, 230, ${1 - k})`);
    fire.addColorStop(0.35, `rgba(255, 210, 70, ${0.95 * (1 - k)})`);
    fire.addColorStop(0.7, `rgba(240, 90, 30, ${0.8 * (1 - k)})`);
    fire.addColorStop(1, 'rgba(200, 40, 20, 0)');
    ctx.fillStyle = fire;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Texto flutuante ("+2", "Eca!") que sobe e some. `elapsed` em ms. */
export function drawPopup(
  ctx: CanvasRenderingContext2D,
  p: Point,
  cell: number,
  text: string,
  color: string,
  elapsed: number,
): void {
  const k = elapsed / 900;
  if (k >= 1) return;
  ctx.save();
  ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
  ctx.font = `800 ${Math.round(cell * 0.62)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, cell * 0.12);
  ctx.strokeStyle = 'rgba(30, 30, 30, 0.8)';
  const y = p.y - cell * 0.5 - k * cell * 1.1;
  const scale = k < 0.15 ? 0.6 + (k / 0.15) * 0.4 : 1;
  ctx.translate(p.x, y);
  ctx.scale(scale, scale);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/* --------------------------------------------------------------- corpo -- */

/**
 * Monta a silhueta do corpo. Os círculos das juntas precisam ter a MESMA
 * orientação do polígono da fita: com a regra "nonzero" do canvas, sentidos
 * opostos se cancelariam e abririam buracos no meio do Osvaldo.
 */
function buildBodyPath(points: Point[], halfWidths: number[]): Path2D {
  const path = new Path2D();
  const n = points.length;
  if (n === 0) return path;

  if (n === 1) {
    path.arc(points[0].x, points[0].y, halfWidths[0], 0, Math.PI * 2);
    return path;
  }

  const normals: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    normals.push({ x: -dy / len, y: dx / len });
  }

  // Vértices: lado esquerdo da cabeça ao rabo, e a volta pelo lado direito.
  const outline: Point[] = [];
  for (let i = 0; i < n; i++) {
    outline.push({
      x: points[i].x + normals[i].x * halfWidths[i],
      y: points[i].y + normals[i].y * halfWidths[i],
    });
  }
  for (let i = n - 1; i >= 0; i--) {
    outline.push({
      x: points[i].x - normals[i].x * halfWidths[i],
      y: points[i].y - normals[i].y * halfWidths[i],
    });
  }

  path.moveTo(outline[0].x, outline[0].y);
  for (let i = 1; i < outline.length; i++) path.lineTo(outline[i].x, outline[i].y);
  path.closePath();

  // Área com sinal → sentido do polígono.
  let area = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    area += a.x * b.y - b.x * a.y;
  }
  const counterClockwise = area < 0;

  for (let i = 0; i < n; i++) {
    path.moveTo(points[i].x + halfWidths[i], points[i].y);
    path.arc(points[i].x, points[i].y, halfWidths[i], 0, Math.PI * 2, counterClockwise);
    path.closePath();
  }
  return path;
}

/**
 * Espessura ao longo do corpo: peitoral cheio, rabo afinando. O trecho do rabo
 * cresce junto com o Osvaldo — um filhote curtinho não pode ser só rabo.
 */
function halfWidthProfile(index: number, total: number, cell: number): number {
  const base = cell * 0.36;
  const tailLength = total >= 9 ? 3 : total >= 6 ? 2 : 1;
  const fromTail = total - 1 - index;

  if (fromTail < tailLength) {
    const t = (fromTail + 0.5) / tailLength; // 0 = pontinha, 1 = base do rabo
    return base * (0.22 + 0.78 * t);
  }
  if (index === 0) return base * 0.97;
  if (index === 1) return base * 1.05;
  return base;
}

/**
 * Patinhas curtas. As dianteiras ficam logo atrás da cabeça e as traseiras
 * perto do rabo — por isso cada par só é desenhado no trecho do corpo que
 * realmente contém aquela ponta (o corpo pode estar partido pela borda).
 */
function drawPaws(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  cell: number,
  time: number,
  moving: boolean,
  front: boolean,
  back: boolean,
  fur: FurPalette,
): void {
  const n = points.length;
  if (n < 3) return;

  const pairs: Array<{ idx: number; phase: number }> = [];
  if (front) pairs.push({ idx: 1, phase: 0 });
  if (back && n - 3 >= (front ? 3 : 1)) pairs.push({ idx: n - 3, phase: Math.PI });

  for (const { idx, phase } of pairs) {
    const p = points[idx];
    const prev = points[Math.max(0, idx - 1)];
    const next = points[Math.min(n - 1, idx + 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const angle = Math.atan2(dy, dx);

    for (const side of [-1, 1]) {
      const swing = moving ? Math.sin(time / 95 + phase + (side > 0 ? 0 : Math.PI)) : 0;
      const out = cell * (0.33 + Math.abs(swing) * 0.06);
      const along = swing * cell * 0.15;
      const px = p.x - dy * out * side + dx * along;
      const py = p.y + dx * out * side + dy * along;

      ctx.fillStyle = fur.outline;
      ctx.beginPath();
      ctx.ellipse(px, py, cell * 0.16, cell * 0.13, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fur.paw;
      ctx.beginPath();
      ctx.ellipse(px, py, cell * 0.13, cell * 0.1, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fur.pawPad;
      ctx.beginPath();
      ctx.ellipse(px + dx * cell * 0.03, py + dy * cell * 0.03, cell * 0.06, cell * 0.045, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  head: Point,
  neck: Point,
  cell: number,
  time: number,
  dead: boolean,
  chomp: number,
  fur: FurPalette,
  sick: number,
): void {
  let dx = head.x - neck.x;
  let dy = head.y - neck.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) {
    dx = 1;
    dy = 0;
  } else {
    dx /= len;
    dy /= len;
  }

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(Math.atan2(dy, dx));

  const r = cell * 0.42;
  const stroke = Math.max(1, cell * 0.05);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = fur.outline;
  ctx.lineWidth = stroke;

  // Orelhas compridas e caídas, uma de cada lado, balançando com a corrida
  const flop = dead ? 0 : Math.sin(time / 160) * 0.16;
  ctx.fillStyle = fur.ear;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(-r * 0.22, side * r * 0.5);
    ctx.rotate(side * (0.55 + flop));
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, side * r * 0.62, r * 0.42, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Focinho comprido, marca registrada do dachshund
  ctx.fillStyle = fur.tan;
  ctx.beginPath();
  ctx.ellipse(r * 0.9, 0, r * 0.66, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crânio
  ctx.fillStyle = fur.base;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.0, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Enjoado de chocolate: o rosto fica esverdeado
  if (sick > 0) {
    ctx.fillStyle = `rgba(118, 186, 64, ${0.5 * Math.min(1, sick * 1.5)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Língua de fora ao mastigar
  if (chomp > 0.02) {
    ctx.fillStyle = fur.tongue;
    ctx.beginPath();
    ctx.ellipse(r * 1.25, r * 0.1, r * 0.26 * chomp, r * 0.18 * chomp, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nariz
  ctx.fillStyle = fur.nose;
  ctx.beginPath();
  ctx.ellipse(r * 1.45, 0, r * 0.21, r * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Olhos — um azul, típico dos arlequins
  const eyeR = r * 0.16;
  for (const [side, color] of [
    [-1, fur.eye],
    [1, fur.eyeBlue],
  ] as Array<[number, string]>) {
    const ex = r * 0.28;
    const ey = side * r * 0.4;
    if (dead) {
      ctx.save();
      ctx.strokeStyle = fur.nose;
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - eyeR, ey - eyeR);
      ctx.lineTo(ex + eyeR, ey + eyeR);
      ctx.moveTo(ex + eyeR, ey - eyeR);
      ctx.lineTo(ex - eyeR, ey + eyeR);
      ctx.stroke();
      ctx.restore();
    } else if (sick > 0.05) {
      // Olhinhos rodando em espiral: tontura
      ctx.fillStyle = '#fffdf8';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = fur.eye;
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const spin = (time / 110) * side;
      for (let t = 0; t <= Math.PI * 4; t += 0.3) {
        const rad = (eyeR * 1.1 * t) / (Math.PI * 4);
        const a = t * side + spin;
        if (t === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex + Math.cos(a) * rad, ey + Math.sin(a) * rad);
      }
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = '#fffdf8';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ex + eyeR * 0.3, ey, eyeR * 0.82, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + eyeR * 0.55, ey - eyeR * 0.4, eyeR * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sobrancelhas claras, charme de dachshund
  ctx.fillStyle = fur.tan;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-r * 0.05, side * r * 0.46, r * 0.17, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gota de suor escorrendo pela testa
  if (sick > 0.05 && !dead) {
    const drip = ((time / 900) % 1) * r * 0.35;
    ctx.save();
    ctx.globalAlpha = Math.min(1, sick * 2);
    ctx.translate(-r * 0.45, -r * 0.95 + drip);
    ctx.fillStyle = '#8fd3f4';
    ctx.strokeStyle = '#3a7ea3';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.24);
    ctx.quadraticCurveTo(r * 0.16, 0, 0, r * 0.1);
    ctx.quadraticCurveTo(-r * 0.16, 0, 0, -r * 0.24);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export interface DogOptions {
  /** Centros dos segmentos em pixels, da cabeça para o rabo. */
  points: Point[];
  cell: number;
  time: number;
  /** Índice do primeiro ponto dentro do corpo inteiro (manchas estáveis). */
  indexOffset?: number;
  totalSegments?: number;
  dead?: boolean;
  chomp?: number;
  moving?: boolean;
  /** Cabeça, coleira e patas dianteiras: só no trecho que contém a cabeça. */
  withHead?: boolean;
  /** Patas traseiras: só no trecho que contém o rabo. */
  withTail?: boolean;
  /** Paleta de pelagem; usa a padrão quando omitida. */
  fur?: FurPalette;
  /** Mal-estar do chocolate (0..1): corpo esverdeado e cara de enjoo. */
  sick?: number;
}

export function drawOsvaldo(ctx: CanvasRenderingContext2D, opts: DogOptions): void {
  const {
    points,
    cell,
    time,
    indexOffset = 0,
    totalSegments = points.length,
    dead = false,
    chomp = 0,
    moving = true,
    withHead = true,
    withTail = true,
    fur = FUR_PALETTES[DEFAULT_FUR_COLOR],
    sick = 0,
  } = opts;

  if (points.length === 0) return;

  const halfWidths = points.map((_, i) => halfWidthProfile(indexOffset + i, totalSegments, cell));
  const outlineWidth = Math.max(1, cell * 0.05);
  // Duas silhuetas: a de fora vira o contorno, a de dentro recebe a pelagem.
  // (Um stroke no caminho desenharia também os círculos das juntas.)
  const outerPath = buildBodyPath(points, halfWidths);
  const innerPath = buildBodyPath(
    points,
    halfWidths.map((h) => Math.max(h * 0.45, h - outlineWidth)),
  );

  // Sombra projetada no gramado
  ctx.save();
  ctx.translate(cell * 0.08, cell * 0.16);
  ctx.fillStyle = 'rgba(22, 62, 40, 0.25)';
  ctx.fill(outerPath);
  ctx.restore();

  drawPaws(ctx, points, cell, time, moving && !dead, withHead, withTail, fur);

  ctx.fillStyle = fur.outline;
  ctx.fill(outerPath);
  ctx.fillStyle = fur.base;
  ctx.fill(innerPath);

  // Manchas arlequim, recortadas dentro do corpo
  ctx.save();
  ctx.clip(innerPath);
  for (let i = 0; i < points.length; i++) {
    const seg = indexOffset + i;
    const p = points[i];
    const count = hash(seg) > 0.55 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const h1 = hash(seg * 3.1 + k * 7.7);
      const h2 = hash(seg * 5.3 + k * 2.9);
      const h3 = hash(seg * 9.7 + k * 4.1);
      const rad = cell * (0.15 + h3 * 0.13);
      ctx.fillStyle = h1 > 0.62 ? fur.patchMid : fur.patchDark;
      ctx.beginPath();
      ctx.ellipse(
        p.x + (h1 - 0.5) * cell * 0.5,
        p.y + (h2 - 0.5) * cell * 0.5,
        rad,
        rad * (0.72 + h1 * 0.45),
        h3 * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Coleira logo atrás da cabeça
  if (withHead && points.length >= 2) {
    const a = points[0];
    const b = points[1];
    ctx.strokeStyle = fur.collar;
    ctx.lineWidth = cell * 0.9; // largo o bastante para atravessar o corpo todo
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(lerp(a.x, b.x, 0.42), lerp(a.y, b.y, 0.42));
    ctx.lineTo(lerp(a.x, b.x, 0.62), lerp(a.y, b.y, 0.62));
    ctx.stroke();
  }

  if (sick > 0) {
    ctx.fillStyle = `rgba(118, 186, 64, ${0.3 * Math.min(1, sick * 1.5)})`;
    ctx.fill(innerPath);
  }
  ctx.restore();

  if (withHead) {
    const neck = points.length > 1 ? points[1] : { x: points[0].x - cell, y: points[0].y };
    drawHead(ctx, points[0], neck, cell, time, dead, chomp, fur, sick);
  }
}

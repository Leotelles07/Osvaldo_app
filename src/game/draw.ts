/**
 * Desenho do Osvaldo e do cenário em Canvas 2D.
 *
 * O corpo é uma "fita" (ribbon) construída a partir dos centros dos segmentos,
 * com um círculo em cada junta para arredondar as curvas de 90 graus. Tudo isso
 * vira um único Path2D, preenchido de uma vez — barato mesmo com o Osvaldo bem
 * comprido, e utilizável como região de recorte para as manchas.
 */

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

/* -------------------------------------------------------------- petisco -- */

export function drawTreat(ctx: CanvasRenderingContext2D, p: Point, cell: number, time: number): void {
  const bob = Math.sin(time / 260) * cell * 0.07;
  const pulse = 1 + Math.sin(time / 210) * 0.06;
  const r = cell * 0.4 * pulse;

  ctx.save();

  // Brilho: ajuda a localizar o petisco à distância
  const glow = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, r * 1.9);
  glow.addColorStop(0, 'rgba(255, 240, 190, 0.5)');
  glow.addColorStop(1, 'rgba(255, 240, 190, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y + bob, r * 1.9, 0, Math.PI * 2);
  ctx.fill();

  // Sombra no chão (não acompanha o pulo do petisco)
  ctx.fillStyle = 'rgba(25, 70, 45, 0.2)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + cell * 0.3, r * 0.75, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(p.x, p.y + bob);
  ctx.rotate(-0.45 + Math.sin(time / 520) * 0.2);

  // Ossinho: quatro bolinhas nas pontas + haste
  ctx.fillStyle = '#f7e6c6';
  ctx.strokeStyle = '#c29b66';
  ctx.lineWidth = Math.max(1, cell * 0.045);
  ctx.lineJoin = 'round';

  const len = r * 1.3;
  const knob = r * 0.48;
  ctx.beginPath();
  ctx.arc(-len / 2, -knob * 0.72, knob, 0, Math.PI * 2);
  ctx.closePath();
  ctx.arc(-len / 2, knob * 0.72, knob, 0, Math.PI * 2);
  ctx.closePath();
  ctx.arc(len / 2, -knob * 0.72, knob, 0, Math.PI * 2);
  ctx.closePath();
  ctx.arc(len / 2, knob * 0.72, knob, 0, Math.PI * 2);
  ctx.closePath();
  roundedRect(ctx, -len / 2, -knob * 0.8, len, knob * 1.6, knob * 0.7);
  ctx.fill();
  ctx.stroke();

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
  ctx.restore();

  if (withHead) {
    const neck = points.length > 1 ? points[1] : { x: points[0].x - cell, y: points[0].y };
    drawHead(ctx, points[0], neck, cell, time, dead, chomp, fur);
  }
}

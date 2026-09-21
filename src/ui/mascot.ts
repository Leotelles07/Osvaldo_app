/**
 * Osvaldo parado na tela inicial: reaproveita exatamente o mesmo desenho do
 * jogo, só que com um corpo montado à mão (ondulado, de perfil).
 */
import { drawOsvaldo, type Point } from '../game/draw';

export function startMascot(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const cssWidth = 320;
  const cssHeight = 180;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cell = 38;
  const segments = 8;
  const spacing = cell * 0.95;
  let raf = 0;
  let stopped = false;

  const frame = (time: number) => {
    if (stopped) return;
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const points: Point[] = [];
    const startX = (cssWidth + spacing * (segments - 1)) / 2;
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      points.push({
        x: startX - i * spacing,
        y: cssHeight * 0.5 + Math.sin(time / 430 + t * 2.2) * 6 + t * 3,
      });
    }

    drawOsvaldo(ctx, {
      points,
      cell,
      time,
      totalSegments: segments,
      moving: true,
      withHead: true,
    });

    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

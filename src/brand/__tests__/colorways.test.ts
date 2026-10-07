import { describe, expect, it } from 'vitest';
import { COLORWAYS, colorwayCssVars, pickColorway } from '../colorways';

/* Contraste relativo da WCAG 2.1. */
function luminancia(hex: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * canal((n >> 16) & 255) +
    0.7152 * canal((n >> 8) & 255) +
    0.0722 * canal(n & 255)
  );
}

function contraste(a: string, b: string): number {
  const [hi, lo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const INK = '#211915';
const PAPER = '#fbfbf7';

describe('combinações de cor da marca', () => {
  it('tem as sete cores da paleta, sem repetir fundo', () => {
    expect(COLORWAYS).toHaveLength(7);
    expect(new Set(COLORWAYS.map((c) => c.bg)).size).toBe(7);
  });

  it('nunca usa a mesma cor como fundo e destaque', () => {
    for (const c of COLORWAYS) expect(c.accent).not.toBe(c.bg);
  });

  it('usa só os dois neutros da marca para texto', () => {
    for (const c of COLORWAYS) {
      expect([INK, PAPER]).toContain(c.onBg);
      expect([INK, PAPER]).toContain(c.onAccent);
    }
  });

  /*
   * Texto grande em negrito precisa de 3:1 na WCAG AA. É esse o patamar usado
   * no título sobre o fundo e no botão primário — nenhum texto pequeno fica
   * direto sobre cor de marca (ver DESIGN_SYSTEM.md).
   */
  it('escolhe sempre o neutro de maior contraste disponível', () => {
    for (const c of COLORWAYS) {
      const melhorFundo = contraste(c.bg, INK) >= contraste(c.bg, PAPER) ? INK : PAPER;
      const melhorDestaque = contraste(c.accent, INK) >= contraste(c.accent, PAPER) ? INK : PAPER;
      expect(c.onBg, `fundo ${c.name}`).toBe(melhorFundo);
      expect(c.onAccent, `destaque ${c.name}`).toBe(melhorDestaque);
    }
  });

  it('alcança no mínimo 3:1 para texto grande em toda combinação', () => {
    for (const c of COLORWAYS) {
      expect(contraste(c.bg, c.onBg), `fundo ${c.name}`).toBeGreaterThanOrEqual(3);
      expect(contraste(c.accent, c.onAccent), `destaque ${c.name}`).toBeGreaterThanOrEqual(3);
    }
  });

  /*
   * O Osvaldo e os petiscos foram desenhados sobre o gramado original, cuja
   * luminância relativa é 0,464. Todo campo precisa cair nessa faixa — é o que
   * garante a mesma leitura do jogo nas sete cores.
   */
  it('mantém o campo na luminância para a qual o Osvaldo foi desenhado', () => {
    const GRAMADO = 0.4637;
    for (const c of COLORWAYS) {
      expect(luminancia(c.field), `campo ${c.name}`).toBeGreaterThan(GRAMADO - 0.02);
      expect(luminancia(c.field), `campo ${c.name}`).toBeLessThan(GRAMADO + 0.02);
      // O xadrez é uma variação discreta do campo, não uma segunda cor.
      const delta = luminancia(c.field) - luminancia(c.fieldAlt);
      expect(delta, `xadrez ${c.name}`).toBeGreaterThan(0);
      expect(delta, `xadrez ${c.name}`).toBeLessThan(0.08);
    }
  });

  it('sorteia sempre uma combinação diferente da anterior', () => {
    for (const atual of COLORWAYS) {
      for (let i = 0; i < 30; i++) {
        expect(pickColorway(atual).name).not.toBe(atual.name);
      }
    }
  });

  it('publica todas as variáveis que o CSS consome', () => {
    for (const c of COLORWAYS) {
      const vars = colorwayCssVars(c);
      expect(Object.keys(vars).sort()).toEqual([
        '--cw-accent', '--cw-bg', '--cw-field', '--cw-field-alt',
        '--cw-on-accent', '--cw-on-bg',
      ]);
      expect(vars['--cw-bg']).toBe(c.bg);
      expect(vars['--cw-field']).toBe(c.field);
    }
  });
});

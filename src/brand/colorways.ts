/**
 * Combinações de cor da marca ("colorways").
 *
 * O manual do Osvaldo Games entrega o mesmo mascote em várias cores, nenhuma
 * delas "a" cor oficial. O app usa isso literalmente: cada partida sorteia uma
 * combinação, então duas rodadas seguidas nunca têm a mesma cara.
 *
 * Duas decisões sustentam a tabela abaixo, e ambas estão travadas por teste:
 *
 * - `onBg` e `onAccent` são sempre o neutro de maior contraste contra aquela
 *   cor, nunca uma escolha a olho.
 * - O pelo do mascote (`mascot`) é sempre uma terceira cor, distinta do fundo
 *   e da argola. É como o manual monta as pranchas: magenta com pelo lima,
 *   lima com pelo turquesa, turquesa com pelo âmbar. Usar o fundo como pelo
 *   deixaria o mascote sumir ao ser aplicado sobre o próprio fundo.
 * - `field` não é a cor pura da marca: é o mesmo matiz ajustado para ter a
 *   mesma *luminância relativa* do gramado original (0,464). Igualar a
 *   claridade em HSL não bastaria — o verde carrega muito mais luminância que
 *   o magenta no mesmo HSL. Como o Osvaldo e os petiscos foram desenhados
 *   sobre aquele gramado, igualar a luminância preserva a leitura do jogo nas
 *   sete cores.
 */

export interface Colorway {
  /** Identificador usado em testes e na página do Design System. */
  name: string;
  /** Rótulo legível, para a página do Design System. */
  label: string;
  /** Cor de fundo da tela inteira. */
  bg: string;
  /** Cor de destaque: argola do mascote, botão primário, foco. */
  accent: string;
  /** Pelo do mascote. Sempre diferente do fundo — ver nota acima. */
  mascot: string;
  /** Texto grande sobre `bg`. Só os dois neutros da marca entram aqui. */
  onBg: string;
  /** Texto e ícones sobre `accent`. */
  onAccent: string;
  /** Campo de jogo. */
  field: string;
  /** Faixas do xadrez do campo. */
  fieldAlt: string;
}

const INK = '#211915';
const PAPER = '#fbfbf7';

export const COLORWAYS: readonly Colorway[] = [
  // As três primeiras são as pranchas do manual, com as cores exatas dele.
  { name: 'magenta', label: 'Magenta',  bg: '#db016b', accent: '#967dce', mascot: '#cae21e', onBg: PAPER, onAccent: INK,   field: '#dba7c0', fieldAlt: '#d69ab7' },
  { name: 'lime',    label: 'Lima',     bg: '#cae21e', accent: '#dd4919', mascot: '#69bbc6', onBg: INK,   onAccent: INK,   field: '#b1bd5c', fieldAlt: '#a6b249' },
  { name: 'teal',    label: 'Turquesa', bg: '#69bbc6', accent: '#db016b', mascot: '#e39b25', onBg: INK,   onAccent: PAPER, field: '#7cc0ca', fieldAlt: '#6ab7c2' },
  // As quatro restantes seguem a mesma lógica, com cores da própria paleta.
  { name: 'purple',  label: 'Roxo',     bg: '#967dce', accent: '#e8e842', mascot: '#cae21e', onBg: INK,   onAccent: INK,   field: '#bdafde', fieldAlt: '#b4a3d9' },
  { name: 'orange',  label: 'Laranja',  bg: '#dd4919', accent: '#69bbc6', mascot: '#e8e842', onBg: INK,   onAccent: INK,   field: '#d7ac9d', fieldAlt: '#d1a090' },
  { name: 'amber',   label: 'Âmbar',    bg: '#e39b25', accent: '#967dce', mascot: '#69bbc6', onBg: INK,   onAccent: INK,   field: '#cdb284', fieldAlt: '#c6a673' },
  { name: 'yellow',  label: 'Amarelo',  bg: '#e8e842', accent: '#db016b', mascot: '#69bbc6', onBg: INK,   onAccent: PAPER, field: '#bbbb57', fieldAlt: '#b0b148' },
] as const;

/**
 * Combinação oficial: é a do ícone e do manifest, e a que a tela inicial veste
 * antes do primeiro sorteio. Mudar o ícone significa mudar isto junto.
 */
export const DEFAULT_COLORWAY = COLORWAYS[0];

let current: Colorway = DEFAULT_COLORWAY;

export function getColorway(): Colorway {
  return current;
}

/**
 * Sorteia uma combinação diferente da atual, para a troca ser sempre
 * perceptível entre uma partida e a seguinte.
 */
export function pickColorway(previous: Colorway = current): Colorway {
  const outras = COLORWAYS.filter((c) => c.name !== previous.name);
  return outras[Math.floor(Math.random() * outras.length)] ?? COLORWAYS[0];
}

/** As variáveis CSS que uma combinação publica. Função pura, fácil de testar. */
export function colorwayCssVars(colorway: Colorway): Record<string, string> {
  return {
    '--cw-bg': colorway.bg,
    '--cw-accent': colorway.accent,
    '--cw-mascot': colorway.mascot,
    '--cw-on-bg': colorway.onBg,
    '--cw-on-accent': colorway.onAccent,
    '--cw-field': colorway.field,
    '--cw-field-alt': colorway.fieldAlt,
  };
}

/** Publica a combinação nas variáveis CSS que o restante do app consome. */
export function applyColorway(
  colorway: Colorway,
  root: HTMLElement = document.documentElement,
): void {
  current = colorway;
  for (const [nome, valor] of Object.entries(colorwayCssVars(colorway))) {
    root.style.setProperty(nome, valor);
  }
  root.dataset.colorway = colorway.name;

  // A barra do navegador no celular acompanha o fundo da partida.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colorway.bg);
}

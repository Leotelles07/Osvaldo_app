/**
 * Página visual do Design System.
 *
 * Lê os mesmos tokens e as mesmas combinações que o jogo usa, então nunca
 * documenta algo diferente do que está no ar: tudo aqui é gerado a partir de
 * src/styles/tokens.css e src/brand/colorways.ts.
 */
import './styles/tokens.css';
import './styles.css';
import './styles/design-system.css';
import { COLORWAYS, applyColorway, DEFAULT_COLORWAY, type Colorway } from './brand/colorways';

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el;
};

/** Lê um token direto do CSS: a página nunca repete valores à mão. */
const token = (nome: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

/* ------------------------------------------------------------- contraste -- */

function luminancia(hex: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function contraste(a: string, b: string): number {
  const [hi, lo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------------------------------------------------------------- blocos -- */

function amostra(nome: string, varName: string): string {
  const valor = token(varName);
  return `
    <figure class="ds-swatch">
      <div class="ds-swatch__chip" style="background:${valor}"></div>
      <figcaption>
        <b>${nome}</b>
        <code>${varName}</code>
        <code>${valor.toUpperCase()}</code>
      </figcaption>
    </figure>`;
}

function montarPaleta(): void {
  const cores: Array<[string, string]> = [
    ['Roxo', '--brand-purple'],
    ['Magenta', '--brand-magenta'],
    ['Laranja', '--brand-orange'],
    ['Âmbar', '--brand-amber'],
    ['Amarelo', '--brand-yellow'],
    ['Lima', '--brand-lime'],
    ['Turquesa', '--brand-teal'],
  ];
  $('ds-palette').innerHTML = cores.map(([n, v]) => amostra(n, v)).join('');

  const neutros: Array<[string, string]> = [
    ['Ink (contorno)', '--ink'],
    ['Paper (superfície)', '--paper'],
    ['Branco', '--white'],
    ['Cinza 100', '--gray-100'],
    ['Cinza 300', '--gray-300'],
    ['Cinza 600', '--gray-600'],
  ];
  $('ds-neutrals').innerHTML = neutros.map(([n, v]) => amostra(n, v)).join('');
}

function montarCombinacoes(): void {
  const alvo = $('ds-colorways');
  alvo.innerHTML = COLORWAYS.map((c) => {
    const rFundo = contraste(c.bg, c.onBg);
    const rDestaque = contraste(c.accent, c.onAccent);
    return `
      <button class="ds-cw" type="button" data-colorway="${c.name}" style="background:${c.bg}">
        <span class="ds-cw__name" style="color:${c.onBg}">${c.label}</span>
        <span class="ds-cw__bars">
          <span style="background:${c.accent}"></span>
          <span style="background:${c.field}"></span>
          <span style="background:${c.fieldAlt}"></span>
        </span>
        <span class="ds-cw__meta" style="color:${c.onBg}">
          texto ${rFundo.toFixed(1)}:1 · destaque ${rDestaque.toFixed(1)}:1
        </span>
      </button>`;
  }).join('');

  alvo.addEventListener('click', (ev) => {
    const botao = (ev.target as HTMLElement).closest<HTMLElement>('[data-colorway]');
    if (!botao) return;
    const escolhida = COLORWAYS.find((c) => c.name === botao.dataset.colorway);
    if (escolhida) selecionar(escolhida);
  });
}

function selecionar(c: Colorway): void {
  applyColorway(c);
  for (const el of document.querySelectorAll<HTMLElement>('[data-colorway]')) {
    el.classList.toggle('is-selected', el.dataset.colorway === c.name);
  }
}

function montarTipografia(): void {
  const escala: Array<[string, string]> = [
    ['--text-4xl', 'Contagem regressiva'],
    ['--text-3xl', 'Título de destaque'],
    ['--text-2xl', 'Título de painel'],
    ['--text-xl', 'Botões'],
    ['--text-lg', 'Campo de texto'],
    ['--text-md', 'Corpo de texto'],
    ['--text-sm', 'Apoio'],
    ['--text-xs', 'Rótulo e dica'],
  ];
  $('ds-type').innerHTML = escala
    .map(
      ([v, rotulo]) => `
      <div class="ds-type__row">
        <span class="ds-type__sample" style="font-size:var(${v})">Osvaldo</span>
        <span class="ds-type__meta"><code>${v}</code> · ${rotulo}</span>
      </div>`,
    )
    .join('');
}

function montarTracos(): void {
  const itens: Array<[string, string, string]> = [
    ['Traço fino', '--stroke-1', 'detalhes e chips pequenos'],
    ['Traço padrão', '--stroke-2', 'botões, campos, chips'],
    ['Traço grosso', '--stroke-3', 'cartões, painéis, tabuleiro'],
  ];
  const sombras: Array<[string, string, string]> = [
    ['Sombra 1', '--shadow-1', 'botões de ícone'],
    ['Sombra 2', '--shadow-2', 'botões e setas'],
    ['Sombra 3', '--shadow-3', 'tabuleiro'],
    ['Painel', '--shadow-panel', 'cartões flutuantes'],
  ];
  $('ds-strokes').innerHTML = [
    ...itens.map(
      ([n, v, uso]) => `
      <figure class="ds-swatch">
        <div class="ds-swatch__chip ds-swatch__chip--stroke" style="border-width:var(${v})"></div>
        <figcaption><b>${n}</b><code>${v}</code><span>${uso}</span></figcaption>
      </figure>`,
    ),
    ...sombras.map(
      ([n, v, uso]) => `
      <figure class="ds-swatch">
        <div class="ds-swatch__chip ds-swatch__chip--shadow" style="box-shadow:var(${v})"></div>
        <figcaption><b>${n}</b><code>${v}</code><span>${uso}</span></figcaption>
      </figure>`,
    ),
  ].join('');
}

function montarMarca(): void {
  const assets: Array<[string, string, string]> = [
    ['Mascote (cor da partida)', 'brand/mascote.svg', 'ds-asset__img--live'],
    ['Mascote turquesa', 'brand/mascote-teal.svg', ''],
    ['Mascote lima', 'brand/mascote-lime.svg', ''],
    ['Mascote âmbar', 'brand/mascote-amber.svg', ''],
    ['Logotipo preto', 'brand/logo-preto.svg', ''],
    ['Logotipo laranja', 'brand/logo-laranja.svg', ''],
    ['Logotipo colorido', 'brand/logo-colorido.svg', ''],
    ['Paleta', 'brand/paleta.svg', ''],
  ];
  $('ds-brand').innerHTML = assets
    .map(
      ([nome, caminho, extra]) => `
      <figure class="ds-asset">
        <div class="ds-asset__box">
          <img class="ds-asset__img ${extra}" src="./${caminho}" alt="${nome}" loading="lazy" />
        </div>
        <figcaption><b>${nome}</b><code>/${caminho}</code></figcaption>
      </figure>`,
    )
    .join('');
}

/* ------------------------------------------------------------------ boot -- */

applyColorway(DEFAULT_COLORWAY);
montarPaleta();
montarCombinacoes();
montarTipografia();
montarTracos();
montarMarca();
selecionar(DEFAULT_COLORWAY);

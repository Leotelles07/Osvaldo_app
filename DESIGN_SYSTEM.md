# Design System — Osvaldo Games

Sistema visual do app, derivado do manual de marca (`Dodo.svg`).

- **Tokens (código):** [`src/styles/tokens.css`](src/styles/tokens.css) — fonte única da verdade
- **Combinações de cor:** [`src/brand/colorways.ts`](src/brand/colorways.ts)
- **Página visual:** `/design-system.html` ([online](https://leotelles07.github.io/Osvaldo_app/design-system.html))
- **Arte da marca:** [`public/brand/`](public/brand)

> A página visual não é uma cópia desta documentação: ela lê os mesmos tokens
> que o jogo consome em tempo de execução. Se um valor mudar no código, a
> página muda junto — ela não tem como ficar desatualizada.

---

## 1. Princípios

Três regras explicam quase toda decisão visual do app:

**1. Contorno preto em tudo.** Nenhuma forma sólida fica sem traço `--ink`.
É o que faz cada elemento parecer um adesivo recortado, como o mascote.

**2. Sombra sólida e deslocada, nunca difusa.** `box-shadow: 0 5px 0 var(--ink)`.
Ao pressionar, o elemento desce e a sombra encolhe — o botão afunda em vez de
escurecer. A única exceção são painéis flutuantes, que ganham um halo suave
para descolar do fundo saturado.

**3. Texto pequeno nunca fica direto sobre cor de marca.** Vai dentro de um
chip de papel com contorno preto. Veja a seção 3 para o porquê.

---

## 2. Cores

As sete cores do manual. **Nenhuma é a cor principal** — é justamente essa
ausência de hierarquia que permite sortear uma combinação por partida.

| Token | Hex | |
| --- | --- | --- |
| `--brand-purple` | `#967DCE` | Roxo |
| `--brand-magenta` | `#DB016B` | Magenta |
| `--brand-orange` | `#DD4919` | Laranja |
| `--brand-amber` | `#E39B25` | Âmbar |
| `--brand-yellow` | `#E8E842` | Amarelo |
| `--brand-lime` | `#CAE21E` | Lima |
| `--brand-teal` | `#69BBC6` | Turquesa |

### Neutros

| Token | Hex | Uso |
| --- | --- | --- |
| `--ink` | `#211915` | Contorno de tudo, texto principal. É um preto quente, não `#000` |
| `--paper` | `#FBFBF7` | Toda superfície de conteúdo: cartões, painéis, chips |
| `--white` | `#FFFFFF` | Campos de entrada, para distinguir do papel |
| `--gray-100` | `#F7F7F8` | Superfície rebaixada (placar) |
| `--gray-300` | `#C2C3C9` | Placeholder, divisórias |
| `--gray-600` | `#727176` | Texto de apoio |

---

## 3. Contraste: a regra do chip

Medindo cada cor da marca contra os dois neutros:

| Cor | vs. `--ink` | vs. `--paper` | Melhor |
| --- | --- | --- | --- |
| Amarelo | **13,2:1** | 1,3:1 | ink |
| Lima | **11,9:1** | 1,4:1 | ink |
| Turquesa | **7,8:1** | 2,1:1 | ink |
| Âmbar | **7,4:1** | 2,3:1 | ink |
| Roxo | **5,0:1** | 3,3:1 | ink |
| Magenta | 3,5:1 | **4,8:1** | paper |
| Laranja | **4,2:1** | 4,0:1 | ink |

**Laranja e magenta não alcançam 4,5:1 contra nenhum neutro.** Como a cor é
sorteada, não dá para contar com a sorte. Daí duas decisões:

- **Texto pequeno vai em chip de papel** (`.hud__chip`), garantindo ~15:1
  independente da cor sorteada. O nome do jogador e a pontuação usam isso.
- **Texto sobre cor é sempre grande e em negrito**, faixa em que a WCAG exige
  3:1 e não 4,5:1. Por isso `.btn` usa `--text-xl` (≥18,66px em negrito): é o
  que torna legítimo usar as sete cores no botão primário.

O neutro de cada combinação nunca é escolhido a olho: `onBg` e `onAccent` são
sempre o de maior contraste, e há teste automatizado travando isso
(`src/brand/__tests__/colorways.test.ts`).

---

## 4. Combinações da partida

Cada partida sorteia uma das sete combinações, sempre diferente da anterior.
`src/brand/colorways.ts` define:

| Campo | O que é |
| --- | --- |
| `bg` | Fundo da tela inteira |
| `accent` | Argola do mascote, botão primário, foco, seta ativa |
| `onBg` / `onAccent` | Neutro de maior contraste contra cada uma |
| `field` / `fieldAlt` | Campo de jogo e faixas do xadrez |

### Por que o campo não usa a cor pura

O Osvaldo (creme, contorno claro) e os petiscos foram desenhados sobre o
gramado original `#84C48F`. Jogá-los sobre uma cor saturada quebraria o
contraste para o qual o desenho foi feito.

O campo usa então **o matiz da combinação com a luminância relativa do gramado
original (0,464)**. Note que não basta igualar a claridade em HSL: no mesmo
HSL, um verde carrega muito mais luminância que um magenta, porque o canal
verde responde por 71% da luminância percebida. O cálculo é feito sobre
luminância relativa, e um teste verifica que todos os sete campos caem na
faixa 0,444–0,484.

Resultado: o jogo se lê exatamente igual nas sete cores.

---

## 5. Tipografia

**Baloo 2**, variável, auto-hospedada em `public/fonts/baloo2-latin.woff2`
(33 KB, pesos 400–800). Arredondada e bojuda, irmã do lettering do logotipo.
Auto-hospedar evita uma requisição a terceiros e mantém o jogo abrindo rápido
em rede ruim.

| Token | Uso |
| --- | --- |
| `--text-4xl` | Contagem regressiva |
| `--text-3xl` | Título de destaque |
| `--text-2xl` | Título de painel, placar |
| `--text-xl` | Botões |
| `--text-lg` | Campo de texto, botão de ícone |
| `--text-md` | Corpo de texto |
| `--text-sm` | Apoio |
| `--text-xs` | Rótulo, dica, chip |

Pesos: `--weight-body` (500), `--weight-bold` (700), `--weight-display` (800).
Títulos e qualquer coisa sobre cor usam sempre o peso display.

---

## 6. Traço, sombra e forma

| Token | Valor | Uso |
| --- | --- | --- |
| `--stroke-1` | 2px | Chips pequenos, detalhes |
| `--stroke-2` | 3px | Botões, campos, setas |
| `--stroke-3` | 4px | Cartões, painéis, tabuleiro |
| `--shadow-1` | `0 3px 0 ink` | Botões de ícone, chips |
| `--shadow-2` | `0 5px 0 ink` | Botões, setas |
| `--shadow-3` | `0 7px 0 ink` | Tabuleiro |
| `--shadow-pressed` | `0 1px 0 ink` | Estado pressionado |
| `--shadow-panel` | sólida + halo | Cartões flutuantes |

Raios: `--radius-sm` 10px · `--radius-md` 16px · `--radius-lg` 24px ·
`--radius-pill` 999px.

Espaçamento em escala de 4px (`--space-1` a `--space-7`).

---

## 7. Marca

Arte vetorial extraída do manual, em `public/brand/`:

| Arquivo | O que é |
| --- | --- |
| `mascote.svg` | Mascote que **veste a cor da partida** (via `--mascote-pelo` e `--mascote-argola`) |
| `mascote-teal/lime/amber.svg` | As três variantes fixas do manual |
| `logo.svg` | Logotipo em `currentColor` — a cor vem do CSS |
| `logo-preto/laranja/colorido.svg` | As três versões do manual |
| `paleta.svg` | As sete cores |

No app, o logotipo e o mascote são declarados **uma vez** como `<symbol>` no
`index.html` e reaproveitados com `<use>`. Isso permite colori-los por CSS
(coisa que `<img src="...svg">` não permite) sem duplicar o peso do arquivo.

> Atenção ao mexer nos símbolos: o `<svg>` que referencia precisa de
> `viewBox="0 0 largura altura"`. O `<symbol>` é quem carrega o `viewBox`
> deslocado da prancha original — se o externo também tiver deslocamento, o
> desenho cai fora da área visível e nada aparece.

### Nome

**Osvaldo Games** é o nome em todo lugar: título da aba, manifest, HUD,
documentação.

---

## 8. Acessibilidade

- Alvos de toque de no mínimo 52px (`--tap-min`); botões de ícone, 48px
- Campo de nome com fonte ≥16px, que evita o zoom automático do iOS
- Foco visível com `outline` sólido em `--ink`, nunca removido
- `prefers-reduced-motion` desliga todas as animações da interface
- Contraste verificado por teste, não por inspeção visual

---

## 9. Mexendo no sistema

**Trocar uma cor da marca:** altere `src/styles/tokens.css` e o `COLORWAYS`
correspondente. Rode `npm test` — se o contraste quebrar, o teste aponta qual
combinação e por quê.

**Adicionar uma combinação:** acrescente uma entrada em `COLORWAYS`. Os testes
exigem que `onBg`/`onAccent` sejam o neutro de maior contraste e que o campo
caia na faixa de luminância do gramado.

**Nunca** escreva um valor de cor cru fora de `tokens.css` e `colorways.ts`.

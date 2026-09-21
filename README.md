# 🌭 Osvaldo Game

Um jogo no estilo *snake* em que o personagem é o **Osvaldo**, um cachorrinho
linguiça arlequim (dachshund *dapple*). Ele corre atrás dos petiscos e, a cada
um que come, fica mais comprido e mais rápido — até morder o próprio rabo.

Feito para ser aberto por um link e jogado no **celular** (guiando o Osvaldo com
o dedo) ou no **computador** (setas ou W A S D).

---

## Como jogar

| Plataforma | Controle |
| --- | --- |
| Celular / tablet | Arraste o dedo na tela. O Osvaldo vira na direção do seu dedo — dá para "puxar" ele até o petisco. Um deslize rápido também funciona. |
| Computador | Setas ou `W` `A` `S` `D`. `Espaço`, `P` ou `Esc` pausam. |

- Cada petisco vale **1 ponto**, aumenta o corpo em 1 segmento e acelera o jogo.
- A **única** forma de perder é morder o próprio corpo. As bordas do gramado são
  atravessáveis: sai de um lado, entra do outro.
- Ao perder, o placar aparece como `PONTOS/RECORDE` (ex.: `0007/0012`), sendo o
  recorde o melhor resultado daquele jogador na sessão.

---

## Rodando na sua máquina

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo (`node -v` para conferir).

```bash
git clone https://github.com/Leotelles07/Osvaldo_app.git
cd Osvaldo_app
npm install
npm run dev
```

O terminal mostra dois endereços:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.0.42:5173/
```

- **`Local`** — abra no navegador do computador para jogar com as setas ou W A S D.
- **`Network`** — abra **esse** endereço no celular, com o aparelho na mesma
  rede Wi-Fi do computador. É a melhor forma de testar o controle por toque,
  que é a experiência principal do jogo. (O IP muda de rede para rede; use o
  que o seu terminal imprimir.)

Para parar o servidor: `Ctrl+C`.

### Outros comandos

```bash
npm test         # testes das regras do jogo
npm run build    # checagem de tipos + build de produção em dist/
npm run preview  # serve o build de produção (também acessível pela rede)
```

## Publicação

O workflow [`deploy.yml`](.github/workflows/deploy.yml) publica no **GitHub
Pages** a cada push na branch `main`: instala, roda os testes, faz o build e
sobe a pasta `dist/`.

Para ativar (uma vez só): **Settings → Pages → Source: GitHub Actions**.
O jogo fica disponível em `https://leotelles07.github.io/Osvaldo_app/`.

> O build usa caminhos relativos (`base: './'` em
> [`vite.config.ts`](vite.config.ts)), então a mesma pasta `dist/` funciona
> servida na raiz de um domínio ou dentro de um subdiretório. Publicar em
> Vercel, Netlify ou num domínio próprio não exige nenhum ajuste.

---

## Arquitetura

### Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Build | **Vite + TypeScript** | Bundle final de ~7 KB gzip: abre instantâneo mesmo em 4G ruim. Tipagem evita a classe de bug mais comum em jogos (estado inconsistente). |
| UI das telas | **HTML + CSS puro** | As telas (início, contagem, pausa, fim) são DOM comum: acessíveis, com teclado do celular funcionando de verdade e sem o custo de um framework. |
| Jogo | **Canvas 2D** | Um único elemento redesenhado a cada quadro. Sem DOM por segmento, sem WebGL: roda liso em aparelho simples e não gasta bateria. |
| Áudio | **Web Audio API** | Efeitos sintetizados na hora — zero arquivos para baixar. |
| Backend | **nenhum** | O jogo é 100% estático. Nome e recorde da sessão vivem no aparelho. Hospedagem gratuita, nada para manter, nada de dado pessoal saindo do celular. |

### Estrutura

```
src/
├── main.ts              Orquestra tudo: telas, contagem regressiva, loop, HUD
├── styles.css           Layout mobile-first (dvh + safe-area, sem scroll)
├── game/
│   ├── config.ts        Balanceamento: velocidade, crescimento, tamanho do tabuleiro
│   ├── core.ts          Regras do jogo — sem canvas, sem DOM, determinístico
│   ├── renderer.ts      Estado do jogo → pixels (DPR, travessia de bordas)
│   ├── draw.ts          Desenho do Osvaldo, do petisco e do gramado
│   ├── input.ts         Teclado e toque → direções
│   ├── audio.ts         Efeitos sonoros
│   └── __tests__/       Testes das regras
└── ui/mascot.ts         Osvaldo animado da tela inicial
```

### Decisões que fazem o jogo parecer "gostoso"

**Lógica em passos fixos, desenho interpolado.** A simulação anda em passos
discretos de tamanho fixo (como o snake original, o que mantém as colisões
justas e previsíveis), mas o desenho interpola entre o passo anterior e o atual.
Resultado: colisão de grade, movimento de 60 fps. O `update()` também limita o
delta de tempo, para que uma travada do navegador não teletransporte o Osvaldo.

**Fila de direções.** Curvas em "L" rápidas costumam ser engolidas em jogos de
grade quando o jogador vira duas vezes dentro do mesmo passo. Aqui as direções
entram numa fila curta (2 posições), então a segunda curva é respeitada no passo
seguinte em vez de ser perdida. Curvas de 180° são ignoradas — o Osvaldo é
comprido demais para se dobrar ao meio.

**Tabuleiro que acompanha a tela.** Em vez de um tabuleiro quadrado fixo (que
deixaria faixas verdes enormes no celular), o número de colunas e linhas é
calculado a partir do espaço disponível, mirando células de tamanho confortável
para o dedo. O tabuleiro só muda de formato **entre partidas** — nunca com o
Osvaldo correndo.

**Guiar em vez de deslizar.** No celular, a direção é calculada a partir do
**dedo em relação à cabeça do Osvaldo**, não do gesto de deslize. Na prática o
jogador aponta para onde quer ir e o cachorro obedece, o que é muito mais
intuitivo para crianças e para quem não joga habitualmente. O deslize comum
continua funcionando como alternativa.

**Corpo em uma só pincelada.** O corpo é uma fita poligonal construída a partir
dos centros dos segmentos, com círculos nas juntas para arredondar as curvas —
um único `Path2D`, preenchido de uma vez e reaproveitado como região de recorte
para as manchas arlequim. Mesmo com o Osvaldo bem comprido, um quadro custa
cerca de **0,2 ms** para desenhar.

**As manchas não escorregam.** Cada mancha é gerada por um hash do índice do
segmento, então o desenho da pelagem é fixo em relação ao corpo do cachorro em
vez de deslizar sobre ele enquanto anda.

**Travessia de bordas sem teletransporte.** Quando o Osvaldo atravessa uma
borda, o corpo é dividido nos pontos de quebra e o trecho que está saindo é
desenhado duas vezes, deslocado — ele sai por um lado e entra pelo outro ao
mesmo tempo, sem piscar.

### Acessibilidade e cuidado com o jogador

- Botões com no mínimo 52 px de altura e fontes grandes.
- Campo de nome com fonte ≥ 16 px (evita o zoom automático do iOS) e o teclado
  fecha sozinho antes da partida começar.
- O jogo pausa sozinho ao trocar de aba ou receber uma ligação.
- Som pode ser desligado (a preferência fica salva) e a vibração respeita isso.
- `prefers-reduced-motion` desliga as animações da interface.
- Nenhum dado sai do aparelho.

---

## Ajustando o jogo

Quase todo o balanceamento está em [`src/game/config.ts`](src/game/config.ts):

| Parâmetro | O que faz |
| --- | --- |
| `startStepMs` | Velocidade inicial (maior = mais devagar) |
| `minStepMs` | Piso de velocidade: o mais rápido que o jogo chega |
| `speedUpPerTreat` | Quanto acelera a cada petisco |
| `startLength` / `growPerTreat` | Tamanho inicial e crescimento por petisco |
| `wrapWalls` | `true`: bordas atravessáveis. `false`: bater na cerca também encerra a partida |
| `cellsOnShortSide` | Quantas células cabem no lado menor da tela (tabuleiro mais aberto ou mais apertado) |
| `touchDeadZone` | Sensibilidade do controle por toque |

Os testes em `src/game/__tests__/core.test.ts` cobrem as regras (crescimento,
pontuação, aceleração, mordida no rabo, travessia de bordas), então dá para
mexer nos números com segurança.

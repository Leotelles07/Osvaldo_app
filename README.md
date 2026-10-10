# 🌭 Osvaldo Games

Um jogo no estilo *snake* em que o personagem é o **Osvaldo**, um cachorrinho
linguiça arlequim (dachshund *dapple*). Ele corre atrás dos petiscos e, a cada
um que come, fica mais comprido e mais rápido — até morder o próprio rabo, comer
chocolate demais ou abocanhar uma dinamite.

Feito para ser aberto por um link e jogado no **celular** (guiando o Osvaldo com
o dedo) ou no **computador** (setas ou W A S D).

---

## Como jogar

Na primeira vez, crie um acesso com **nome, e-mail e senha** (mínimo de 6
caracteres) e toque em **Cadastre**. Quem já tem cadastro toca em **Entrar**.
O acesso fica salvo no aparelho: ao reabrir o jogo, você já entra direto na
escolha de cor do Osvaldo. O nome da conta é o que aparece no placar.

| Plataforma | Controle |
| --- | --- |
| Celular / tablet | Arraste o dedo na tela. O Osvaldo vira na direção do seu dedo — dá para "puxar" ele até o petisco. Um deslize rápido também funciona. |
| Computador | Setas ou `W` `A` `S` `D`. `Espaço`, `P` ou `Esc` pausam. |

- Sempre há **um petisco bom** no gramado. Todos aumentam o corpo em 1 segmento
  e aceleram o jogo, mas valem pontos diferentes:

  | Petisco | Pontos |
  | --- | --- |
  | 🦴 Ossinho, 🍓 morango, 🍌 banana, 🥑 abacate | 1 |
  | 🥩 Carne | 2 |
  | 🍉 Melancia (mais rara) | 3 |

- A partir de alguns pontos surgem **petiscos perigosos** (com uma aura
  vermelha). Eles ficam no gramado até serem comidos ou até o Osvaldo comer o
  próximo petisco bom:
  - 🍫 **Chocolate** — faz mal para cachorro. No 1º e no 2º o Osvaldo passa mal
    por alguns segundos: a tela treme, ele fica verde, tonto e mais lento. No
    **3º chocolate** a partida acaba. O contador aparece no topo da tela.
  - 🧨 **Dinamite** — surge mais adiante na partida e encerra o jogo na hora.
- Também perde quem morder o próprio corpo. As bordas do gramado são
  atravessáveis: sai de um lado, entra do outro.
- Ao perder, o placar aparece como `PONTOS/RECORDE` (ex.: `0007/0012`), sendo o
  recorde o melhor resultado daquele jogador na sessão.

### Telas

```
Cadastro ⇄ Entrar ──▶ Escolha de cor ──▶ Jogo (contagem → partida → pausa / fim de jogo)
```

"Sair" na pausa volta para a escolha de cor; **Sair da conta** (na escolha de
cor e no fim de jogo) volta para a tela de Entrar.

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

O cadastro e o login já funcionam direto do `npm run dev`: a configuração do
Firebase vem no arquivo [`.env`](.env) do repositório.

## Contas (Firebase)

O cadastro e o login usam o **Firebase Authentication** (projeto
`osvaldo-games`) com e-mail e senha. A configuração do app web fica em
[`.env`](.env), versionada, e vale para o servidor local e para o build
publicado — não há secret para cadastrar no GitHub.

| Variável | Campo do `firebaseConfig` |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

> Esses valores são a configuração **pública** do app web — eles vão para o
> navegador de qualquer jeito. Quem protege as contas é o Firebase (senhas
> com hash no servidor, limite de tentativas, domínios autorizados), não o
> segredo dessas chaves. Nunca coloque no `.env` uma chave de servidor
> (conta de serviço / Admin SDK).

No console do Firebase precisam estar ligados:

- **Authentication → Método de login → E-mail/senha.**
- **Authentication → Configurações → Domínios autorizados:**
  `leotelles07.github.io` (o `localhost` já vem na lista). Publicar em outro
  domínio exige adicioná-lo aqui.

Para testar contra outro projeto do Firebase na sua máquina, crie um
`.env.local` com as mesmas quatro variáveis: ele tem prioridade sobre o `.env`
e não vai para o Git.

O Firebase mantém a sessão salva no navegador (IndexedDB), por isso o jogador
continua logado ao reabrir o app até tocar em **Sair da conta**.

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

## Design System

A identidade visual vem do manual de marca do Osvaldo Games. A documentação
completa está em **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)**, e há uma página
visual navegável em
**[/design-system.html](https://leotelles07.github.io/Osvaldo_app/design-system.html)**
com paleta, tipografia, componentes ao vivo e os assets da marca.

Em resumo:

- **Sete cores, nenhuma principal.** Cada partida sorteia uma combinação de
  fundo e destaque — duas rodadas seguidas nunca têm a mesma cara.
- **Contorno preto em tudo, sombra sólida deslocada.** Aspecto de adesivo
  recortado, igual ao mascote.
- **Tokens como fonte única da verdade** em
  [`src/styles/tokens.css`](src/styles/tokens.css). Nenhum valor de cor cru
  aparece fora dali.
- **Contraste travado por teste:** o neutro de cada combinação é sempre o de
  maior contraste, e o campo de jogo mantém a luminância para a qual o Osvaldo
  foi desenhado.


---

## Arquitetura

### Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Build | **Vite + TypeScript** | O jogo em si tem ~7 KB gzip; com o SDK do Firebase Auth o bundle fica em ~50 KB gzip. Tipagem evita a classe de bug mais comum em jogos (estado inconsistente). |
| UI das telas | **HTML + CSS puro** | As telas (cadastro, entrar, cor, contagem, pausa, fim) são DOM comum: acessíveis, com teclado do celular e gerenciador de senhas funcionando de verdade e sem o custo de um framework. |
| Jogo | **Canvas 2D** | Um único elemento redesenhado a cada quadro. Sem DOM por segmento, sem WebGL: roda liso em aparelho simples e não gasta bateria. |
| Áudio | **Web Audio API** | Efeitos sintetizados na hora — zero arquivos para baixar. |
| Contas | **Firebase Authentication** | Cadastro e login com e-mail e senha sem manter servidor próprio. O resto continua estático: o recorde da sessão vive só no aparelho. |

### Estrutura

```
src/
├── main.ts              Orquestra tudo: acesso, telas, contagem regressiva, loop, HUD
├── auth/
│   ├── firebase.ts      Cadastro, login, saída e sessão salva (Firebase Auth)
│   ├── validation.ts    Regras dos formulários e mensagens de erro em português
│   └── __tests__/       Testes das regras de acesso
├── styles.css           Layout mobile-first (dvh + safe-area, sem scroll)
├── game/
│   ├── config.ts        Balanceamento: velocidade, crescimento, tamanho do tabuleiro
│   ├── core.ts          Regras do jogo — sem canvas, sem DOM, determinístico
│   ├── renderer.ts      Estado do jogo → pixels (DPR, travessia de bordas)
│   ├── draw.ts          Desenho do Osvaldo, dos petiscos, das explosões e do gramado
│   ├── input.ts         Teclado e toque → direções
│   ├── audio.ts         Efeitos sonoros
│   └── __tests__/       Testes das regras
└── ui/
    ├── authForm.ts      Liga os formulários de acesso ao DOM (erros, carregando)
    ├── mascot.ts        Osvaldo animado da escolha de cor
    └── furHeads.ts      Cabecinhas das opções de cor
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
- Campos com fonte ≥ 16 px (evita o zoom automático do iOS), `autocomplete`
  certo para o gerenciador de senhas e teclado de e-mail no celular. O teclado
  fecha sozinho ao enviar o formulário.
- Erros aparecem embaixo de cada campo e são anunciados para leitores de tela.
- O jogo pausa sozinho ao trocar de aba ou receber uma ligação.
- Som pode ser desligado (a preferência fica salva) e a vibração respeita isso.
- `prefers-reduced-motion` desliga as animações da interface.
- Só nome, e-mail e senha saem do aparelho, direto para o Firebase. O jogo
  não guarda a senha em lugar nenhum.

---

## Ajustando o jogo

Quase todo o balanceamento está em [`src/game/config.ts`](src/game/config.ts):

| Parâmetro | O que faz |
| --- | --- |
| `startStepMs` | Velocidade inicial (maior = mais devagar) |
| `minStepMs` | Piso de velocidade: o mais rápido que o jogo chega |
| `speedUpPerTreat` | Quanto acelera a cada petisco |
| `startLength` / `growPerTreat` | Tamanho inicial e crescimento por petisco |
| `GOOD_TREATS` | Pontos e chance de sorteio de cada petisco bom |
| `hazardsFromScore` / `bombsFromScore` | A partir de quantos pontos surgem chocolates e dinamites |
| `hazardChance` / `bombChance` / `maxHazards` | Quantos perigos aparecem e quantos deles são dinamite |
| `chocolateLimit` | Em qual chocolate o Osvaldo não aguenta e a partida acaba |
| `sickMs` / `sickSlowFactor` | Duração do mal-estar e quanto ele deixa o Osvaldo mais lento |
| `wrapWalls` | `true`: bordas atravessáveis. `false`: bater na cerca também encerra a partida |
| `cellsOnShortSide` | Quantas células cabem no lado menor da tela (tabuleiro mais aberto ou mais apertado) |
| `touchDeadZone` | Sensibilidade do controle por toque |

Os testes em `src/game/__tests__/core.test.ts` cobrem as regras (crescimento,
pontuação por petisco, aceleração, chocolate, dinamite, mordida no rabo,
travessia de bordas), então dá para
mexer nos números com segurança.

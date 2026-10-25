# Banco de dados (PostgreSQL)

A modelagem — tabelas, diagrama e consultas de métricas — está em
[docs/modelagem-banco.md](../docs/modelagem-banco.md). Esta pasta tem o que é
preciso para montar o banco:

```
db/
├── 00_criar_banco.sql        Usuário "osvaldo" e banco "osvaldo_games" (roda uma vez)
├── migrations/
│   └── 001_estrutura_inicial.sql   Tabelas, índices e views
└── seeds/
    └── dados_exemplo.sql     Jogadores e partidas de mentira para desenvolvimento
```

Precisa do **PostgreSQL 13 ou mais novo** (`psql --version`) e do Node.js
20.12 ou mais novo.

## Montando o banco na sua máquina

**1. Criar o usuário e o banco** (uma vez só). Troque a senha:

```bash
psql -U postgres -v senha='troque-esta-senha' -f db/00_criar_banco.sql
```

> No Windows, se o terminal não achar o `psql`, ele fica em
> `C:\Program Files\PostgreSQL\<versão>\bin\psql.exe`. O usuário `postgres` e
> a senha dele são os definidos na instalação.

**2. Dizer ao projeto onde está o banco.** Crie um arquivo `.env.local` na
raiz do projeto (ele não vai para o Git) com a mesma senha do passo 1:

```
DATABASE_URL=postgres://osvaldo:troque-esta-senha@localhost:5432/osvaldo_games
```

**3. Criar as tabelas:**

```bash
npm run db:migrate
```

**4. (Opcional) Carregar dados de exemplo**, para as views e as métricas
terem o que mostrar:

```bash
npm run db:seed
```

Para conferir:

```bash
psql -U osvaldo -d osvaldo_games -c "select * from vw_ranking"
```

```
 posicao | usuario_id   | nome | recorde | ...
---------+--------------+------+---------+
       1 | exemplo-beto | Beto |      25 |
       2 | exemplo-ana  | Ana  |      18 |
       3 | exemplo-caio | Caio |       3 |
```

## Pelo pgAdmin 4

Um "servidor" no pgAdmin é só a conexão com um PostgreSQL; as tabelas ficam
dentro de um **banco** desse servidor. Com o servidor já cadastrado:

**1. Criar o usuário.** Clique com o botão direito em
*Login/Group Roles → Create → Login/Group Role…*

- *General → Name:* `osvaldo`
- *Definition → Password:* a senha escolhida
- *Privileges → Can login?:* ligado

**2. Criar o banco.** Botão direito em *Databases → Create → Database…*

- *Database:* `osvaldo_games`
- *Owner:* `osvaldo`

**3. Criar as tabelas.** Escolha **uma** das duas formas:

- **Pelo terminal (recomendado):** preencha o `.env.local` com o endereço do
  servidor (em *Properties → Connection* do servidor no pgAdmin estão o
  *Host* e a *Port*) e rode `npm run db:migrate`, como no passo 3 acima.
- **Só pelo pgAdmin:** selecione o banco `osvaldo_games`, abra o
  *Tools → Query Tool*, clique em *Open File* e escolha
  `db/migrations/001_estrutura_inicial.sql`. Execute (F5). Depois abra e
  execute, do mesmo jeito, `db/pgadmin/registrar_001.sql` — ele avisa ao
  `npm run db:migrate` que essa migração já foi feita, para ele não tentar
  criar as tabelas de novo no futuro.

Para conferir, atualize o banco (F5) e veja as tabelas em
*Schemas → public → Tables* e as views em *Views*.

> Num banco de produção não rode o `npm run db:seed`: ele cria jogadores e
> partidas de mentira que entrariam no ranking.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run db:migrate` | Aplica as migrações que ainda não rodaram, cada uma numa transação. |
| `npm run db:status` | Lista cada migração como `aplicada`, `pendente` ou `ALTERADA`. |
| `npm run db:seed` | Recria os dados de exemplo (só os registros `exemplo-*`). Nunca rode em produção. |

## Mudando a estrutura

Nunca edite uma migração que já foi aplicada: o `db:migrate` guarda um hash de
cada arquivo e recusa rodar se ele mudou, porque o banco deixaria de
corresponder ao arquivo. Para alterar uma tabela, crie o próximo arquivo
numerado, por exemplo `db/migrations/002_cor_preferida.sql`, e rode
`npm run db:migrate`.

## O que ainda falta para o jogo gravar partidas

O jogo roda no navegador e é publicado como site estático (GitHub Pages). O
navegador **não conecta direto no PostgreSQL** — e nem deveria, porque a senha
do banco iria junto para todo jogador. O próximo passo é uma API pequena
(Node.js) entre os dois, que:

1. recebe o token do Firebase Auth enviado pelo jogo e confere quem é o
   jogador;
2. grava sessões e partidas no banco em nome dele;
3. devolve o ranking (só posição, nome e recorde).

Rodando na sua máquina, o banco local já serve para desenvolver essa API.
Para o jogo publicado acessar o banco, ele precisa estar num servidor
acessível pela internet; há opções gratuitas de PostgreSQL gerenciado (Neon,
Supabase), e as mesmas migrações rodam nelas apontando o `DATABASE_URL` para
o endereço novo.

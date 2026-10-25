-- Estrutura inicial, conforme docs/modelagem-banco.md.
-- Requer PostgreSQL 13 ou mais novo (gen_random_uuid() embutido).

create table usuarios (
  id               text primary key,          -- uid do Firebase Auth
  nome             text not null,
  email            text not null unique,
  criado_em        timestamptz not null default now(),
  ultimo_acesso_em timestamptz                -- cópia de max(sessoes.iniciada_em)
);

-- Catálogo das cores do Osvaldo; espelha FurColorId em src/game/draw.ts.
create table cores_personagem (
  id    text primary key,
  nome  text not null,
  ativa boolean not null default true
);

insert into cores_personagem (id, nome) values
  ('default', 'Arlequim'),
  ('preto',   'Preto'),
  ('marrom',  'Marrom'),
  ('branco',  'Branco');

create table sessoes (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   text not null references usuarios(id),
  iniciada_em  timestamptz not null default now(),
  encerrada_em timestamptz,                   -- nulo se a aba fechou sem aviso
  plataforma   text check (plataforma in ('mobile', 'desktop')),
  user_agent   text,
  versao_app   text,
  check (encerrada_em is null or encerrada_em >= iniciada_em)
);

create table partidas (
  id                uuid primary key default gen_random_uuid(),
  sessao_id         uuid not null references sessoes(id),
  usuario_id        text not null references usuarios(id),
  cor_id            text not null references cores_personagem(id),
  tema              text,                     -- colorway sorteado
  iniciada_em       timestamptz not null,
  encerrada_em      timestamptz not null,
  duracao_ms        integer not null check (duracao_ms >= 0),   -- sem pausas
  pontos            integer not null check (pontos >= 0),
  causa_fim         text not null check (causa_fim in ('tail', 'wall', 'bomb', 'chocolate', 'abandono')),
  chocolates        integer not null default 0 check (chocolates >= 0),
  comprimento_final integer check (comprimento_final > 0),
  colunas           integer check (colunas > 0),
  linhas            integer check (linhas > 0),
  check (encerrada_em >= iniciada_em)
);

create table partida_petiscos (
  partida_id uuid not null references partidas(id) on delete cascade,
  tipo       text not null,
  quantidade integer not null check (quantidade > 0),
  primary key (partida_id, tipo)
);

-- Recorde e ranking saem destes índices sem varrer a tabela.
create index partidas_usuario_pontos on partidas (usuario_id, pontos desc);
create index partidas_sessao         on partidas (sessao_id);
create index partidas_encerrada_em   on partidas (encerrada_em);
create index sessoes_usuario_inicio  on sessoes  (usuario_id, iniciada_em desc);

-- Recorde de cada jogador (a primeira partida que alcançou o maior placar).
create view vw_recordes as
select distinct on (p.usuario_id)
       p.usuario_id, u.nome, p.pontos as recorde, p.id as partida_id, p.encerrada_em as alcancado_em
  from partidas p
  join usuarios u on u.id = p.usuario_id
 order by p.usuario_id, p.pontos desc, p.encerrada_em asc;

-- Ranking geral: a primeira linha é o usuário que mais fez pontos.
-- Empate: fica à frente quem chegou primeiro ao placar.
create view vw_ranking as
select rank() over (order by recorde desc, alcancado_em asc) as posicao, *
  from vw_recordes;

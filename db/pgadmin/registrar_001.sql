-- Só para quem criou as tabelas pelo pgAdmin (abrindo
-- db/migrations/001_estrutura_inicial.sql no Query Tool) em vez de usar
-- "npm run db:migrate". Rode logo depois, no mesmo banco.
--
-- Registra a migração 001 como aplicada, para o "npm run db:migrate" não
-- tentar criar as tabelas de novo. O checksum é o mesmo que o script calcula
-- para o arquivo 001; se ele não bater, o db:status mostra ALTERADA.

create table if not exists schema_migrations (
  nome        text primary key,
  checksum    text not null,
  aplicada_em timestamptz not null default now()
);

insert into schema_migrations (nome, checksum)
values ('001_estrutura_inicial.sql', 'cc06bbe4b93f62edf079a1773a4e6a762ae0a797029cfcd709928ba835f7ebda')
on conflict (nome) do nothing;

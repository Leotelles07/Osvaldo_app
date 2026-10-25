-- Cria o usuário e o banco do Osvaldo Games. Roda uma vez só, como
-- superusuário (normalmente "postgres"), passando a senha escolhida:
--
--   psql -U postgres -v senha='troque-esta-senha' -f db/00_criar_banco.sql
--
-- As tabelas não ficam aqui: elas vêm das migrações (npm run db:migrate).

\set ON_ERROR_STOP on

create role osvaldo login password :'senha';
create database osvaldo_games owner osvaldo encoding 'UTF8' template template0;

-- Ninguém além do dono conecta no banco.
revoke all on database osvaldo_games from public;

/**
 * Migrações do banco PostgreSQL.
 *
 *   node scripts/db.mjs migrate   aplica as migrações pendentes de db/migrations
 *   node scripts/db.mjs status    lista o que já foi aplicado e o que falta
 *   node scripts/db.mjs seed      carrega db/seeds/dados_exemplo.sql
 *
 * A conexão vem de DATABASE_URL (no ambiente ou no .env.local, que não vai
 * para o Git). Cada migração roda numa transação e fica registrada em
 * schema_migrations com um hash do conteúdo: editar uma migração já aplicada
 * é recusado, porque o banco não refletiria mais o arquivo — crie uma nova.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'db', 'migrations');
const seedFile = join(root, 'db', 'seeds', 'dados_exemplo.sql');

const envLocal = join(root, '.env.local');
if (!process.env.DATABASE_URL && existsSync(envLocal)) {
  // loadEnvFile existe a partir do Node 20.12.
  if (typeof process.loadEnvFile === 'function') process.loadEnvFile(envLocal);
  else console.warn('Este Node não lê o .env.local sozinho (precisa do 20.12+). Exporte DATABASE_URL no terminal.');
}

if (!process.env.DATABASE_URL) {
  console.error(
    'Defina DATABASE_URL, por exemplo no .env.local:\n' +
      '  DATABASE_URL=postgres://osvaldo:SUA_SENHA@localhost:5432/osvaldo_games',
  );
  process.exit(1);
}

// Quebras de linha normalizadas: o mesmo arquivo tem CRLF no Windows e LF no resto.
const hash = (sql) => createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');

function migrationFiles() {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(migrationsDir, name), 'utf8');
      return { name, sql, checksum: hash(sql) };
    });
}

async function applied(client) {
  await client.query(`
    create table if not exists schema_migrations (
      nome       text primary key,
      checksum   text not null,
      aplicada_em timestamptz not null default now()
    )`);
  const { rows } = await client.query('select nome, checksum from schema_migrations');
  return new Map(rows.map((row) => [row.nome, row.checksum]));
}

/** Migrações que faltam aplicar; falha se uma já aplicada foi alterada. */
function pending(files, done) {
  for (const file of files) {
    const checksum = done.get(file.name);
    if (checksum && checksum !== file.checksum) {
      throw new Error(`${file.name} mudou depois de aplicada. Desfaça a edição e crie uma migração nova.`);
    }
  }
  return files.filter((file) => !done.has(file.name));
}

async function migrate(client) {
  const todo = pending(migrationFiles(), await applied(client));
  if (todo.length === 0) return console.log('Banco em dia, nenhuma migração pendente.');
  for (const file of todo) {
    await client.query('begin');
    try {
      await client.query(file.sql);
      await client.query('insert into schema_migrations (nome, checksum) values ($1, $2)', [file.name, file.checksum]);
      await client.query('commit');
      console.log(`✔ ${file.name}`);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`${file.name}: ${error.message}`);
    }
  }
}

async function status(client) {
  const files = migrationFiles();
  const done = await applied(client);
  for (const file of files) {
    const state = !done.has(file.name) ? 'pendente' : done.get(file.name) === file.checksum ? 'aplicada' : 'ALTERADA';
    console.log(`${state.padEnd(9)} ${file.name}`);
  }
}

async function seed(client) {
  const left = pending(migrationFiles(), await applied(client));
  if (left.length > 0) throw new Error('Há migrações pendentes. Rode "npm run db:migrate" antes.');
  await client.query('begin');
  try {
    await client.query(readFileSync(seedFile, 'utf8'));
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
  console.log('Dados de exemplo carregados.');
}

const commands = { migrate, status, seed };
const command = commands[process.argv[2]];
if (!command) {
  console.error('Uso: node scripts/db.mjs migrate | status | seed');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await command(client);
} catch (error) {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

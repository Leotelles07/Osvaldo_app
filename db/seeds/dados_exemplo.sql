-- Dados de exemplo para desenvolvimento: três jogadores, algumas sessões e
-- partidas, o suficiente para as views e as consultas de métricas
-- devolverem algo. Pode rodar de novo: apaga e recria só estes registros.
-- Nunca rode em produção.

delete from partidas where usuario_id like 'exemplo-%';
delete from sessoes  where usuario_id like 'exemplo-%';
delete from usuarios where id         like 'exemplo-%';

insert into usuarios (id, nome, email, criado_em, ultimo_acesso_em) values
  ('exemplo-ana',  'Ana',  'ana@exemplo.com',  now() - interval '10 days', now() - interval '1 hour'),
  ('exemplo-beto', 'Beto', 'beto@exemplo.com', now() - interval '7 days',  now() - interval '2 days'),
  ('exemplo-caio', 'Caio', 'caio@exemplo.com', now() - interval '3 days',  now() - interval '3 days');

insert into sessoes (id, usuario_id, iniciada_em, encerrada_em, plataforma, versao_app) values
  ('00000000-0000-4000-8000-000000000001', 'exemplo-ana',  now() - interval '2 days', now() - interval '2 days' + interval '20 minutes', 'mobile',  '1.0.0'),
  ('00000000-0000-4000-8000-000000000002', 'exemplo-ana',  now() - interval '1 hour', null,                                            'mobile',  '1.0.0'),
  ('00000000-0000-4000-8000-000000000003', 'exemplo-beto', now() - interval '2 days', now() - interval '2 days' + interval '35 minutes', 'desktop', '1.0.0'),
  ('00000000-0000-4000-8000-000000000004', 'exemplo-caio', now() - interval '3 days', now() - interval '3 days' + interval '5 minutes',  'mobile',  '1.0.0');

insert into partidas (id, sessao_id, usuario_id, cor_id, tema, iniciada_em, encerrada_em, duracao_ms, pontos, causa_fim, chocolates, comprimento_final, colunas, linhas) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'exemplo-ana',  'default', 'magenta', now() - interval '2 days',               now() - interval '2 days' + interval '90 seconds',  88000, 12, 'tail',      1, 14, 15, 26),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'exemplo-ana',  'preto',   'lime',    now() - interval '2 days' + interval '5 minutes', now() - interval '2 days' + interval '7 minutes', 118000, 18, 'chocolate', 3, 20, 15, 26),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'exemplo-ana',  'preto',   'teal',    now() - interval '50 minutes',           now() - interval '49 minutes',                       41000,  4, 'abandono',  0,  6, 15, 26),
  ('00000000-0000-4000-9000-000000000004', '00000000-0000-4000-8000-000000000003', 'exemplo-beto', 'marrom',  'amber',   now() - interval '2 days',               now() - interval '2 days' + interval '3 minutes',  176000, 25, 'bomb',      2, 26, 32, 18),
  ('00000000-0000-4000-9000-000000000005', '00000000-0000-4000-8000-000000000003', 'exemplo-beto', 'marrom',  'purple',  now() - interval '2 days' + interval '10 minutes', now() - interval '2 days' + interval '11 minutes', 52000, 7, 'tail',  0,  9, 32, 18),
  ('00000000-0000-4000-9000-000000000006', '00000000-0000-4000-8000-000000000004', 'exemplo-caio', 'branco',  'yellow',  now() - interval '3 days',               now() - interval '3 days' + interval '40 seconds',   38000,  3, 'tail',      0,  5, 15, 26);

insert into partida_petiscos (partida_id, tipo, quantidade) values
  ('00000000-0000-4000-9000-000000000001', 'bone', 5), ('00000000-0000-4000-9000-000000000001', 'beef', 2),
  ('00000000-0000-4000-9000-000000000001', 'watermelon', 1), ('00000000-0000-4000-9000-000000000001', 'chocolate', 1),
  ('00000000-0000-4000-9000-000000000002', 'strawberry', 6), ('00000000-0000-4000-9000-000000000002', 'beef', 3),
  ('00000000-0000-4000-9000-000000000002', 'watermelon', 2), ('00000000-0000-4000-9000-000000000002', 'chocolate', 3),
  ('00000000-0000-4000-9000-000000000003', 'banana', 4),
  ('00000000-0000-4000-9000-000000000004', 'bone', 9), ('00000000-0000-4000-9000-000000000004', 'beef', 5),
  ('00000000-0000-4000-9000-000000000004', 'watermelon', 2), ('00000000-0000-4000-9000-000000000004', 'chocolate', 2),
  ('00000000-0000-4000-9000-000000000004', 'bomb', 1),
  ('00000000-0000-4000-9000-000000000005', 'avocado', 5), ('00000000-0000-4000-9000-000000000005', 'beef', 1),
  ('00000000-0000-4000-9000-000000000006', 'bone', 3);

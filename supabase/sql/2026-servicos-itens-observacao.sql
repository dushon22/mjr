create table if not exists servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null check (categoria in ('automotivo', 'arquitetonico')),
  unidade text not null check (unidade in ('un', 'm2')) default 'un',
  preco numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists agendamento_itens (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  servico_id uuid references servicos(id) on delete set null,
  quantidade numeric not null default 1,
  valor numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table clientes add column if not exists observacao text;
alter table agendamentos add column if not exists observacao text;
alter table agendamentos add column if not exists categoria text;

-- Ajuste as policies de RLS abaixo para espelhar exatamente o que já existe
-- em `tipos_pelicula`/`agendamentos` no seu projeto (aqui assumo "usuário
-- autenticado tem acesso total", que é o padrão mais comum neste tipo de app):
alter table servicos enable row level security;
alter table agendamento_itens enable row level security;
create policy "authenticated full access" on servicos for all to authenticated using (true) with check (true);
create policy "authenticated full access" on agendamento_itens for all to authenticated using (true) with check (true);

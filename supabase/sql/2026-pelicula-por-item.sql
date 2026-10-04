-- Película passa a ser por item do agendamento.
-- agendamentos.tipo_id continua existindo e recebe a película do primeiro item.
alter table agendamento_itens
  add column if not exists tipo_pelicula_id uuid references tipos_pelicula(id) on delete set null;

-- Itens antigos herdam a película do agendamento (o app também faz esse fallback).
update agendamento_itens i
set tipo_pelicula_id = a.tipo_id
from agendamentos a
where i.agendamento_id = a.id
  and i.tipo_pelicula_id is null;

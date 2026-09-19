-- Independent, anonymous browser participation estimate. No questions are stored.
begin;
create table if not exists public.astro_card_participants (
  visitor_id uuid primary key
);
create table if not exists public.astro_card_stats (
  id smallint primary key check (id = 1),
  participant_count bigint not null check (participant_count >= 1588)
);
insert into public.astro_card_stats (id, participant_count) values (1, 1588)
on conflict (id) do nothing;

alter table public.astro_card_participants enable row level security;
alter table public.astro_card_stats enable row level security;
revoke all on public.astro_card_participants, public.astro_card_stats from public, anon, authenticated;

create or replace function public.get_astro_card_participant_count()
returns bigint language sql stable security definer set search_path = ''
as $$ select participant_count from public.astro_card_stats where id = 1; $$;

create or replace function public.record_astro_card_participant(p_visitor_id uuid)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare inserted integer;
begin
  if p_visitor_id is null then
    raise exception 'Visitor identifier required' using errcode = '22023';
  end if;
  insert into public.astro_card_participants (visitor_id) values (p_visitor_id)
  on conflict (visitor_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    update public.astro_card_stats set participant_count = participant_count + 1 where id = 1;
  end if;
  return (select participant_count from public.astro_card_stats where id = 1);
end;
$$;
revoke all on function public.get_astro_card_participant_count() from public;
revoke all on function public.record_astro_card_participant(uuid) from public;
grant execute on function public.get_astro_card_participant_count() to anon, authenticated;
grant execute on function public.record_astro_card_participant(uuid) to anon, authenticated;
comment on table public.astro_card_stats is 'Browser participation estimate with configured starting offset 1588; not verified historical people.';
commit;

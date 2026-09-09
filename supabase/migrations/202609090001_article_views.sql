-- 放心占星相談所：公開文章瀏覽數
-- 訪客僅能透過受控函式讀取或累加計數，不能直接操作資料表。

create table if not exists public.article_views (
  slug text primary key,
  view_count bigint not null default 0 check (view_count >= 0),
  updated_at timestamptz not null default now()
);

-- 上線前由網站負責人提供的歷史瀏覽量；既有數字較高時不會被下修。
insert into public.article_views (slug, view_count)
values
  ('classical-vs-modern-astrology', 880),
  ('classical-astrology-for-beginners', 332),
  ('how-to-read-natal-chart', 996),
  ('what-is-rising-sign', 868),
  ('why-ancients-believed-astrology', 118)
on conflict (slug) do update
set view_count = greatest(public.article_views.view_count, excluded.view_count),
    updated_at = case
      when public.article_views.view_count < excluded.view_count then now()
      else public.article_views.updated_at
    end;

alter table public.article_views enable row level security;
revoke all on table public.article_views from anon, authenticated;

create or replace function public.is_known_article_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_slug = any (array[
    'my-zodiac-sign-does-not-fit-me',
    'why-ancients-believed-astrology',
    'what-is-rising-sign',
    'how-to-read-natal-chart',
    'classical-astrology-for-beginners',
    'classical-vs-modern-astrology'
  ]::text[]);
$$;

create or replace function public.get_article_view_count(p_slug text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_known_article_slug(p_slug)
      then coalesce((select view_count from public.article_views where slug = p_slug), 0)
    else 0
  end;
$$;

create or replace function public.increment_article_view(p_slug text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_count bigint;
begin
  if not public.is_known_article_slug(p_slug) then
    raise exception 'Unknown article slug' using errcode = '22023';
  end if;

  insert into public.article_views (slug, view_count, updated_at)
  values (p_slug, 1, now())
  on conflict (slug) do update
    set view_count = public.article_views.view_count + 1,
        updated_at = now()
  returning view_count into next_count;

  return next_count;
end;
$$;

revoke all on function public.is_known_article_slug(text) from public;
revoke all on function public.get_article_view_count(text) from public;
revoke all on function public.increment_article_view(text) from public;
grant execute on function public.get_article_view_count(text) to anon, authenticated;
grant execute on function public.increment_article_view(text) to anon, authenticated;

comment on table public.article_views is '公開文章累計瀏覽數；只能透過受控 RPC 存取。';

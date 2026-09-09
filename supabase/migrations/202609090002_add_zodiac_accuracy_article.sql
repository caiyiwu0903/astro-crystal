-- 新增「我的星座不像我，占星是不是不準？」文章瀏覽數。

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

revoke all on function public.is_known_article_slug(text) from public;

insert into public.article_views (slug, view_count)
values ('my-zodiac-sign-does-not-fit-me', 0)
on conflict (slug) do nothing;

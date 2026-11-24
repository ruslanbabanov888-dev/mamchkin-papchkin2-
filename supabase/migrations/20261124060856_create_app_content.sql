create table if not exists public.app_content (
  content_key text not null,
  version integer not null check (version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_key, version)
);

create index if not exists app_content_published_lookup_idx
  on public.app_content (content_key, published, version desc);

alter table public.app_content enable row level security;

drop policy if exists "published app content is readable" on public.app_content;
create policy "published app content is readable"
  on public.app_content
  for select
  to anon, authenticated
  using (published = true and (published_at is null or published_at <= now()));

revoke all on table public.app_content from public, anon, authenticated;
grant select on table public.app_content to anon, authenticated;

comment on table public.app_content is
  'Versioned, public read-only application content. Never store personal family data or media here.';
comment on column public.app_content.payload is
  'Public JSON content only: game cards, deck metadata, rules, and shared templates. No personal data.';

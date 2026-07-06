-- ============================================================================
-- EchoHive — Incremental migration: image/video uploads for posts & comments
-- ----------------------------------------------------------------------------
-- Safe to run on an EXISTING database that already has the base schema from
-- echohive_schema.sql. Does not drop or touch any existing data.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- ============================================================================

-- 1. Media type enum
do $$ begin
    create type public.media_type as enum ('image', 'video');
exception when duplicate_object then null; end $$;

-- 2. Post media gallery table
create table if not exists public.post_media (
    media_id   bigserial          primary key,
    post_id    bigint             not null references public.posts(post_id) on delete cascade,
    url        text               not null,
    type       public.media_type  not null,
    position   int                not null default 0,
    created_at timestamptz        not null default now()
);

create index if not exists post_media_post_idx on public.post_media (post_id, position);

alter table public.post_media enable row level security;

drop policy if exists "post_media: public read" on public.post_media;
create policy "post_media: public read"
    on public.post_media for select to anon, authenticated
    using (exists (select 1 from public.posts p
                   where p.post_id = post_media.post_id and p.is_deleted = false));

drop policy if exists "post_media: author insert" on public.post_media;
create policy "post_media: author insert"
    on public.post_media for insert to authenticated
    with check (
        exists (select 1 from public.posts p
                where p.post_id = post_media.post_id
                  and p.user_id = auth.uid())
        and not public.is_banned()
    );

drop policy if exists "post_media: author delete" on public.post_media;
create policy "post_media: author delete"
    on public.post_media for delete to authenticated
    using (exists (select 1 from public.posts p
                   where p.post_id = post_media.post_id and p.user_id = auth.uid()));

drop policy if exists "post_media: admin moderate" on public.post_media;
create policy "post_media: admin moderate"
    on public.post_media for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- 3. Single media attachment on comments
alter table public.comments add column if not exists media_url  text;
alter table public.comments add column if not exists media_type public.media_type;

do $$ begin
    alter table public.comments
        add constraint comments_media_pair_chk check ((media_url is null) = (media_type is null));
exception when duplicate_object then null; end $$;

-- 4. Storage bucket for uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'media', 'media', true, 52428800,
    array['image/png','image/jpeg','image/gif','image/webp','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media: public read" on storage.objects;
create policy "media: public read"
    on storage.objects for select to anon, authenticated
    using (bucket_id = 'media');

drop policy if exists "media: owner upload" on storage.objects;
create policy "media: owner upload"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'media'
        and (storage.foldername(name))[1] = auth.uid()::text
        and not public.is_banned()
    );

drop policy if exists "media: owner delete" on storage.objects;
create policy "media: owner delete"
    on storage.objects for delete to authenticated
    using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- EchoHive — Incremental migration: profile picture uploads
-- ----------------------------------------------------------------------------
-- Safe to run on an EXISTING database (already has base schema +
-- echohive_media_migration.sql applied). Does not drop or touch existing data.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- ============================================================================

-- 1. Avatar column on profiles
alter table public.profiles add column if not exists avatar_url text;

-- 2. Expose it on the feed view so post cards can show the author's photo
create or replace view public.feed_posts as
    select
        p.post_id,
        p.title,
        p.content,
        p.reaction_count,
        p.comment_count,
        p.view_count,
        p.repost_count,
        p.created_at,
        p.updated_at,
        pr.user_id      as author_id,
        pr.username     as author_username,
        pr.display_name as author_display,
        pr.university,
        pr.year_of_study,
        c.category_id,
        c.slug          as category_slug,
        c.name          as category_name,
        c.color_hex     as category_color,
        pr.avatar_url   as author_avatar_url
    from public.posts p
    join public.profiles   pr on pr.user_id = p.user_id
    join public.categories c  on c.category_id = p.category_id
    where p.is_deleted = false;

-- Note: profile photos reuse the "media" storage bucket and its existing
-- owner-folder RLS policies from echohive_media_migration.sql — no new
-- bucket or storage policy needed.

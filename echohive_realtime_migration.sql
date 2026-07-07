-- ============================================================================
-- EchoHive — Incremental migration: enable realtime on posts & comments
-- ----------------------------------------------------------------------------
-- Supabase only streams postgres_changes for tables explicitly added to the
-- "supabase_realtime" publication. Existing RLS policies on these tables
-- still apply — a client only receives change events for rows it's allowed
-- to select. Safe to run on an existing database; touches no data.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- ============================================================================

do $$ begin
    alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; end $$;

do $$ begin
    alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null; end $$;

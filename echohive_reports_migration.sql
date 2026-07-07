-- ============================================================================
-- EchoHive — Incremental migration: report/flag content
-- ----------------------------------------------------------------------------
-- Safe to run on an existing database. Adds one new table only.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- ============================================================================

create table if not exists public.reports (
    report_id   bigserial   primary key,
    post_id     bigint      references public.posts(post_id) on delete cascade,
    comment_id  bigint      references public.comments(comment_id) on delete cascade,
    reporter_id uuid        not null references public.profiles(user_id) on delete cascade,
    reason      text        not null check (char_length(reason) between 1 and 60),
    details     text        check (details is null or char_length(details) <= 500),
    status      text        not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
    created_at  timestamptz not null default now(),
    check ((post_id is not null) or (comment_id is not null))
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports: reporter insert" on public.reports;
create policy "reports: reporter insert"
    on public.reports for insert to authenticated
    with check (reporter_id = auth.uid() and not public.is_banned());

drop policy if exists "reports: reporter read own" on public.reports;
create policy "reports: reporter read own"
    on public.reports for select to authenticated
    using (reporter_id = auth.uid());

drop policy if exists "reports: admin manage" on public.reports;
create policy "reports: admin manage"
    on public.reports for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

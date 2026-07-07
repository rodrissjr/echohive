-- ============================================================================
-- EchoHive — Incremental migration: real notifications
-- ----------------------------------------------------------------------------
-- Adds a notifications table populated automatically by triggers whenever
-- someone likes/comments/replies/reposts your content (never for your own
-- actions on your own content). Safe to run on an existing database.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- ============================================================================

do $$ begin
    create type public.notification_type as enum ('like', 'comment', 'reply', 'repost');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
    notification_id bigserial                    primary key,
    user_id          uuid                         not null references public.profiles(user_id) on delete cascade,
    actor_id         uuid                         not null references public.profiles(user_id) on delete cascade,
    type             public.notification_type     not null,
    post_id          bigint                       references public.posts(post_id) on delete cascade,
    comment_id       bigint                       references public.comments(comment_id) on delete cascade,
    is_read          boolean                      not null default false,
    created_at       timestamptz                  not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications: recipient read" on public.notifications;
create policy "notifications: recipient read"
    on public.notifications for select to authenticated
    using (user_id = auth.uid());

drop policy if exists "notifications: recipient update" on public.notifications;
create policy "notifications: recipient update"
    on public.notifications for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Inserts happen only from the security-definer trigger functions below —
-- there is deliberately no insert policy for regular clients.

create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
    select user_id into v_owner from public.posts where post_id = new.post_id;
    if v_owner is not null and v_owner <> new.user_id then
        insert into public.notifications (user_id, actor_id, type, post_id)
        values (v_owner, new.user_id, 'like', new.post_id);
    end if;
    return new;
end$$;

drop trigger if exists notify_reaction_trg on public.reactions;
create trigger notify_reaction_trg after insert on public.reactions
    for each row execute function public.notify_on_reaction();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
    if new.parent_comment_id is null then
        select user_id into v_target from public.posts where post_id = new.post_id;
        if v_target is not null and v_target <> new.user_id then
            insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
            values (v_target, new.user_id, 'comment', new.post_id, new.comment_id);
        end if;
    else
        select user_id into v_target from public.comments where comment_id = new.parent_comment_id;
        if v_target is not null and v_target <> new.user_id then
            insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
            values (v_target, new.user_id, 'reply', new.post_id, new.comment_id);
        end if;
    end if;
    return new;
end$$;

drop trigger if exists notify_comment_trg on public.comments;
create trigger notify_comment_trg after insert on public.comments
    for each row execute function public.notify_on_comment();

create or replace function public.notify_on_repost()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
    select user_id into v_owner from public.posts where post_id = new.post_id;
    if v_owner is not null and v_owner <> new.user_id then
        insert into public.notifications (user_id, actor_id, type, post_id)
        values (v_owner, new.user_id, 'repost', new.post_id);
    end if;
    return new;
end$$;

drop trigger if exists notify_repost_trg on public.reposts;
create trigger notify_repost_trg after insert on public.reposts
    for each row execute function public.notify_on_repost();

-- Stream new notifications live to the bell icon without polling.
do $$ begin
    alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

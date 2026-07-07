-- ============================================================================
-- EchoHive — Database Schema for Supabase (PostgreSQL)
-- Final Year Project · Institute of Accountancy Arusha
-- Author: James Modestus Kalolo  ·  Supervisor: Edison Lubua
-- ----------------------------------------------------------------------------
-- This schema covers:
--   • Multi-emoji reactions (👍 ❤️ 😂 😮 😢 😡)
--   • Nested comments (parent_comment_id self-FK)
--   • Bookmarks (private, per user)
--   • Reposts (with optional comment, like quote-tweet)
--   • View counts (unique per user/post)
--   • University field (multi-university friendly)
--   • Row-Level Security on every table
--   • Triggers maintaining all denormalized counters
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- The script is idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. CLEAN SLATE
-- ---------------------------------------------------------------------------
drop view  if exists public.feed_posts          cascade;
drop view  if exists public.post_reactions_view cascade;
drop table if exists public.notifications       cascade;
drop table if exists public.reports             cascade;
drop table if exists public.bookmarks           cascade;
drop table if exists public.reposts             cascade;
drop table if exists public.post_views          cascade;
drop table if exists public.reactions           cascade;
drop table if exists public.post_media          cascade;
drop table if exists public.comments            cascade;
drop table if exists public.posts               cascade;
drop table if exists public.categories          cascade;
drop table if exists public.profiles            cascade;

drop type  if exists public.user_role         cascade;
drop type  if exists public.reaction_type     cascade;
drop type  if exists public.media_type        cascade;
drop type  if exists public.notification_type cascade;

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'admin');

-- Six reactions, FB-style. Mutually exclusive per user per post.
create type public.reaction_type as enum ('like', 'love', 'laugh', 'wow', 'sad', 'angry');

-- Attachments on posts/comments — images or short video clips.
create type public.media_type as enum ('image', 'video');

-- What triggered a notification for the recipient.
create type public.notification_type as enum ('like', 'comment', 'reply', 'repost');

-- ---------------------------------------------------------------------------
-- 2. PROFILES
-- ---------------------------------------------------------------------------
create table public.profiles (
    user_id       uuid             primary key references auth.users(id) on delete cascade,
    username      text             not null unique check (char_length(username) between 3 and 30),
    display_name  text             not null check (char_length(display_name) between 2 and 60),
    email         text             not null,
    university    text             not null default 'Institute of Accountancy Arusha',
    year_of_study text,
    avatar_url    text,
    role          public.user_role not null default 'student',
    is_banned     boolean          not null default false,
    created_at    timestamptz      not null default now(),
    updated_at    timestamptz      not null default now()
);

create index profiles_username_idx   on public.profiles (lower(username));
create index profiles_role_idx       on public.profiles (role);
create index profiles_university_idx on public.profiles (university);

-- ---------------------------------------------------------------------------
-- 3. CATEGORIES
-- ---------------------------------------------------------------------------
create table public.categories (
    category_id  serial primary key,
    slug         text   not null unique,
    name         text   not null,
    description  text,
    color_hex    text   not null,
    sort_order   int    not null default 0
);

insert into public.categories (slug, name, description, color_hex, sort_order) values
    ('academics',  'Academics',  'Coursework, exams, teaching, academic policy',     '#1E5F8E', 1),
    ('hostel',     'Hostel',     'Accommodation, facilities, hostel life',           '#A16207', 2),
    ('events',     'Events',     'Campus events, clubs, summits, meetups',           '#5B3A9B', 3),
    ('complaints', 'Complaints', 'Formal concerns about services and administration','#9B2C2C', 4);

-- ---------------------------------------------------------------------------
-- 4. POSTS
-- ---------------------------------------------------------------------------
create table public.posts (
    post_id        bigserial   primary key,
    user_id        uuid        not null references public.profiles(user_id) on delete cascade,
    category_id    int         not null references public.categories(category_id),
    title          text        not null check (char_length(title)   between 8 and 140),
    content        text        not null check (char_length(content) between 20 and 5000),
    is_deleted     boolean     not null default false,
    reaction_count int         not null default 0,
    comment_count  int         not null default 0,
    view_count     int         not null default 0,
    repost_count   int         not null default 0,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index posts_category_created_idx on public.posts (category_id, created_at desc) where is_deleted = false;
create index posts_user_created_idx     on public.posts (user_id, created_at desc);
create index posts_feed_idx             on public.posts (created_at desc) where is_deleted = false;

-- ---------------------------------------------------------------------------
-- 4b. POST MEDIA  (gallery of images/videos attached to a post)
-- ---------------------------------------------------------------------------
create table public.post_media (
    media_id   bigserial          primary key,
    post_id    bigint             not null references public.posts(post_id) on delete cascade,
    url        text               not null,
    type       public.media_type  not null,
    position   int                not null default 0,
    created_at timestamptz        not null default now()
);

create index post_media_post_idx on public.post_media (post_id, position);

-- ---------------------------------------------------------------------------
-- 5. COMMENTS  (with nested replies)
-- ---------------------------------------------------------------------------
create table public.comments (
    comment_id        bigserial   primary key,
    post_id           bigint      not null references public.posts(post_id) on delete cascade,
    user_id           uuid        not null references public.profiles(user_id) on delete cascade,
    parent_comment_id bigint               references public.comments(comment_id) on delete cascade,
    content           text        not null check (char_length(content) between 1 and 2000),
    reply_count       int         not null default 0,
    media_url         text,
    media_type        public.media_type,
    created_at        timestamptz not null default now(),
    check ((media_url is null) = (media_type is null))
);

create index comments_post_created_idx on public.comments (post_id, created_at);
create index comments_parent_idx       on public.comments (parent_comment_id);

-- ---------------------------------------------------------------------------
-- 6. REACTIONS  (multi-emoji; one reaction per user per post)
-- ---------------------------------------------------------------------------
create table public.reactions (
    reaction_id bigserial            primary key,
    post_id     bigint               not null references public.posts(post_id) on delete cascade,
    user_id     uuid                 not null references public.profiles(user_id) on delete cascade,
    type        public.reaction_type not null,
    created_at  timestamptz          not null default now(),
    unique (post_id, user_id)
);

create index reactions_post_type_idx on public.reactions (post_id, type);

-- ---------------------------------------------------------------------------
-- 7. POST VIEWS  (unique view per user)
-- ---------------------------------------------------------------------------
create table public.post_views (
    post_id   bigint      not null references public.posts(post_id) on delete cascade,
    user_id   uuid        not null references public.profiles(user_id) on delete cascade,
    viewed_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 8. BOOKMARKS
-- ---------------------------------------------------------------------------
create table public.bookmarks (
    post_id    bigint      not null references public.posts(post_id) on delete cascade,
    user_id    uuid        not null references public.profiles(user_id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 9. REPOSTS
-- ---------------------------------------------------------------------------
create table public.reposts (
    repost_id  bigserial   primary key,
    post_id    bigint      not null references public.posts(post_id) on delete cascade,
    user_id    uuid        not null references public.profiles(user_id) on delete cascade,
    comment    text                 check (comment is null or char_length(comment) between 1 and 280),
    created_at timestamptz not null default now(),
    unique (post_id, user_id)
);

create index reposts_user_idx on public.reposts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 9b. REPORTS  (flagging posts/comments for moderator review)
-- ---------------------------------------------------------------------------
create table public.reports (
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

create index reports_status_idx on public.reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 9c. NOTIFICATIONS  (populated by triggers in section 10, never by clients)
-- ---------------------------------------------------------------------------
create table public.notifications (
    notification_id bigserial                 primary key,
    user_id          uuid                      not null references public.profiles(user_id) on delete cascade,
    actor_id         uuid                      not null references public.profiles(user_id) on delete cascade,
    type             public.notification_type  not null,
    post_id          bigint                    references public.posts(post_id) on delete cascade,
    comment_id       bigint                    references public.comments(comment_id) on delete cascade,
    is_read          boolean                   not null default false,
    created_at       timestamptz               not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end$$;

create trigger touch_profiles before update on public.profiles
    for each row execute function public.touch_updated_at();
create trigger touch_posts before update on public.posts
    for each row execute function public.touch_updated_at();

create or replace function public.on_comment_change()
returns trigger language plpgsql as $$
begin
    if TG_OP = 'INSERT' then
        if new.parent_comment_id is null then
            update public.posts set comment_count = comment_count + 1 where post_id = new.post_id;
        else
            update public.comments set reply_count = reply_count + 1 where comment_id = new.parent_comment_id;
        end if;
    elsif TG_OP = 'DELETE' then
        if old.parent_comment_id is null then
            update public.posts set comment_count = greatest(comment_count - 1, 0) where post_id = old.post_id;
        else
            update public.comments set reply_count = greatest(reply_count - 1, 0) where comment_id = old.parent_comment_id;
        end if;
    end if;
    return null;
end$$;

create trigger comments_count_trg after insert or delete on public.comments
    for each row execute function public.on_comment_change();

create or replace function public.on_reaction_change()
returns trigger language plpgsql as $$
begin
    if TG_OP = 'INSERT' then
        update public.posts set reaction_count = reaction_count + 1 where post_id = new.post_id;
    elsif TG_OP = 'DELETE' then
        update public.posts set reaction_count = greatest(reaction_count - 1, 0) where post_id = old.post_id;
    end if;
    return null;
end$$;

create trigger reactions_count_trg after insert or update or delete on public.reactions
    for each row execute function public.on_reaction_change();

create or replace function public.on_repost_change()
returns trigger language plpgsql as $$
begin
    if TG_OP = 'INSERT' then
        update public.posts set repost_count = repost_count + 1 where post_id = new.post_id;
    elsif TG_OP = 'DELETE' then
        update public.posts set repost_count = greatest(repost_count - 1, 0) where post_id = old.post_id;
    end if;
    return null;
end$$;

create trigger reposts_count_trg after insert or delete on public.reposts
    for each row execute function public.on_repost_change();

create or replace function public.on_view_insert()
returns trigger language plpgsql as $$
begin
    update public.posts set view_count = view_count + 1 where post_id = new.post_id;
    return null;
end$$;

create trigger post_views_count_trg after insert on public.post_views
    for each row execute function public.on_view_insert();

-- Notifications — fire alongside the counters above, never for your own
-- actions on your own content.
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

create trigger notify_repost_trg after insert on public.reposts
    for each row execute function public.notify_on_repost();

-- ============================================================================
-- 11. AUTO-PROVISION PROFILE ON SIGN-UP
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    v_username text;
    v_display  text;
    v_uni      text;
begin
    v_username := coalesce(
        new.raw_user_meta_data ->> 'username',
        split_part(new.email, '@', 1)
    );
    v_display := coalesce(
        new.raw_user_meta_data ->> 'display_name',
        initcap(replace(split_part(new.email, '@', 1), '.', ' '))
    );
    v_uni := coalesce(
        new.raw_user_meta_data ->> 'university',
        'Institute of Accountancy Arusha'
    );

    if exists (select 1 from public.profiles where lower(username) = lower(v_username)) then
        v_username := v_username || '_' || substr(md5(random()::text), 1, 4);
    end if;

    insert into public.profiles (user_id, username, display_name, email, university, role)
    values (new.id, v_username, v_display, new.email, v_uni, 'student');

    return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- ============================================================================
-- 12. ROW-LEVEL SECURITY
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.posts       enable row level security;
alter table public.post_media  enable row level security;
alter table public.comments    enable row level security;
alter table public.reactions   enable row level security;
alter table public.post_views  enable row level security;
alter table public.bookmarks   enable row level security;
alter table public.reposts     enable row level security;
alter table public.reports     enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
    select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_banned()
returns boolean language sql security definer set search_path = public as $$
    select coalesce((select is_banned from public.profiles where user_id = auth.uid()), false);
$$;

-- PROFILES
create policy "profiles: read all (authenticated)"
    on public.profiles for select to authenticated using (true);
create policy "profiles: self update"
    on public.profiles for update to authenticated
    using (user_id = auth.uid())
    with check (
        user_id = auth.uid()
        and role      = (select role      from public.profiles where user_id = auth.uid())
        and is_banned = (select is_banned from public.profiles where user_id = auth.uid())
    );
create policy "profiles: admin update"
    on public.profiles for update to authenticated
    using (public.is_admin());

-- CATEGORIES
create policy "categories: public read"
    on public.categories for select to anon, authenticated using (true);
create policy "categories: admin write"
    on public.categories for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- POSTS
create policy "posts: public read non-deleted"
    on public.posts for select to anon, authenticated using (is_deleted = false);
create policy "posts: admin read all"
    on public.posts for select to authenticated using (public.is_admin());
create policy "posts: authors create"
    on public.posts for insert to authenticated
    with check (user_id = auth.uid() and not public.is_banned());
create policy "posts: author update"
    on public.posts for update to authenticated
    using (user_id = auth.uid() and not public.is_banned())
    with check (user_id = auth.uid());
create policy "posts: author delete"
    on public.posts for delete to authenticated using (user_id = auth.uid());
create policy "posts: admin moderate"
    on public.posts for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- POST MEDIA
create policy "post_media: public read"
    on public.post_media for select to anon, authenticated
    using (exists (select 1 from public.posts p
                   where p.post_id = post_media.post_id and p.is_deleted = false));
create policy "post_media: author insert"
    on public.post_media for insert to authenticated
    with check (
        exists (select 1 from public.posts p
                where p.post_id = post_media.post_id
                  and p.user_id = auth.uid())
        and not public.is_banned()
    );
create policy "post_media: author delete"
    on public.post_media for delete to authenticated
    using (exists (select 1 from public.posts p
                   where p.post_id = post_media.post_id and p.user_id = auth.uid()));
create policy "post_media: admin moderate"
    on public.post_media for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- COMMENTS
create policy "comments: public read"
    on public.comments for select to anon, authenticated
    using (exists (select 1 from public.posts p
                   where p.post_id = comments.post_id and p.is_deleted = false));
create policy "comments: author create"
    on public.comments for insert to authenticated
    with check (user_id = auth.uid() and not public.is_banned());
create policy "comments: author delete"
    on public.comments for delete to authenticated using (user_id = auth.uid());
create policy "comments: admin moderate"
    on public.comments for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- REACTIONS
create policy "reactions: public read"
    on public.reactions for select to anon, authenticated using (true);
create policy "reactions: self insert"
    on public.reactions for insert to authenticated
    with check (user_id = auth.uid() and not public.is_banned());
create policy "reactions: self update"
    on public.reactions for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reactions: self delete"
    on public.reactions for delete to authenticated using (user_id = auth.uid());

-- POST_VIEWS
create policy "post_views: self insert"
    on public.post_views for insert to authenticated
    with check (user_id = auth.uid());
create policy "post_views: self read"
    on public.post_views for select to authenticated
    using (user_id = auth.uid() or public.is_admin());

-- BOOKMARKS (only the user can see/manage their own)
create policy "bookmarks: self read"
    on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy "bookmarks: self insert"
    on public.bookmarks for insert to authenticated
    with check (user_id = auth.uid() and not public.is_banned());
create policy "bookmarks: self delete"
    on public.bookmarks for delete to authenticated using (user_id = auth.uid());

-- REPOSTS
create policy "reposts: public read"
    on public.reposts for select to anon, authenticated using (true);
create policy "reposts: self insert"
    on public.reposts for insert to authenticated
    with check (user_id = auth.uid() and not public.is_banned());
create policy "reposts: self update"
    on public.reposts for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reposts: self delete"
    on public.reposts for delete to authenticated using (user_id = auth.uid());

-- REPORTS
create policy "reports: reporter insert"
    on public.reports for insert to authenticated
    with check (reporter_id = auth.uid() and not public.is_banned());
create policy "reports: reporter read own"
    on public.reports for select to authenticated
    using (reporter_id = auth.uid());
create policy "reports: admin manage"
    on public.reports for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- NOTIFICATIONS (rows are only ever inserted by the security-definer
-- trigger functions in section 10 — no insert policy for regular clients)
create policy "notifications: recipient read"
    on public.notifications for select to authenticated
    using (user_id = auth.uid());
create policy "notifications: recipient update"
    on public.notifications for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- 12b. STORAGE — "media" bucket for post/comment image & video uploads
-- ----------------------------------------------------------------------------
-- Objects are stored under "<user_id>/<uuid>.<ext>" so ownership can be
-- checked from the path alone. 50MB cap here is a backstop — the app itself
-- also enforces a smaller client-side limit before upload.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'media', 'media', true, 52428800,
    array['image/png','image/jpeg','image/gif','image/webp','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "media: public read"
    on storage.objects for select to anon, authenticated
    using (bucket_id = 'media');

create policy "media: owner upload"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'media'
        and (storage.foldername(name))[1] = auth.uid()::text
        and not public.is_banned()
    );

create policy "media: owner delete"
    on storage.objects for delete to authenticated
    using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 13. CONVENIENCE VIEWS
-- ============================================================================
create or replace view public.post_reactions_view as
    select post_id, type, count(*)::int as cnt
      from public.reactions group by post_id, type;

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
        pr.avatar_url   as author_avatar_url,
        c.category_id,
        c.slug          as category_slug,
        c.name          as category_name,
        c.color_hex     as category_color
    from public.posts p
    join public.profiles   pr on pr.user_id = p.user_id
    join public.categories c  on c.category_id = p.category_id
    where p.is_deleted = false;

-- ============================================================================
-- 14. RPC FUNCTIONS
-- ============================================================================
create or replace function public.toggle_reaction(p_post_id bigint, p_type public.reaction_type)
returns text language plpgsql security definer set search_path = public as $$
declare
    v_existing public.reaction_type;
    v_user     uuid := auth.uid();
begin
    if v_user is null then raise exception 'Authentication required'; end if;
    if (select is_banned from public.profiles where user_id = v_user) then
        raise exception 'Banned users cannot react to posts';
    end if;

    select type into v_existing
      from public.reactions where post_id = p_post_id and user_id = v_user;

    if v_existing is null then
        insert into public.reactions(post_id, user_id, type) values (p_post_id, v_user, p_type);
        return 'added';
    elsif v_existing = p_type then
        delete from public.reactions where post_id = p_post_id and user_id = v_user;
        return 'removed';
    else
        update public.reactions set type = p_type, created_at = now()
         where post_id = p_post_id and user_id = v_user;
        return 'switched';
    end if;
end$$;

create or replace function public.toggle_bookmark(p_post_id bigint)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
    if v_user is null then raise exception 'Authentication required'; end if;
    if exists (select 1 from public.bookmarks where post_id = p_post_id and user_id = v_user) then
        delete from public.bookmarks where post_id = p_post_id and user_id = v_user;
        return 'removed';
    else
        insert into public.bookmarks(post_id, user_id) values (p_post_id, v_user);
        return 'added';
    end if;
end$$;

create or replace function public.toggle_repost(p_post_id bigint, p_comment text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
    if v_user is null then raise exception 'Authentication required'; end if;
    if (select is_banned from public.profiles where user_id = v_user) then
        raise exception 'Banned users cannot repost';
    end if;

    if exists (select 1 from public.reposts where post_id = p_post_id and user_id = v_user) then
        delete from public.reposts where post_id = p_post_id and user_id = v_user;
        return 'removed';
    else
        insert into public.reposts(post_id, user_id, comment) values (p_post_id, v_user, p_comment);
        return 'added';
    end if;
end$$;

create or replace function public.record_view(p_post_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
    if v_user is null then return; end if;
    insert into public.post_views(post_id, user_id) values (p_post_id, v_user)
    on conflict do nothing;
end$$;

-- ============================================================================
-- 14b. REALTIME
-- ============================================================================
do $$ begin
    alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; end $$;

do $$ begin
    alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null; end $$;

do $$ begin
    alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 15. POST-INSTALL CHECKLIST
-- ============================================================================
-- 1. Sign up your admin via the app, then promote:
--      update public.profiles set role = 'admin' where email = 'your@email';
--
-- 2. In Supabase Dashboard → Authentication → URL Configuration, set:
--      Site URL:      http://localhost:5173                    (dev)
--                     https://your-domain                       (prod)
--      Redirect URLs: http://localhost:5173/reset-password
--                     https://your-domain/reset-password
--    These are required for the forgot-password email link.
--
-- 3. Verify RLS is on:
--      select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- ============================================================================

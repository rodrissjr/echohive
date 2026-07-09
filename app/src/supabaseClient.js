// ============================================================================
// EchoHive — Supabase Integration Layer
// ----------------------------------------------------------------------------
// All functions the React app needs to talk to Supabase.
//
// Install:   npm install @supabase/supabase-js
//
// Environment variables (.env.local at project root):
//    VITE_SUPABASE_URL=https://apubiuguwshjgrtkolyc.supabase.co
//    VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_By8vuOCXzWBGozWCp93ZPQ_b65Bu_jf
//
// The publishable key is meant to be public — RLS policies enforce security.
// NEVER put the sb_secret_ key in this file or any frontend env var.
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// 1. CLIENT
// ---------------------------------------------------------------------------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
                  || import.meta.env.VITE_SUPABASE_ANON_KEY; // fallback if older naming

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
    },
});

// ---------------------------------------------------------------------------
// 2. AUTH — sign up, sign in, sign out, current user, listener
// ---------------------------------------------------------------------------
export async function signUp({ email, password, username, displayName, university }) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                display_name: displayName,
                university,
            },
            // Where Supabase sends the user after they click the confirmation
            // link — works for local dev, Vercel previews, and production
            // alike as long as this origin is in the Auth "Redirect URLs" list.
            emailRedirectTo: window.location.origin,
        },
    });
    if (error) throw error;
    return data;
}

// Re-sends the "confirm your email" link — used when a user is stuck on
// the "check your inbox" screen and didn't get (or lost) the first one.
export async function resendConfirmationEmail(email) {
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
}

export async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// ---------------------------------------------------------------------------
// 3. PASSWORD RESET FLOW
//    Step 1: user requests a reset email — sendPasswordResetEmail()
//    Step 2: user clicks the email link, lands on /reset-password
//    Step 3: app reads the auth code from the URL (Supabase handles this
//            automatically because detectSessionInUrl is true), then calls
//            updatePassword() to set the new password.
// ---------------------------------------------------------------------------
export async function sendPasswordResetEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
}

export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
}

// Returns { user, profile } — or null if no session
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
    if (error) throw error;

    return { user, profile };
}

export function onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });
}

// ---------------------------------------------------------------------------
// 3b. TWO-FACTOR AUTHENTICATION (TOTP, via Supabase Auth's built-in MFA —
//     no schema changes needed, factors live in Supabase's own auth tables)
// ---------------------------------------------------------------------------
export async function mfaListFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data.totp || [];
}

export async function mfaEnroll() {
    // A previously abandoned enrollment leaves an "unverified" factor behind,
    // which blocks re-enrolling with a cryptic "already exists" error since
    // factor friendly names must be unique per user. Clear those out first.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = (existing?.all || []).filter(
        (f) => f.factor_type === 'totp' && f.status === 'unverified',
    );
    await Promise.all(stale.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) throw error;
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function mfaVerifyCode(factorId, code) {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) throw error;
    return data;
}

export async function mfaUnenroll(factorId) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
}

// After signInWithPassword, a user with an enrolled factor is only at aal1
// (password-verified) — nextLevel comes back 'aal2' until they also pass a
// TOTP challenge. This tells the login flow whether to prompt for a code.
export async function mfaGetAssurance() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data;
}

// ---------------------------------------------------------------------------
// 4. CATEGORIES
// ---------------------------------------------------------------------------
export async function fetchCategories() {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
    if (error) throw error;
    return data;
}

// ---------------------------------------------------------------------------
// 4b. MEDIA — uploads to the public "media" storage bucket
// ---------------------------------------------------------------------------
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25MB per file

export async function uploadMedia(file) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isImage && !isVideo) throw new Error(`"${file.name}" is not an image or video`);
    if (file.size > MAX_MEDIA_BYTES) throw new Error(`"${file.name}" is larger than 25MB`);

    const ext = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
    });
    if (error) throw error;

    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return { url: data.publicUrl, type: isVideo ? 'video' : 'image' };
}

// Profile picture — always stored at a fixed path per user (upsert) so
// re-uploading replaces the old photo instead of piling up files.
export async function updateAvatar(file) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (!file.type.startsWith('image/')) throw new Error('Profile photo must be an image');
    if (file.size > MAX_MEDIA_BYTES) throw new Error('Image is larger than 25MB');

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('media').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
    });
    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from('media').getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateErr } = await supabase
        .from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id);
    if (updateErr) throw updateErr;

    return avatarUrl;
}

// ---------------------------------------------------------------------------
// 5. POSTS
//    Pulls feed_posts + the user's reaction & bookmark & repost state in
//    parallel queries, then stitches them into the shape the React UI uses.
// ---------------------------------------------------------------------------
export async function fetchFeed({ categorySlug = null, sort = 'recent', limit = 30, offset = 0 } = {}) {
    let query = supabase
        .from('feed_posts')
        .select('*')
        .range(offset, offset + limit - 1);

    if (categorySlug && categorySlug !== 'all') {
        query = query.eq('category_slug', categorySlug);
    }

    if (sort === 'popular') {
        query = query.order('reaction_count', { ascending: false });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data.length) return [];

    const postIds = data.map(p => p.post_id);
    const { data: { user } } = await supabase.auth.getUser();

    // Pull media attachments for every post in this page
    const { data: mediaRows } = await supabase
        .from('post_media')
        .select('post_id, url, type, position')
        .in('post_id', postIds)
        .order('position');
    const mediaByPost = {};
    for (const m of (mediaRows || [])) {
        (mediaByPost[m.post_id] ??= []).push({ url: m.url, type: m.type });
    }

    // The current user's own reaction, bookmark, and repost state
    let userReactions = {}, userBookmarks = new Set(), userReposts = new Set();
    if (user) {
        const [{ data: myRx }, { data: myBm }, { data: myRp }] = await Promise.all([
            supabase.from('reactions').select('post_id, type').in('post_id', postIds).eq('user_id', user.id),
            supabase.from('bookmarks').select('post_id').in('post_id', postIds).eq('user_id', user.id),
            supabase.from('reposts').select('post_id').in('post_id', postIds).eq('user_id', user.id),
        ]);
        userReactions = Object.fromEntries((myRx || []).map(r => [r.post_id, r.type]));
        userBookmarks = new Set((myBm || []).map(b => b.post_id));
        userReposts   = new Set((myRp || []).map(r => r.post_id));
    }

    return data.map(p => shapeFeedRow(p, {
        userReaction: userReactions[p.post_id] || null,
        media:        mediaByPost[p.post_id] || [],
        isBookmarked: userBookmarks.has(p.post_id),
        isReposted:   userReposts.has(p.post_id),
    }));
}

// Shared row -> app-shape mapper for both fetchFeed() and single-post lookups
// (e.g. hydrating a post that just arrived over realtime).
function shapeFeedRow(p, extra) {
    return {
        id:       p.post_id,
        title:    p.title,
        content:  p.content,
        category: p.category_slug,
        author: {
            id:         p.author_id,
            username:   p.author_username,
            display:    p.author_display,
            university: p.university,
            year:       p.year_of_study || '',
            avatarUrl:  p.author_avatar_url || null,
        },
        createdAt:    new Date(p.created_at).getTime(),
        likeCount:    p.reaction_count,
        userReaction: null,
        media:        [],
        comments:     p.comment_count,
        views:        p.view_count,
        reposts:      p.repost_count,
        isBookmarked: false,
        isReposted:   false,
        ...extra,
    };
}

// Fetches one post in the same shape fetchFeed() returns — used to hydrate
// a brand-new post that just arrived over the realtime "posts" channel.
export async function fetchPostById(postId) {
    const { data: p, error } = await supabase
        .from('feed_posts').select('*').eq('post_id', postId).single();
    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: mediaRows }, myRx, myBm, myRp] = await Promise.all([
        supabase.from('post_media').select('url, type').eq('post_id', postId).order('position'),
        user ? supabase.from('reactions').select('type').eq('post_id', postId).eq('user_id', user.id).maybeSingle() : { data: null },
        user ? supabase.from('bookmarks').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle() : { data: null },
        user ? supabase.from('reposts').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle() : { data: null },
    ]);

    return shapeFeedRow(p, {
        userReaction: myRx.data?.type || null,
        media:        (mediaRows || []).map(m => ({ url: m.url, type: m.type })),
        isBookmarked: !!myBm.data,
        isReposted:   !!myRp.data,
    });
}

export async function createPost({ title, content, categorySlug, mediaFiles = [] }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: cat, error: catErr } = await supabase
        .from('categories').select('category_id').eq('slug', categorySlug).single();
    if (catErr) throw catErr;

    const { data, error } = await supabase
        .from('posts')
        .insert({ user_id: user.id, category_id: cat.category_id, title, content })
        .select().single();
    if (error) throw error;

    if (mediaFiles.length) {
        const uploaded = await Promise.all(mediaFiles.map(uploadMedia));
        const rows = uploaded.map((m, i) => ({
            post_id: data.post_id,
            url: m.url,
            type: m.type,
            position: i,
        }));
        const { error: mediaErr } = await supabase.from('post_media').insert(rows);
        if (mediaErr) throw mediaErr;
    }

    return data;
}

export async function deletePost(postId) {
    const { error } = await supabase.from('posts').delete().eq('post_id', postId);
    if (error) throw error;
}

// ---------------------------------------------------------------------------
// 6. REACTIONS — uses the toggle_reaction RPC defined in the schema
// ---------------------------------------------------------------------------
export async function toggleReaction(postId, type) {
    const { data, error } = await supabase.rpc('toggle_reaction', {
        p_post_id: postId,
        p_type: type, // 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
    });
    if (error) throw error;
    return data; // 'added' | 'removed' | 'switched'
}

// ---------------------------------------------------------------------------
// 7. BOOKMARKS
// ---------------------------------------------------------------------------
export async function toggleBookmark(postId) {
    const { data, error } = await supabase.rpc('toggle_bookmark', { p_post_id: postId });
    if (error) throw error;
    return data; // 'added' | 'removed'
}

export async function fetchBookmarks() {
    // The RLS policy guarantees we only see our own bookmarks
    const { data, error } = await supabase
        .from('bookmarks')
        .select('post_id, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(b => b.post_id);
}

// ---------------------------------------------------------------------------
// 8. REPOSTS
// ---------------------------------------------------------------------------
export async function toggleRepost(postId, comment = null) {
    const { data, error } = await supabase.rpc('toggle_repost', {
        p_post_id: postId,
        p_comment: comment,
    });
    if (error) throw error;
    return data; // 'added' | 'removed'
}

// ---------------------------------------------------------------------------
// 9. VIEWS — call when user opens a post detail
// ---------------------------------------------------------------------------
export async function recordView(postId) {
    // The function is idempotent — only first view per user counts
    const { error } = await supabase.rpc('record_view', { p_post_id: postId });
    if (error) throw error;
}

// ---------------------------------------------------------------------------
// 10. COMMENTS — flat list with parent_comment_id; UI nests them
// ---------------------------------------------------------------------------
export async function fetchComments(postId) {
    const { data, error } = await supabase
        .from('comments')
        .select(`
            comment_id,
            content,
            created_at,
            parent_comment_id,
            user_id,
            media_url,
            media_type,
            profiles:profiles!user_id ( username, display_name, avatar_url )
        `)
        .eq('post_id', postId)
        .order('created_at');
    if (error) throw error;

    return data.map(c => ({
        id:       c.comment_id,
        postId,
        parentId: c.parent_comment_id,
        content:  c.content,
        createdAt: new Date(c.created_at).getTime(),
        media:    c.media_url ? { url: c.media_url, type: c.media_type } : null,
        author: {
            username:  c.profiles.username,
            display:   c.profiles.display_name,
            avatarUrl: c.profiles.avatar_url || null,
        },
    }));
}

export async function addComment(postId, content, parentCommentId = null, mediaFile = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const media = mediaFile ? await uploadMedia(mediaFile) : null;

    const { data, error } = await supabase
        .from('comments')
        .insert({
            post_id: postId,
            user_id: user.id,
            parent_comment_id: parentCommentId,
            content,
            media_url: media?.url ?? null,
            media_type: media?.type ?? null,
        })
        .select().single();
    if (error) throw error;
    return data;
}

// ---------------------------------------------------------------------------
// 11. ADMIN
// ---------------------------------------------------------------------------
export async function adminFetchUsers() {
    const { data, error } = await supabase
        .from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(u => ({
        id:         u.user_id,
        username:   u.username,
        display:    u.display_name,
        email:      u.email,
        university: u.university,
        role:       u.role,
        isBanned:   u.is_banned,
        createdAt:  new Date(u.created_at).getTime(),
    }));
}

export async function adminBanUser(userId, banned = true) {
    const { error } = await supabase
        .from('profiles').update({ is_banned: banned }).eq('user_id', userId);
    if (error) throw error;
}

// ---------------------------------------------------------------------------
// 11b. REPORTS — flagging posts/comments for moderator review
// ---------------------------------------------------------------------------
export async function reportContent({ postId = null, commentId = null, reason, details = null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('reports').insert({
        post_id: postId,
        comment_id: commentId,
        reporter_id: user.id,
        reason,
        details,
    });
    if (error) throw error;
}

export async function adminFetchReports({ status = 'open' } = {}) {
    let query = supabase
        .from('reports')
        .select(`
            report_id, reason, details, status, created_at, post_id, comment_id,
            reporter:profiles!reporter_id ( username, display_name ),
            post:posts!post_id ( post_id, title, user_id ),
            comment:comments!comment_id ( comment_id, content, post_id, user_id )
        `)
        .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return data.map(r => ({
        id:        r.report_id,
        reason:    r.reason,
        details:   r.details,
        status:    r.status,
        createdAt: new Date(r.created_at).getTime(),
        reporter:  { username: r.reporter.username, display: r.reporter.display_name },
        post:      r.post ? { id: r.post.post_id, title: r.post.title, authorId: r.post.user_id } : null,
        comment:   r.comment
            ? { id: r.comment.comment_id, content: r.comment.content, postId: r.comment.post_id, authorId: r.comment.user_id }
            : null,
    }));
}

export async function adminResolveReport(reportId, status) {
    const { error } = await supabase.from('reports').update({ status }).eq('report_id', reportId);
    if (error) throw error;
}

// ---------------------------------------------------------------------------
// 11c. NOTIFICATIONS — rows are inserted only by DB triggers (see schema),
//      never directly by the client.
// ---------------------------------------------------------------------------
export async function fetchNotifications(limit = 30) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('notifications')
        .select(`
            notification_id, type, post_id, comment_id, is_read, created_at,
            actor:profiles!actor_id ( username, display_name, avatar_url ),
            post:posts!post_id ( title )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;

    return data.map(n => ({
        id:        n.notification_id,
        type:      n.type,
        postId:    n.post_id,
        commentId: n.comment_id,
        isRead:    n.is_read,
        createdAt: new Date(n.created_at).getTime(),
        actor:     { username: n.actor.username, display: n.actor.display_name, avatarUrl: n.actor.avatar_url },
        postTitle: n.post?.title || null,
    }));
}

export async function markNotificationsRead(ids) {
    if (!ids.length) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).in('notification_id', ids);
    if (error) throw error;
}

// ---------------------------------------------------------------------------
// 12. REAL-TIME
//     Posts' engagement counters (reaction/comment/repost/view counts) are
//     denormalized onto the posts row by DB triggers, so a single
//     postgres_changes subscription on "posts" is enough to keep every
//     viewer's feed numbers live without polling.
// ---------------------------------------------------------------------------
export function subscribeToFeed({ onInsert, onUpdate, onDelete }) {
    const channel = supabase
        .channel('public:posts:feed')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'posts' },
            (payload) => onInsert?.(payload.new))
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'posts' },
            (payload) => onUpdate?.(payload.new))
        .on('postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'posts' },
            (payload) => onDelete?.(payload.old))
        .subscribe();
    return () => supabase.removeChannel(channel);
}

// New comments/replies on one open post, keyed by post_id.
export function subscribeToComments(postId, onInsert) {
    const channel = supabase
        .channel(`public:comments:${postId}`)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
            (payload) => onInsert(payload.new))
        .subscribe();
    return () => supabase.removeChannel(channel);
}

// New notification rows for one user — powers the live bell badge.
export function subscribeToNotifications(userId, onInsert) {
    const channel = supabase
        .channel(`public:notifications:${userId}`)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            (payload) => onInsert(payload.new))
        .subscribe();
    return () => supabase.removeChannel(channel);
}

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
        },
    });
    if (error) throw error;
    return data;
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

    // Pull reaction breakdown (everyone's reactions, grouped by type)
    const { data: rxBreakdown } = await supabase
        .from('post_reactions_view')
        .select('post_id, type, cnt')
        .in('post_id', postIds);

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

    // Build a per-post reaction breakdown { like:0, love:0, ... }
    const rxByPost = {};
    for (const row of (rxBreakdown || [])) {
        rxByPost[row.post_id] ??= { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 };
        rxByPost[row.post_id][row.type] = row.cnt;
    }

    return data.map(p => ({
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
        reactions:    rxByPost[p.post_id] || { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
        userReaction: userReactions[p.post_id] || null,
        media:        mediaByPost[p.post_id] || [],
        comments:     p.comment_count,
        views:        p.view_count,
        reposts:      p.repost_count,
        isBookmarked: userBookmarks.has(p.post_id),
        isReposted:   userReposts.has(p.post_id),
    }));
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
// 12. REAL-TIME (optional)
// ---------------------------------------------------------------------------
export function subscribeToPosts(onInsert) {
    const channel = supabase
        .channel('public:posts')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'posts' },
            (payload) => onInsert(payload.new))
        .subscribe();
    return () => supabase.removeChannel(channel);
}

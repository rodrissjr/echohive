# EchoHive — Setup & Deployment Guide

> **Your Voice. Your Campus.**
> Final Year Project · Department of Computer Science and Mathematics
> Institute of Accountancy Arusha · 2025/2026

---

## 🔐 Security first

If you ever shared your `sb_secret_...` key (in chat, email, screenshot, repo, anywhere), **rotate it now**:

> Supabase Dashboard → **Project Settings → API Keys** → row labelled `sb_secret_...` → **Rotate**.

The secret key bypasses every Row-Level Security policy. Treat it like the keys to your apartment. Only the `sb_publishable_...` key belongs in your frontend code — RLS is what keeps it safe.

---

## Environment variables — the full list

EchoHive needs **exactly two** variables in the frontend:

```bash
# .env.local  — at the root of your React project (same level as package.json)
VITE_SUPABASE_URL=https://apubiuguwshjgrtkolyc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_By8vuOCXzWBGozWCp93ZPQ_b65Bu_jf
```

That's it. No third variable. The `sb_secret_` key never goes in this file.

When deploying to Vercel/Netlify, these same two variables go into the dashboard's "Environment Variables" section. Save & redeploy.

---

## What's in this project

| File | Purpose |
|------|---------|
| `EchoHive.jsx` | Full React app — feed, multi-emoji reactions, nested comments, bookmarks, reposts, share, views, auth, admin panel |
| `echohive_schema.sql` | PostgreSQL schema for Supabase: tables, RLS, triggers, RPC functions |
| `supabaseClient.js` | Integration layer — every function the React UI needs |
| `SETUP.md` | This file |

---

## Part 1 — Set up Supabase

### 1.1 Run the schema

1. Supabase Dashboard → **SQL Editor → New query**
2. Paste the entire contents of `echohive_schema.sql`
3. Click **Run**

You should see `Success. No rows returned.` In **Table Editor** you'll now have eight tables: `profiles`, `categories` (pre-seeded), `posts`, `comments`, `reactions`, `post_views`, `bookmarks`, `reposts`.

### 1.2 Configure Auth URLs (required for forgot-password to work)

This step is non-negotiable — without it, the password reset email link won't redirect properly.

1. Supabase Dashboard → **Authentication → URL Configuration**
2. Set:
   - **Site URL**: `http://localhost:5173` (development) or your production URL
   - **Redirect URLs** (add all of these):
     - `http://localhost:5173/reset-password`
     - `http://localhost:5173/**` (covers any auth callback)
     - Your production domain equivalents when you deploy
3. **Save**

### 1.3 Email templates (optional but professional)

Supabase Dashboard → **Authentication → Email Templates** → **Reset Password**. Customize the subject and body to match the EchoHive voice. The default works; a branded version looks better at the demo.

### 1.4 Promote your first admin

Sign up your admin account through the app first, then in **SQL Editor**:

```sql
update public.profiles
   set role = 'admin'
 where email = 'your-admin-email@example.com';
```

---

## Part 2 — Set up the React frontend

### 2.1 Scaffold the project

```bash
npm create vite@latest echohive -- --template react
cd echohive
npm install
npm install @supabase/supabase-js lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Edit `tailwind.config.js`:

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

Replace `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
body { margin: 0; }
```

### 2.2 Drop in the files

1. Copy `EchoHive.jsx` into `src/`
2. Copy `supabaseClient.js` into `src/`
3. Replace `src/App.jsx`:

   ```jsx
   import EchoHive from './EchoHive';
   export default function App() { return <EchoHive />; }
   ```

### 2.3 Add environment variables

Create `.env.local` in the project root with the two vars above. Add `.env.local` to `.gitignore`.

### 2.4 Run

```bash
npm run dev
```

Open http://localhost:5173. The app runs against built-in mock data so you can demo the UI immediately.

---

## Part 3 — Wire to Supabase (going live)

`EchoHive.jsx` ships with mock data so the UI works standalone. To switch to the real backend, make these edits inside `EchoHive.jsx`:

### 3.1 Import the client

```jsx
import {
  getCurrentUser, onAuthChange, signIn, signUp, signOut,
  sendPasswordResetEmail, updatePassword,
  fetchFeed, createPost, deletePost,
  toggleReaction, toggleBookmark, toggleRepost, recordView,
  fetchComments, addComment,
  adminFetchUsers, adminBanUser,
} from './supabaseClient';
```

### 3.2 Replace mock state with empty state

```jsx
const [posts, setPosts] = useState([]);
const [comments, setComments] = useState({});
const [users, setUsers] = useState([]);
```

(Remove `INITIAL_POSTS`, `INITIAL_COMMENTS`, `INITIAL_USERS` constants from the file or just stop importing them — your call.)

### 3.3 Load on mount

```jsx
useEffect(() => {
    getCurrentUser().then(res => {
        if (res) setUser({
            id: res.profile.user_id,
            username: res.profile.username,
            display: res.profile.display_name,
            email: res.profile.email,
            university: res.profile.university,
            role: res.profile.role,
        });
    });

    fetchFeed().then(setPosts).catch(console.error);

    const { data: sub } = onAuthChange(async (authUser) => {
        if (!authUser) { setUser(null); return; }
        const res = await getCurrentUser();
        if (res) setUser({
            id: res.profile.user_id,
            username: res.profile.username,
            display: res.profile.display_name,
            email: res.profile.email,
            university: res.profile.university,
            role: res.profile.role,
        });
    });
    return () => sub.subscription.unsubscribe();
}, []);
```

### 3.4 Rewire the action handlers

Replace each in-memory handler with its async Supabase equivalent:

```jsx
const refreshFeed = async () => setPosts(await fetchFeed({ categorySlug: activeCategory }));

const handleReact   = async (postId, type) => { await toggleReaction(postId, type); refreshFeed(); };
const handleBookmark = async (postId)       => { await toggleBookmark(postId);       refreshFeed(); };
const confirmRepost  = async (comment)      => { await toggleRepost(repostTarget.id, comment); setRepostTarget(null); refreshFeed(); };

const handleCreate = async ({ title, content, category }) => {
    await createPost({ title, content, categorySlug: category });
    setCreatingPost(false);
    refreshFeed();
};

const handleAddComment = async (postId, content, parentId = null) => {
    await addComment(postId, content, parentId);
    setComments(prev => ({ ...prev, [postId]: await fetchComments(postId) }));
    if (parentId === null) refreshFeed();
};

const handleOpenPost = async (post) => {
    await recordView(post.id);
    setSelectedPost(post);
    setComments(prev => ({ ...prev, [post.id]: await fetchComments(post.id) }));
    refreshFeed();
};
```

### 3.5 Rewire the auth screens

Inside `AuthView`, replace the demo handlers:

```jsx
const handleLogin = async (e) => {
    e.preventDefault();
    try { await signIn({ email: form.email, password: form.password }); }
    catch (err) { toast(err.message); }
};

const handleRegister = async (e) => {
    e.preventDefault();
    try {
        await signUp({
            email: form.email, password: form.password,
            username: form.username, displayName: form.display, university: form.university,
        });
        toast('Account created. Check your email to confirm.');
    } catch (err) { toast(err.message); }
};

const handleForgot = async (e) => {
    e.preventDefault();
    try {
        await sendPasswordResetEmail(form.email);
        toast(`Reset link sent to ${form.email}`);
    } catch (err) { toast(err.message); }
};

const handleReset = async (e) => {
    e.preventDefault();
    try {
        await updatePassword(form.newPassword);
        toast('Password updated');
        setMode('login');
    } catch (err) { toast(err.message); }
};
```

### 3.6 Add a /reset-password route

When the user clicks the reset email link, they land at `/reset-password`. The simplest setup uses a hash-based check:

```jsx
// At the top of EchoHive(), before any state:
const isResetFlow = window.location.pathname === '/reset-password' ||
                    window.location.hash.includes('type=recovery');

// In the render path:
if (isResetFlow) {
    // Force AuthView to start in 'reset' mode
    return <AuthView onLogin={setUser} toast={showToast} initialMode="reset" />;
}
```

(Pass `initialMode` into `AuthView` and use it as the initial state for `mode`.)

---

## Part 4 — Deploy

### Vercel (recommended)

1. Push to GitHub
2. https://vercel.com → **Add New Project** → import repo
3. Framework: **Vite**. Root: leave default.
4. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. **Deploy**

After deploy, go back to **Supabase → Authentication → URL Configuration** and add your live domain to Site URL and Redirect URLs.

---

## Part 5 — Demo checklist

- [ ] Signup creates a row in `profiles` with the chosen `university`
- [ ] Login persists across page refresh
- [ ] **Forgot password**: clicking the link in the email lands on `/reset-password` and lets the user set a new password
- [ ] Feed loads, sorted by recent
- [ ] Category filter works (Academics, Hostel, Events, Complaints)
- [ ] Hover the **React** button → emoji picker appears with all six reactions
- [ ] Picking the same reaction twice removes it; picking a different one switches it
- [ ] **Comment** opens detail view; **reply** under a comment threads it
- [ ] **Save** turns the bookmark gold; the saved post appears in the **Saved** sidebar entry
- [ ] **Repost** opens the quote-repost modal; bumps the repost counter
- [ ] **Share** opens the system share sheet on mobile, the link-copy modal on desktop
- [ ] Opening a post increments **views**, but only once per user (idempotent)
- [ ] An admin sees the admin panel; a non-admin doesn't
- [ ] Admin can delete posts; admin can ban/unban users
- [ ] A banned user can log in but can't post or react (RLS rejects)

---

## Part 6 — Mapping to the project proposal

| Feature in proposal (Section 3.3) | Implementation |
|---|---|
| User Registration & Login | `auth.users` + `profiles` auto-provisioning trigger |
| Create Post | `posts` table + `createPost()` |
| View Feed | `feed_posts` view + `fetchFeed()` |
| Category Filter | `categories` table + `activeCategory` state |
| Like / Dislike | **Extended** to six reactions; `toggle_reaction` RPC enforces mutual exclusion |
| Comment on Post | `comments` table + nested `parent_comment_id` |
| Admin: Delete Post | RLS policy `posts: admin moderate` |
| Admin: Manage Users | `adminBanUser()` + admin panel users table |

Beyond the proposal, EchoHive now also delivers: bookmarks, reposts (quote-repost), unique view tracking, multi-university scoping, and forgot-password recovery. These extensions are mentioned in your "Future Work" section in the report or — better — pitched as exceeding scope.

---

## Troubleshooting

**Reset email never arrives** — Supabase free tier rate-limits emails (4/hour). Check spam, or wait an hour. For production, configure SMTP in Auth Settings.

**"new row violates row-level security policy"** — user not authenticated, or `user_id` doesn't match `auth.uid()`. Check the session is valid.

**Reactions counter stuck** — the trigger `reactions_count_trg` maintains it. If it ever drifts, run: `update posts set reaction_count = (select count(*) from reactions where reactions.post_id = posts.post_id);`

**Admin panel doesn't appear** — confirm the SQL `update profiles set role='admin' where email='...';` actually matched a row (`select count(*) from profiles where role='admin';` should return ≥1).

**"Invalid API key"** — restart `npm run dev` after editing `.env.local`. Vite reads env vars at startup.

---

## Credits

**James Modestus Kalolo** — BCSe-01-0090-2023
**Supervisor**: Edison Lubua
**Institution**: Institute of Accountancy Arusha
**Year**: 2025/2026

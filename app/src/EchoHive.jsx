import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Hexagon, Search, Bell, Plus, User, LogOut, Settings, ShieldCheck,
  GraduationCap, Home, Calendar, AlertCircle, TrendingUp, MessageCircle,
  Trash2, Ban, X, ArrowLeft, Eye, EyeOff, Check, Users, FileText,
  Activity, Sparkles, Bookmark, Share2, Filter, Repeat2,
  Mail, Building2, KeyRound, CornerDownRight, Send, Link2
} from 'lucide-react';
import {
  getCurrentUser, onAuthChange, signIn, signUp, signOut,
  sendPasswordResetEmail, updatePassword,
  fetchFeed, createPost, deletePost,
  toggleReaction, toggleBookmark, toggleRepost, recordView,
  fetchComments, addComment,
  adminFetchUsers, adminBanUser,
} from './supabaseClient';

// =====================================================================
// EchoHive — Your Voice. Your Campus.
// =====================================================================

const CATEGORIES = [
  { id: 'academics',  name: 'Academics',  icon: GraduationCap, color: '#1E5F8E', bg: '#E8F1F8' },
  { id: 'hostel',     name: 'Hostel',     icon: Home,          color: '#A16207', bg: '#FDF6E3' },
  { id: 'events',     name: 'Events',     icon: Calendar,      color: '#5B3A9B', bg: '#F1EBF9' },
  { id: 'complaints', name: 'Complaints', icon: AlertCircle,   color: '#9B2C2C', bg: '#FBEBEB' },
];

// Six FB-style reactions, mutually exclusive per user per post.
const REACTIONS = [
  { id: 'like',  emoji: '👍', label: 'Like',  color: '#1E5F8E' },
  { id: 'love',  emoji: '❤️', label: 'Love',  color: '#9B2C2C' },
  { id: 'laugh', emoji: '😂', label: 'Haha',  color: '#A16207' },
  { id: 'wow',   emoji: '😮', label: 'Wow',   color: '#5B3A9B' },
  { id: 'sad',   emoji: '😢', label: 'Sad',   color: '#2F6B4F' },
  { id: 'angry', emoji: '😡', label: 'Angry', color: '#9B2C2C' },
];

const UNIVERSITIES = [
  'Institute of Accountancy Arusha',
  'University of Dar es Salaam',
  'Mzumbe University',
  'University of Dodoma',
  'Sokoine University of Agriculture',
  'St Augustine University of Tanzania',
  'Ardhi University',
  'Nelson Mandela African Institution of Science and Technology',
  'Other',
];

// ---------- Mock data ----------
const INITIAL_POSTS = [
  {
    id: 1,
    title: 'Mid-semester exam timetable feels unusually compressed this year',
    content: 'Four major exams inside five days, with two of them back-to-back on Thursday. I understand the academic calendar pressure, but there has to be a middle ground between efficiency and burning the entire cohort out. Has anyone raised this with the Dean of Studies? A petition might help us get at least a day of spacing between Operating Systems and Database Management.',
    category: 'academics',
    author: { id: 2, username: 'amina.j', display: 'Amina Juma', university: 'Institute of Accountancy Arusha', year: 'Year 3 • BCSe' },
    createdAt: Date.now() - 1000 * 60 * 42,
    reactions: { like: 87, love: 5, laugh: 0, wow: 4, sad: 2, angry: 1 },
    userReaction: null,
    comments: 23, views: 1247, reposts: 4, isBookmarked: false, isReposted: false,
  },
  {
    id: 2,
    title: 'Block C water supply has been inconsistent for two weeks straight',
    content: 'The water comes on for maybe an hour in the morning then nothing until late night. Several of us have raised it at the hostel office but the response has been vague. Is this happening in other blocks or just ours? If it is widespread we should put together a formal note to the administration.',
    category: 'hostel',
    author: { id: 3, username: 'brian.m', display: 'Brian Mwangi', university: 'Institute of Accountancy Arusha', year: 'Year 2 • BCSe' },
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    reactions: { like: 86, love: 12, laugh: 0, wow: 6, sad: 24, angry: 18 },
    userReaction: 'like',
    comments: 47, views: 2891, reposts: 12, isBookmarked: true, isReposted: false,
  },
  {
    id: 3,
    title: 'IAA Tech Innovation Summit — who is presenting and who is going?',
    content: 'The line-up this year looks genuinely exciting. Real engineers from real companies, not just sponsor demos. I am submitting a poster on a low-bandwidth campus messaging idea. If anyone else is presenting or wants to carpool from East Campus, drop a comment.',
    category: 'events',
    author: { id: 4, username: 'james.k', display: 'James Kalolo', university: 'Institute of Accountancy Arusha', year: 'Year 4 • BCSe' },
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    reactions: { like: 31, love: 18, laugh: 4, wow: 7, sad: 0, angry: 0 },
    userReaction: null,
    comments: 18, views: 882, reposts: 3, isBookmarked: false, isReposted: false,
  },
  {
    id: 4,
    title: 'Library should stay open until midnight during examination weeks',
    content: 'The 10pm closing time is workable most of the semester, but during exam weeks it genuinely hurts. Many of us do not have quiet study space in the hostels. A simple rotating student-staff schedule could extend hours without huge cost to the institution.',
    category: 'complaints',
    author: { id: 5, username: 'grace.n', display: 'Grace Ndagire', university: 'Institute of Accountancy Arusha', year: 'Year 3 • BACC' },
    createdAt: Date.now() - 1000 * 60 * 60 * 14,
    reactions: { like: 145, love: 22, laugh: 0, wow: 4, sad: 18, angry: 12 },
    userReaction: null,
    comments: 62, views: 4108, reposts: 21, isBookmarked: false, isReposted: false,
  },
  {
    id: 5,
    title: 'Data Structures lecturer is posting genuinely excellent supplementary notes',
    content: 'Shout out to the DS team this semester. The weekly problem sets and the annotated reference implementations are the best supplementary material I have seen in three years here. If you are taking the course, actually read the footnotes — they explain the why, not just the what.',
    category: 'academics',
    author: { id: 6, username: 'peter.o', display: 'Peter Okello', university: 'Institute of Accountancy Arusha', year: 'Year 2 • BCSe' },
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    reactions: { like: 102, love: 64, laugh: 6, wow: 5, sad: 0, angry: 1 },
    userReaction: 'love',
    comments: 29, views: 2245, reposts: 7, isBookmarked: false, isReposted: false,
  },
  {
    id: 6,
    title: 'Friday open-mic and poetry night at the student centre — lineup confirmed',
    content: 'Seven poets, three musicians, one stand-up slot still open. Entry free for students with ID, small fee for guests. Proceeds go toward the student welfare fund this month. Doors open 6:30pm, first performer on at 7.',
    category: 'events',
    author: { id: 7, username: 'sofia.l', display: 'Sofia Lema', university: 'Institute of Accountancy Arusha', year: 'Year 4 • BBA' },
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    reactions: { like: 54, love: 31, laugh: 8, wow: 1, sad: 0, angry: 0 },
    userReaction: null,
    comments: 21, views: 1502, reposts: 9, isBookmarked: false, isReposted: false,
  },
];

// Comments are flat with parent_comment_id; UI renders them as nested threads.
const INITIAL_COMMENTS = {
  1: [
    { id: 1, postId: 1, parentId: null, author: { username: 'brian.m', display: 'Brian Mwangi' }, content: 'Agreed. Two heavy papers on Thursday is rough. I will sign.', createdAt: Date.now() - 1000 * 60 * 30 },
    { id: 2, postId: 1, parentId: 1,    author: { username: 'amina.j', display: 'Amina Juma' },   content: 'Thanks Brian. I will collect signatures by Wednesday.', createdAt: Date.now() - 1000 * 60 * 26 },
    { id: 3, postId: 1, parentId: null, author: { username: 'grace.n', display: 'Grace Ndagire' }, content: 'The dean office usually responds to a formal written submission from at least twenty students. Worth doing properly.', createdAt: Date.now() - 1000 * 60 * 22 },
    { id: 4, postId: 1, parentId: 3,    author: { username: 'peter.o', display: 'Peter Okello' }, content: 'Good point. I can help draft the letter — I have a template from last year.', createdAt: Date.now() - 1000 * 60 * 18 },
  ],
  2: [
    { id: 5, postId: 2, parentId: null, author: { username: 'james.k', display: 'James Kalolo' }, content: 'Same situation in Block A for three days last week. Not just you.', createdAt: Date.now() - 1000 * 60 * 90 },
  ],
};

const INITIAL_USERS = [
  { id: 1, username: 'admin',    display: 'System Admin',  email: 'admin@iaa.ac.tz', university: 'Institute of Accountancy Arusha', role: 'admin',   isBanned: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120 },
  { id: 2, username: 'amina.j',  display: 'Amina Juma',    email: 'amina@iaa.ac.tz', university: 'Institute of Accountancy Arusha', role: 'student', isBanned: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 80 },
  { id: 3, username: 'brian.m',  display: 'Brian Mwangi',  email: 'brian@iaa.ac.tz', university: 'Institute of Accountancy Arusha', role: 'student', isBanned: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 75 },
  { id: 4, username: 'james.k',  display: 'James Kalolo',  email: 'james@iaa.ac.tz', university: 'Institute of Accountancy Arusha', role: 'student', isBanned: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60 },
  { id: 5, username: 'grace.n',  display: 'Grace Ndagire', email: 'grace@iaa.ac.tz', university: 'Institute of Accountancy Arusha', role: 'student', isBanned: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 50 },
  { id: 6, username: 'peter.o',  display: 'Peter Okello',  email: 'peter@iaa.ac.tz', university: 'Institute of Accountancy Arusha', role: 'student', isBanned: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40 },
  { id: 7, username: 'sofia.l',  display: 'Sofia Lema',    email: 'sofia@iaa.ac.tz', university: 'Institute of Accountancy Arusha', role: 'student', isBanned: false, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 },
  { id: 8, username: 'rude.one', display: 'Banned User',   email: 'x@iaa.ac.tz',     university: 'Institute of Accountancy Arusha', role: 'student', isBanned: true,  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20 },
];

// ---------- Helpers ----------
const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
};
const formatNum = (n) => {
  if (n < 1000) return n.toString();
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (n < 1000000) return Math.floor(n / 1000) + 'k';
  return (n / 1000000).toFixed(1) + 'M';
};
const getCategory = (id) => CATEGORIES.find(c => c.id === id);
const getReaction = (id) => REACTIONS.find(r => r.id === id);
const initials = (name = '') => name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const totalReactions = (post) => Object.values(post.reactions).reduce((a, b) => a + b, 0);
const topReactions = (post) =>
  Object.entries(post.reactions)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

// ---------- Global styles ----------
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&display=swap');

    :root {
      --bg:          #FAF8F3;
      --surface:     #FFFFFF;
      --ink:         #151412;
      --ink-2:       #3F3D39;
      --muted:       #7A7770;
      --line:        #E8E2D4;
      --line-2:      #F0EBDE;
      --accent:      #C8872A;
      --accent-deep: #95641A;
      --accent-soft: #FAEFD8;
      --success:     #2F6B4F;
      --danger:      #9B2C2C;
    }

    .eh-root { font-family: 'Roboto', system-ui, sans-serif; color: var(--ink); background: var(--bg); }
    .font-display { font-family: 'Poppins', system-ui, sans-serif; letter-spacing: -0.01em; }
    .font-body    { font-family: 'Roboto', system-ui, sans-serif; }

    .hex-texture {
      background-color: var(--bg);
      background-image:
        radial-gradient(circle at 20% 30%, rgba(200,135,42,0.04) 0%, transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(200,135,42,0.03) 0%, transparent 40%);
    }

    .eh-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 4px;
      transition: border-color .18s ease, box-shadow .18s ease;
    }
    .eh-card:hover { border-color: #D8CEB4; }

    .eh-btn {
      font-family: 'Poppins', sans-serif;
      font-weight: 500;
      letter-spacing: 0.01em;
      border-radius: 3px;
      transition: all .15s ease;
    }
    .eh-btn-primary { background: var(--ink); color: var(--bg); }
    .eh-btn-primary:hover { background: #000; transform: translateY(-1px); }
    .eh-btn-accent { background: var(--accent); color: #fff; }
    .eh-btn-accent:hover { background: var(--accent-deep); }
    .eh-btn-ghost { background: transparent; color: var(--ink-2); border: 1px solid var(--line); }
    .eh-btn-ghost:hover { background: var(--line-2); border-color: #D8CEB4; }

    .eh-input {
      font-family: 'Roboto', sans-serif;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 3px;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .eh-input:focus {
      outline: none;
      border-color: var(--ink);
      box-shadow: 0 0 0 3px rgba(21,20,18,0.06);
    }

    @keyframes eh-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .eh-fade-up { animation: eh-fade-up .38s ease both; }
    @keyframes eh-fade-in { from { opacity: 0; } to { opacity: 1; } }
    .eh-fade-in { animation: eh-fade-in .22s ease both; }
    @keyframes eh-pop { 0% { transform: scale(.5); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
    .eh-pop { animation: eh-pop .25s cubic-bezier(.34,1.56,.64,1) both; }
    @keyframes eh-spin { to { transform: rotate(360deg); } }

    .eh-scroll::-webkit-scrollbar { width: 8px; }
    .eh-scroll::-webkit-scrollbar-track { background: transparent; }
    .eh-scroll::-webkit-scrollbar-thumb { background: #D8CEB4; border-radius: 4px; }

    .eh-rule { display: inline-block; width: 28px; height: 2px; background: var(--accent); }

    .eh-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 32px;
    }
    @media (min-width: 1024px) {
      .eh-grid { grid-template-columns: 220px minmax(0, 1fr); }
    }
    @media (min-width: 1280px) {
      .eh-grid { grid-template-columns: 220px minmax(0, 1fr) 280px; }
    }

    .eh-reaction-picker {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 6px;
      display: flex;
      gap: 2px;
      box-shadow: 0 8px 24px rgba(21,20,18,0.12);
      z-index: 30;
    }
    .eh-reaction-picker button {
      font-size: 22px;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      transition: transform .15s ease;
      line-height: 1;
      background: transparent;
    }
    .eh-reaction-picker button:hover {
      transform: scale(1.35) translateY(-4px);
      background: var(--line-2);
    }
    .eh-reaction-picker .lbl {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--ink);
      color: var(--bg);
      font-family: 'Poppins', sans-serif;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 2px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity .15s;
    }
    .eh-reaction-picker button:hover .lbl { opacity: 1; }
  `}</style>
);

// ---------- Logo / Avatar / CategoryChip ----------
const Logo = ({ size = 32 }) => (
  <div className="flex items-center gap-2.5" aria-label="EchoHive">
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
        <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" fill="#151412" />
        <path d="M16 8 L22 11.5 L22 20.5 L16 24 L10 20.5 L10 11.5 Z" fill="#C8872A" />
        <circle cx="16" cy="16" r="2.2" fill="#FAF8F3" />
      </svg>
    </div>
    <div className="font-display" style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
      Echo<span style={{ color: 'var(--accent)' }}>Hive</span>
    </div>
  </div>
);

const Avatar = ({ name, size = 36 }) => {
  const palette = [
    ['#1E5F8E', '#E8F1F8'],
    ['#A16207', '#FDF6E3'],
    ['#5B3A9B', '#F1EBF9'],
    ['#2F6B4F', '#E8F2EC'],
    ['#9B2C2C', '#FBEBEB'],
    ['#C8872A', '#FAEFD8'],
  ];
  const h = (name || 'X').charCodeAt(0) % palette.length;
  const [fg, bg] = palette[h];
  return (
    <div className="font-display flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38, fontWeight: 600, borderRadius: 2 }}>
      {initials(name)}
    </div>
  );
};

const CategoryChip = ({ categoryId, compact = false }) => {
  const cat = getCategory(categoryId);
  if (!cat) return null;
  const Icon = cat.icon;
  return (
    <span className="font-display inline-flex items-center gap-1.5"
      style={{
        color: cat.color, background: cat.bg,
        fontSize: compact ? 11 : 12, fontWeight: 600,
        padding: compact ? '3px 8px' : '4px 10px',
        borderRadius: 2, letterSpacing: '0.03em', textTransform: 'uppercase',
      }}>
      <Icon size={compact ? 11 : 12} strokeWidth={2.4} />
      {cat.name}
    </span>
  );
};

// ---------- Toast ----------
const useToast = () => {
  const [msg, setMsg] = useState(null);
  const show = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2200); };
  const node = msg && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] eh-pop"
      style={{
        background: 'var(--ink)', color: 'var(--bg)',
        padding: '10px 18px', borderRadius: 3, fontSize: 13,
        fontFamily: "'Poppins', sans-serif", fontWeight: 500,
        letterSpacing: '0.02em',
        boxShadow: '0 8px 24px rgba(21,20,18,0.2)',
      }}>
      {msg}
    </div>
  );
  return [show, node];
};

const Spinner = ({ size = 20, color = 'var(--accent)' }) => (
  <div style={{
    width: size, height: size,
    border: `2px solid var(--line)`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'eh-spin .7s linear infinite',
    flexShrink: 0,
  }} />
);

// =====================================================================
// REACTION PICKER
// =====================================================================
const ReactionButton = ({ post, onReact }) => {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const current = post.userReaction ? getReaction(post.userReaction) : null;

  const openPicker  = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const closePicker = () => { closeTimer.current = setTimeout(() => setOpen(false), 200); };

  const handleClick = () => {
    onReact(post.id, post.userReaction || 'like');
  };

  const pick = (id) => {
    onReact(post.id, id);
    setOpen(false);
  };

  return (
    <div className="relative" onMouseEnter={openPicker} onMouseLeave={closePicker}>
      {open && (
        <div className="eh-reaction-picker eh-fade-in" onMouseEnter={openPicker} onMouseLeave={closePicker}>
          {REACTIONS.map(r => (
            <button key={r.id} onClick={() => pick(r.id)} aria-label={r.label} className="relative">
              <span>{r.emoji}</span>
              <span className="lbl">{r.label}</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={handleClick}
        className="flex items-center gap-1.5"
        style={{
          padding: '7px 11px', borderRadius: 2, fontSize: 12.5,
          color: current ? current.color : 'var(--ink-2)',
          fontWeight: current ? 600 : 400,
          fontFamily: current ? "'Poppins', sans-serif" : "'Roboto', sans-serif",
          background: 'transparent',
          transition: 'background .15s ease, color .15s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--line-2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
        {current
          ? <span style={{ fontSize: 16, lineHeight: 1 }}>{current.emoji}</span>
          : <span style={{ fontSize: 14, opacity: 0.6 }}>👍</span>}
        <span>{current ? current.label : 'React'}</span>
      </button>
    </div>
  );
};

const ReactionSummary = ({ post, onClick }) => {
  const total = totalReactions(post);
  const top = topReactions(post);
  if (total === 0) return <div />;
  return (
    <button onClick={onClick} className="flex items-center gap-1.5" style={{ padding: '4px 0' }}>
      <span className="flex" style={{ marginRight: 2 }}>
        {top.map((id, i) => (
          <span key={id}
            style={{
              width: 18, height: 18, borderRadius: 9,
              background: 'var(--surface)', border: '2px solid var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i,
            }}>
            {getReaction(id)?.emoji}
          </span>
        ))}
      </span>
      <span className="font-body" style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
        {formatNum(total)}
      </span>
    </button>
  );
};

// =====================================================================
// HEADER
// =====================================================================
const Header = ({ user, onLogout, onCreate, onNavigate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px' }} className="flex items-center gap-6">
        <button onClick={() => onNavigate('feed')}><Logo /></button>

        <div className="hidden md:flex items-center gap-1 flex-1 max-w-md"
          style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, padding: '7px 12px' }}>
          <Search size={15} style={{ color: 'var(--muted)' }} />
          <input className="font-body flex-1 bg-transparent focus:outline-none text-sm"
            placeholder="Search posts, people, categories…"
            style={{ color: 'var(--ink)' }} />
        </div>

        <div className="flex-1 md:hidden" />

        <button onClick={onCreate} className="eh-btn eh-btn-accent hidden sm:flex items-center gap-2 text-sm" style={{ padding: '8px 14px' }}>
          <Plus size={15} strokeWidth={2.5} />New Post
        </button>
        <button onClick={onCreate} className="sm:hidden eh-btn eh-btn-accent" style={{ padding: 8 }}>
          <Plus size={16} strokeWidth={2.5} />
        </button>

        <button className="relative" aria-label="Notifications">
          <Bell size={18} style={{ color: 'var(--ink-2)' }} />
          <span className="absolute -top-1 -right-1 font-display flex items-center justify-center"
            style={{ background: 'var(--accent)', color: 'white', minWidth: 16, height: 16, borderRadius: 8, fontSize: 10, fontWeight: 600, padding: '0 4px' }}>3</span>
        </button>

        <div className="relative">
          <button onClick={() => setMenuOpen(v => !v)}><Avatar name={user.display} size={34} /></button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 eh-card eh-fade-in"
                style={{ width: 240, zIndex: 20, padding: 6, boxShadow: '0 8px 24px rgba(21,20,18,0.08)' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-2)' }}>
                  <div className="font-display text-sm" style={{ fontWeight: 600 }}>{user.display}</div>
                  <div className="font-body text-xs" style={{ color: 'var(--muted)' }}>@{user.username}</div>
                  <div className="font-body" style={{ fontSize: 11, color: 'var(--accent-deep)', marginTop: 4 }}>{user.university}</div>
                </div>
                <MenuItem icon={User}     label="Your Profile" onClick={() => setMenuOpen(false)} />
                <MenuItem icon={Bookmark} label="Saved"        onClick={() => { setMenuOpen(false); onNavigate('saved'); }} />
                <MenuItem icon={Settings} label="Settings"     onClick={() => setMenuOpen(false)} />
                {user.role === 'admin' && (
                  <MenuItem icon={ShieldCheck} label="Admin Panel" highlight
                    onClick={() => { setMenuOpen(false); onNavigate('admin'); }} />
                )}
                <div style={{ height: 1, background: 'var(--line-2)', margin: '4px 0' }} />
                <MenuItem icon={LogOut} label="Sign out" danger onClick={() => { setMenuOpen(false); onLogout(); }} />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const MenuItem = ({ icon: Icon, label, onClick, highlight, danger }) => (
  <button onClick={onClick} className="flex items-center gap-2.5 w-full text-left"
    style={{
      padding: '8px 12px', borderRadius: 2, fontSize: 13,
      color: danger ? 'var(--danger)' : highlight ? 'var(--accent-deep)' : 'var(--ink-2)',
      fontWeight: highlight ? 600 : 400,
      fontFamily: highlight ? "'Poppins', sans-serif" : "'Roboto', sans-serif",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--line-2)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
    <Icon size={15} strokeWidth={2} />{label}
  </button>
);

// =====================================================================
// SIDEBAR
// =====================================================================
const Sidebar = ({ activeCategory, onSelect, posts, onNavigate, currentView, savedCount }) => {
  const counts = useMemo(() => {
    const c = { all: posts.length };
    CATEGORIES.forEach(cat => { c[cat.id] = posts.filter(p => p.category === cat.id).length; });
    return c;
  }, [posts]);

  return (
    <aside className="hidden lg:block">
      <div style={{ position: 'sticky', top: 84 }}>
        <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
          Categories
        </div>
        <div className="eh-rule mb-3"></div>

        <nav className="space-y-0.5">
          <SidebarItem
            label="All Posts" icon={Sparkles} count={counts.all}
            active={currentView === 'feed' && activeCategory === 'all'}
            onClick={() => { onNavigate('feed'); onSelect('all'); }}
          />
          {CATEGORIES.map(cat => (
            <SidebarItem
              key={cat.id}
              label={cat.name} icon={cat.icon} color={cat.color} count={counts[cat.id]}
              active={currentView === 'feed' && activeCategory === cat.id}
              onClick={() => { onNavigate('feed'); onSelect(cat.id); }}
            />
          ))}
        </nav>

        <div className="font-display mt-7 mb-3" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Personal
        </div>
        <div className="eh-rule mb-3"></div>
        <SidebarItem
          label="Saved" icon={Bookmark} count={savedCount}
          active={currentView === 'saved'} onClick={() => onNavigate('saved')}
        />

        <div className="mt-8">
          <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            Guidelines
          </div>
          <div className="eh-rule mb-3"></div>
          <div className="font-body" style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.65 }}>
            Speak honestly. Speak responsibly. Disagree with ideas, not with people. This is your campus — keep it worth coming back to.
          </div>
        </div>
      </div>
    </aside>
  );
};

const SidebarItem = ({ label, icon: Icon, color, count, active, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between text-left"
    style={{
      padding: '9px 10px', borderRadius: 2,
      background: active ? 'var(--accent-soft)' : 'transparent',
      borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
      transition: 'background .15s ease',
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--line-2)'; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
    <span className="flex items-center gap-2.5">
      <Icon size={15} strokeWidth={2} style={{ color: color || 'var(--ink-2)' }} />
      <span className="font-display" style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: 'var(--ink)' }}>{label}</span>
    </span>
    <span className="font-body" style={{ fontSize: 11.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
  </button>
);

// =====================================================================
// RIGHT RAIL
// =====================================================================
const RightRail = ({ posts }) => {
  const trending = useMemo(() => [...posts]
    .sort((a, b) => (totalReactions(b) + b.comments + b.reposts) - (totalReactions(a) + a.comments + a.reposts))
    .slice(0, 4), [posts]);

  return (
    <aside className="hidden xl:block">
      <div style={{ position: 'sticky', top: 84 }} className="space-y-6">
        <div className="eh-card" style={{ padding: 18 }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
            <div className="font-display" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Trending on Campus
            </div>
          </div>
          <div className="eh-rule mb-4"></div>
          <ol className="space-y-3.5">
            {trending.map((p, i) => (
              <li key={p.id} className="flex gap-3">
                <span className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1, minWidth: 20 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 4 }}>
                    {p.title.length > 64 ? p.title.slice(0, 64) + '…' : p.title}
                  </div>
                  <div className="font-body" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {formatNum(totalReactions(p) + p.comments)} interactions · {getCategory(p.category)?.name}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="eh-card" style={{ padding: 18, background: 'linear-gradient(180deg, #FAEFD8 0%, #FFFFFF 100%)' }}>
          <Hexagon size={18} style={{ color: 'var(--accent)' }} />
          <div className="font-display mt-3" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Your voice matters here.
          </div>
          <div className="font-body mt-1.5" style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Every post, every comment, every reaction shapes the campus conversation. Be the reason someone feels heard today.
          </div>
        </div>

        <div className="font-body px-1" style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          EchoHive · Multi-University Edition<br />
          About · Guidelines · Privacy · Contact<br />
          <span style={{ color: '#B8B2A2' }}>© 2026 — A Final Year Project</span>
        </div>
      </div>
    </aside>
  );
};

// =====================================================================
// POST CARD
// =====================================================================
const ActionBtn = ({ icon: Icon, label, active, activeColor, onClick, fillWhenActive }) => (
  <button onClick={onClick}
    className="flex items-center gap-1.5"
    style={{
      padding: '7px 11px', borderRadius: 2, fontSize: 12.5,
      color: active ? activeColor : 'var(--ink-2)',
      fontWeight: active ? 600 : 400,
      fontFamily: active ? "'Poppins', sans-serif" : "'Roboto', sans-serif",
      background: 'transparent',
      transition: 'background .15s ease, color .15s ease',
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--line-2)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
    <Icon size={14} strokeWidth={active ? 2.4 : 2}
      fill={active && fillWhenActive ? activeColor : 'none'} />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const PostCard = ({ post, onReact, onOpen, onDelete, onBookmark, onShare, onRepost, isAdmin, currentUserId, index }) => {
  const isOwner = post.author.id === currentUserId;

  return (
    <article className="eh-card eh-fade-up" style={{ padding: '20px 22px', animationDelay: `${Math.min(index * 40, 280)}ms` }}>
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.author.display} size={38} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                {post.author.display}
              </span>
              <span className="font-body" style={{ fontSize: 12, color: 'var(--muted)' }}>@{post.author.username}</span>
            </div>
            <div className="font-body" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              <span style={{ color: 'var(--accent-deep)' }}>{post.author.university}</span>
              {post.author.year && <> · {post.author.year}</>} · {timeAgo(post.createdAt)}
            </div>
          </div>
        </div>
        <CategoryChip categoryId={post.category} compact />
      </header>

      <button onClick={() => onOpen(post)} className="text-left w-full block">
        <h3 className="font-display"
          style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 8, letterSpacing: '-0.015em' }}>
          {post.title}
        </h3>
        <p className="font-body" style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)', marginBottom: 14 }}>
          {post.content.length > 240 ? post.content.slice(0, 240) + '…' : post.content}
        </p>
      </button>

      <div className="flex items-center justify-between mb-2.5" style={{ minHeight: 22 }}>
        <ReactionSummary post={post} onClick={() => onOpen(post)} />
        <div className="flex items-center gap-3 font-body" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          <span className="flex items-center gap-1"><Eye size={11} /> {formatNum(post.views)}</span>
          <span>{formatNum(post.comments)} comments</span>
          <span>{formatNum(post.reposts)} reposts</span>
        </div>
      </div>

      <footer className="flex items-center justify-between flex-wrap gap-1" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 8 }}>
        <div className="flex items-center gap-1 flex-wrap">
          <ReactionButton post={post} onReact={onReact} />
          <ActionBtn icon={MessageCircle} label="Comment" onClick={() => onOpen(post)} />
          <ActionBtn
            icon={Repeat2} label={post.isReposted ? 'Reposted' : 'Repost'}
            active={post.isReposted} activeColor="var(--success)"
            onClick={() => onRepost(post.id)}
          />
          <ActionBtn icon={Share2} label="Share" onClick={() => onShare(post)} />
          <ActionBtn
            icon={Bookmark} label={post.isBookmarked ? 'Saved' : 'Save'}
            active={post.isBookmarked} activeColor="var(--accent-deep)"
            fillWhenActive
            onClick={() => onBookmark(post.id)}
          />
        </div>

        {(isAdmin || isOwner) && (
          <button onClick={() => onDelete(post.id)}
            className="flex items-center gap-1.5"
            style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 10px', borderRadius: 2 }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}>
            <Trash2 size={13} />
          </button>
        )}
      </footer>
    </article>
  );
};

// =====================================================================
// FEED
// =====================================================================
const SortTab = ({ label, active, onClick }) => (
  <button onClick={onClick} className="font-display"
    style={{
      fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 2,
      color: active ? 'var(--ink)' : 'var(--muted)',
      background: active ? 'var(--surface)' : 'transparent',
      border: `1px solid ${active ? 'var(--line)' : 'transparent'}`,
      letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>{label}</button>
);

const MobileChip = ({ label, active, onClick, color }) => (
  <button onClick={onClick} className="font-display shrink-0"
    style={{
      fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 2,
      color: active ? 'white' : (color || 'var(--ink-2)'),
      background: active ? 'var(--ink)' : 'var(--surface)',
      border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>{label}</button>
);

const Feed = ({ posts, activeCategory, onCategoryChange, onReact, onOpen, onDelete, onBookmark, onShare, onRepost, isAdmin, currentUserId, onCreate, title, subtitle, emptyState, loading }) => {
  const [sort, setSort] = useState('recent');

  const filtered = useMemo(() => {
    let list = activeCategory === 'all' ? posts : posts.filter(p => p.category === activeCategory);
    if (sort === 'popular') list = [...list].sort((a, b) => totalReactions(b) - totalReactions(a));
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [posts, activeCategory, sort]);

  const cat = activeCategory === 'all' ? null : getCategory(activeCategory);

  return (
    <main>
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {title || (cat ? cat.name : 'The Feed')}
          </h1>
          <div className="eh-rule mt-3 mb-2.5"></div>
          <p className="font-body" style={{ fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 520 }}>
            {subtitle || (cat
              ? `Opinions, questions, and announcements tagged ${cat.name.toLowerCase()}. Fresh first.`
              : 'The pulse of the campus, ordered by the conversations that matter right now.')}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <SortTab label="Recent"  active={sort === 'recent'}  onClick={() => setSort('recent')} />
          <SortTab label="Popular" active={sort === 'popular'} onClick={() => setSort('popular')} />
        </div>
      </div>

      {onCategoryChange && (
        <div className="lg:hidden -mx-1 mb-5 flex gap-2 overflow-x-auto eh-scroll" style={{ paddingBottom: 6 }}>
          <MobileChip label="All" active={activeCategory === 'all'} onClick={() => onCategoryChange('all')} />
          {CATEGORIES.map(c => (
            <MobileChip key={c.id} label={c.name} active={activeCategory === c.id} color={c.color} onClick={() => onCategoryChange(c.id)} />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="eh-card" style={{ padding: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Spinner size={24} />
            <span className="font-body" style={{ fontSize: 13.5, color: 'var(--muted)' }}>Loading posts…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="eh-card" style={{ padding: 48, textAlign: 'center' }}>
            <Filter size={22} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
            <div className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
              {emptyState || 'Nothing here yet'}
            </div>
            <div className="font-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
              Be the first to share something in this space.
            </div>
            {onCreate && (
              <button onClick={onCreate} className="eh-btn eh-btn-primary mt-4 text-sm" style={{ padding: '9px 16px' }}>
                Write a post
              </button>
            )}
          </div>
        ) : (
          filtered.map((p, i) => (
            <PostCard
              key={p.id} post={p} index={i}
              onReact={onReact} onOpen={onOpen} onDelete={onDelete}
              onBookmark={onBookmark} onShare={onShare} onRepost={onRepost}
              isAdmin={isAdmin} currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </main>
  );
};

// =====================================================================
// POST DETAIL — with nested comments
// =====================================================================
const CommentNode = ({ comment, allComments, currentUser, onReply, depth = 0 }) => {
  const replies = allComments.filter(c => c.parentId === comment.id);
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onReply(comment.postId, text.trim(), comment.id);
    setText('');
    setReplyOpen(false);
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 28 : 0, paddingLeft: depth > 0 ? 12 : 0, borderLeft: depth > 0 ? '2px solid var(--line-2)' : 'none' }}>
      <div className="flex gap-3">
        <Avatar name={comment.author.display} size={depth > 0 ? 28 : 32} />
        <div className="flex-1 min-w-0">
          <div className="eh-card" style={{ padding: '10px 13px' }}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{comment.author.display}</span>
              <span className="font-body" style={{ fontSize: 11.5, color: 'var(--muted)' }}>@{comment.author.username} · {timeAgo(comment.createdAt)}</span>
            </div>
            <p className="font-body" style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>{comment.content}</p>
          </div>

          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button onClick={() => setReplyOpen(v => !v)} className="font-display flex items-center gap-1"
              style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.03em' }}>
              <CornerDownRight size={11} /> Reply
            </button>
            {replies.length > 0 && (
              <span className="font-body" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>

          {replyOpen && (
            <div className="flex gap-2 mt-2 eh-fade-in">
              <Avatar name={currentUser.display} size={26} />
              <div className="flex-1 flex gap-2">
                <input
                  value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder={`Reply to ${comment.author.display.split(' ')[0]}…`}
                  className="eh-input flex-1 font-body"
                  style={{ padding: '7px 11px', fontSize: 12.5 }}
                  autoFocus
                />
                <button onClick={submit} className="eh-btn eh-btn-primary" style={{ padding: '7px 12px', fontSize: 12 }} disabled={!text.trim()}>
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map(r => (
            <CommentNode key={r.id} comment={r} allComments={allComments} currentUser={currentUser} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const PostDetail = ({ post, comments, onClose, onReact, onAddComment, onBookmark, onShare, onRepost, currentUser }) => {
  const [text, setText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const topLevel = comments.filter(c => c.parentId === null);

  const submit = async () => {
    if (!text.trim() || commenting) return;
    setCommenting(true);
    try {
      await onAddComment(post.id, text.trim(), null);
      setText('');
    } finally {
      setCommenting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{ background: 'rgba(21,20,18,0.4)', padding: '24px 16px', overflowY: 'auto' }}
      onClick={onClose}>
      <div className="eh-card w-full" style={{ maxWidth: 780, boxShadow: '0 20px 60px rgba(21,20,18,0.18)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ padding: '14px 22px', borderBottom: '1px solid var(--line-2)' }}>
          <button onClick={onClose} className="flex items-center gap-2 font-display"
            style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <ArrowLeft size={14} /> Back to feed
          </button>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--muted)' }} /></button>
        </div>

        <div style={{ padding: '28px 32px 24px' }}>
          <CategoryChip categoryId={post.category} />
          <h1 className="font-display mt-4" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {post.title}
          </h1>

          <div className="flex items-center gap-3 mt-4" style={{ paddingBottom: 18, borderBottom: '1px solid var(--line-2)' }}>
            <Avatar name={post.author.display} size={40} />
            <div>
              <div className="font-display" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{post.author.display}</div>
              <div className="font-body" style={{ fontSize: 12, color: 'var(--muted)' }}>
                @{post.author.username} · <span style={{ color: 'var(--accent-deep)' }}>{post.author.university}</span>
                {post.author.year && <> · {post.author.year}</>} · {timeAgo(post.createdAt)}
              </div>
            </div>
          </div>

          <p className="font-body mt-5" style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
            {post.content}
          </p>

          <div className="flex items-center justify-between flex-wrap gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--line-2)' }}>
            <ReactionSummary post={post} />
            <div className="flex items-center gap-4 font-body" style={{ fontSize: 12, color: 'var(--muted)' }}>
              <span className="flex items-center gap-1"><Eye size={12} /> {formatNum(post.views)} views</span>
              <span>{formatNum(post.comments)} comments</span>
              <span>{formatNum(post.reposts)} reposts</span>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-3 flex-wrap" style={{ borderTop: '1px solid var(--line-2)', paddingTop: 12 }}>
            <ReactionButton post={post} onReact={onReact} />
            <ActionBtn icon={MessageCircle} label="Comment" />
            <ActionBtn icon={Repeat2} label={post.isReposted ? 'Reposted' : 'Repost'} active={post.isReposted} activeColor="var(--success)" onClick={() => onRepost(post.id)} />
            <ActionBtn icon={Share2} label="Share" onClick={() => onShare(post)} />
            <ActionBtn icon={Bookmark} label={post.isBookmarked ? 'Saved' : 'Save'} active={post.isBookmarked} activeColor="var(--accent-deep)" fillWhenActive onClick={() => onBookmark(post.id)} />
          </div>
        </div>

        <div style={{ padding: '20px 32px 28px', background: 'var(--bg)' }}>
          <div className="font-display" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            {comments.length} {comments.length === 1 ? 'Reply' : 'Replies'}
          </div>
          <div className="eh-rule mb-5"></div>

          <div className="flex gap-3 mb-6">
            <Avatar name={currentUser.display} size={36} />
            <div className="flex-1">
              <textarea
                value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Add to the conversation…"
                className="eh-input w-full font-body" rows={2}
                style={{ padding: '10px 12px', fontSize: 13.5, resize: 'vertical' }}
              />
              <div className="flex justify-end mt-2">
                <button onClick={submit} className="eh-btn eh-btn-primary text-sm"
                  style={{ padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, opacity: !text.trim() || commenting ? 0.4 : 1 }}
                  disabled={!text.trim() || commenting}>
                  {commenting ? <><Spinner size={13} color="#FAF8F3" /> Posting…</> : 'Reply'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {topLevel.length === 0 && (
              <div className="font-body text-center" style={{ fontSize: 13, color: 'var(--muted)', padding: '16px 0' }}>
                Be the first to reply.
              </div>
            )}
            {topLevel.map(c => (
              <CommentNode key={c.id} comment={c} allComments={comments} currentUser={currentUser} onReply={onAddComment} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// LABEL + FIELD
// =====================================================================
const Label = ({ children }) => (
  <label className="font-display block mb-2"
    style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
    {children}
  </label>
);

const Field = ({ label, value, onChange, placeholder, type = 'text', icon: Icon }) => (
  <div>
    <Label>{label}</Label>
    <div className="relative">
      {Icon && <Icon size={15} style={{ color: 'var(--muted)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="eh-input w-full font-body" placeholder={placeholder}
        style={{ padding: Icon ? '10px 14px 10px 38px' : '10px 14px', fontSize: 14 }}
      />
    </div>
  </div>
);

// =====================================================================
// CREATE POST MODAL
// =====================================================================
const CreatePost = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('academics');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = title.trim().length >= 8 && content.trim().length >= 20;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), content: content.trim(), category });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in" style={{ background: 'rgba(21,20,18,0.4)', padding: '32px 16px' }} onClick={onClose}>
      <div className="eh-card w-full" style={{ maxWidth: 640, boxShadow: '0 20px 60px rgba(21,20,18,0.18)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
          <div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Share something</div>
            <div className="font-body" style={{ fontSize: 12, color: 'var(--muted)' }}>Your post will be visible to the campus community.</div>
          </div>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--muted)' }} /></button>
        </div>

        <div style={{ padding: 24 }}>
          <Label>Category</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              const active = category === c.id;
              return (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className="font-display flex items-center justify-center gap-1.5"
                  style={{
                    padding: '10px 8px', borderRadius: 2, fontSize: 12.5, fontWeight: 600,
                    background: active ? c.bg : 'var(--surface)',
                    color: active ? c.color : 'var(--ink-2)',
                    border: `1px solid ${active ? c.color : 'var(--line)'}`,
                  }}>
                  <Icon size={13} strokeWidth={2.2} />{c.name}
                </button>
              );
            })}
          </div>

          <Label>Title</Label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140}
            placeholder="Give your post a clear headline"
            className="eh-input w-full font-display mb-1"
            style={{ padding: '11px 14px', fontSize: 15, fontWeight: 500 }} />
          <div className="font-body" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 18 }}>{title.length} / 140</div>

          <Label>Your thoughts</Label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Be honest, be respectful, be clear about what you're asking or saying."
            rows={6} className="eh-input w-full font-body"
            style={{ padding: '12px 14px', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }} />

          <div className="flex justify-between items-center mt-6">
            <div className="font-body" style={{ fontSize: 11.5, color: 'var(--muted)' }}>Posting as an EchoHive community member</div>
            <div className="flex gap-2">
              <button onClick={onClose} disabled={submitting} className="eh-btn eh-btn-ghost text-sm" style={{ padding: '8px 16px' }}>Cancel</button>
              <button onClick={handleSubmit}
                disabled={!canSubmit || submitting} className="eh-btn eh-btn-primary text-sm"
                style={{ padding: '8px 20px', opacity: canSubmit && !submitting ? 1 : 0.4, cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}>
                {submitting ? <><Spinner size={14} color="#FAF8F3" /> Publishing…</> : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// REPOST + SHARE MODALS
// =====================================================================
const RepostModal = ({ post, onClose, onConfirm }) => {
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{ background: 'rgba(21,20,18,0.4)', padding: '32px 16px' }} onClick={onClose}>
      <div className="eh-card w-full" style={{ maxWidth: 540, boxShadow: '0 20px 60px rgba(21,20,18,0.18)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
            Repost to your followers
          </div>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--muted)' }} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <textarea
            value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Add a thought (optional)…" maxLength={280} rows={3}
            className="eh-input w-full font-body"
            style={{ padding: '10px 12px', fontSize: 13.5, marginBottom: 14 }}
          />
          <div className="eh-card" style={{ padding: 12, background: 'var(--bg)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar name={post.author.display} size={24} />
              <span className="font-display" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{post.author.display}</span>
              <span className="font-body" style={{ fontSize: 11, color: 'var(--muted)' }}>· {timeAgo(post.createdAt)}</span>
            </div>
            <div className="font-display" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>{post.title}</div>
            <div className="font-body" style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {post.content.length > 140 ? post.content.slice(0, 140) + '…' : post.content}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onClose} className="eh-btn eh-btn-ghost text-sm" style={{ padding: '8px 16px' }}>Cancel</button>
            <button onClick={() => onConfirm(comment.trim() || null)} className="eh-btn eh-btn-primary text-sm" style={{ padding: '8px 20px' }}>
              Repost
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ShareModal = ({ post, onClose, onCopy }) => {
  const link = `https://echohive.app/post/${post.id}`;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{ background: 'rgba(21,20,18,0.4)', padding: '32px 16px' }} onClick={onClose}>
      <div className="eh-card w-full" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ padding: '16px 24px', borderBottom: '1px solid var(--line-2)' }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 600 }}>Share this post</div>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--muted)' }} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>{post.title}</div>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="eh-input flex-1 font-body" style={{ padding: '9px 12px', fontSize: 12.5, color: 'var(--ink-2)' }} />
            <button onClick={() => onCopy(link)} className="eh-btn eh-btn-primary flex items-center gap-1.5 text-sm" style={{ padding: '9px 14px' }}>
              <Link2 size={13} /> Copy
            </button>
          </div>
          <div className="font-body mt-5" style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
            Tip: on a phone, the system share sheet will open automatically.
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// AUTH — login, register, forgot password, reset
// =====================================================================
const toUserShape = (res) => ({
  id: res.profile.user_id,
  username: res.profile.username,
  display: res.profile.display_name,
  email: res.profile.email,
  university: res.profile.university,
  role: res.profile.role,
});

const AuthView = ({ onLogin, toast, initialMode }) => {
  const [mode, setMode] = useState(initialMode || 'login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', newPassword: '',
    username: '', display: '', university: 'Institute of Accountancy Arusha',
  });

  const switchMode = (m) => { setMode(m); setLoading(false); };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await signIn({ email: form.email, password: form.password });
      const res = await getCurrentUser();
      if (res) onLogin(toUserShape(res));
      else toast('Signed in but profile not found — contact support.');
    } catch (err) { toast(err.message); }
    finally { setLoading(false); }
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await signUp({
        email: form.email, password: form.password,
        username: form.username, displayName: form.display, university: form.university,
      });
      toast('Account created. Check your email to confirm.');
    } catch (err) { toast(err.message); }
    finally { setLoading(false); }
  };
  const handleForgot = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(form.email);
      toast(`Reset link sent to ${form.email}`);
    } catch (err) { toast(err.message); }
    finally { setLoading(false); }
  };
  const handleReset = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await updatePassword(form.newPassword);
      toast('Password updated');
      switchMode('login');
    } catch (err) { toast(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="eh-root min-h-screen hex-texture flex items-center justify-center" style={{ padding: 20 }}>
      <GlobalStyles />
      <div className="w-full grid md:grid-cols-2 gap-10 items-center" style={{ maxWidth: 980 }}>
        <div className="hidden md:block eh-fade-up">
          <Logo size={40} />
          <h1 className="font-display mt-10" style={{ fontSize: 44, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.05 }}>
            Your voice.<br /><span style={{ color: 'var(--accent)' }}>Your campus.</span>
          </h1>
          <div className="eh-rule mt-5 mb-5" style={{ width: 48 }}></div>
          <p className="font-body" style={{ fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: 420 }}>
            A considered space for the opinions, questions, and conversations that shape student life — across every university that joins us. Structured. Accountable. Yours.
          </p>
          <div className="mt-10 space-y-4">
            {[
              ['Open to every campus', 'Pick your university when you sign up. EchoHive is not tied to one institution.'],
              ['Real reactions, not just likes', 'Six ways to respond — because not everything you read is a thumbs up.'],
              ['Saved, shared, reposted', 'Bookmark for yourself. Repost what your peers should see. Share beyond.'],
            ].map(([h, s], i) => (
              <div key={i} className="flex gap-3 eh-fade-up" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <Check size={16} style={{ color: 'var(--accent)', marginTop: 3 }} strokeWidth={2.5} />
                <div>
                  <div className="font-display" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{h}</div>
                  <div className="font-body" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>{s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="eh-card eh-fade-up" style={{ padding: '36px 36px 32px', animationDelay: '120ms' }}>
          <div className="md:hidden mb-6"><Logo /></div>

          <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {mode === 'login'    && 'Welcome back'}
            {mode === 'register' && 'Create account'}
            {mode === 'forgot'   && 'Forgot password'}
            {mode === 'reset'    && 'Set a new password'}
          </div>
          <h2 className="font-display mt-1" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            {mode === 'login'    && 'Sign in to EchoHive'}
            {mode === 'register' && 'Join the conversation'}
            {mode === 'forgot'   && "We'll send a reset link"}
            {mode === 'reset'    && 'Almost done'}
          </h2>
          <div className="eh-rule mt-4 mb-6"></div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" type="email" icon={Mail} />
              <div>
                <div className="flex justify-between items-end mb-2">
                  <Label>Password</Label>
                  <button type="button" onClick={() => switchMode('forgot')} className="font-display"
                    style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent-deep)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound size={15} style={{ color: 'var(--muted)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="eh-input w-full font-body" placeholder="••••••••"
                    style={{ padding: '10px 40px 10px 38px', fontSize: 14 }} required />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPw ? <EyeOff size={15} style={{ color: 'var(--muted)' }} /> : <Eye size={15} style={{ color: 'var(--muted)' }} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="eh-btn eh-btn-primary w-full"
                style={{ padding: '11px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Spinner size={16} color="#FAF8F3" /> Signing in…</> : 'Sign in'}
              </button>
              <div className="font-body text-center" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                New to EchoHive?{' '}
                <button type="button" onClick={() => switchMode('register')} className="font-display" style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>
                  Create an account
                </button>
              </div>
              <div className="pt-4" style={{ borderTop: '1px solid var(--line-2)' }}>
                <div className="font-body text-center" style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Demo: enter <b style={{ color: 'var(--ink-2)' }}>admin@iaa.ac.tz</b> to see the admin panel.
                </div>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Full name" value={form.display} onChange={(v) => setForm({ ...form, display: v })} placeholder="Jane Doe" icon={User} />
              <Field label="Username"  value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="jane.d" />
              <div>
                <Label>University</Label>
                <div className="relative">
                  <Building2 size={15} style={{ color: 'var(--muted)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <select value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })}
                    className="eh-input w-full font-body" style={{ padding: '10px 14px 10px 38px', fontSize: 14, appearance: 'none', cursor: 'pointer' }}>
                    {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" type="email" icon={Mail} />
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <KeyRound size={15} style={{ color: 'var(--muted)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="eh-input w-full font-body" placeholder="At least 8 characters"
                    style={{ padding: '10px 40px 10px 38px', fontSize: 14 }} required minLength={8} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPw ? <EyeOff size={15} style={{ color: 'var(--muted)' }} /> : <Eye size={15} style={{ color: 'var(--muted)' }} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="eh-btn eh-btn-primary w-full"
                style={{ padding: '11px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Spinner size={16} color="#FAF8F3" /> Creating account…</> : 'Create account'}
              </button>
              <div className="font-body text-center" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Already on EchoHive?{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-display" style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>
                  Sign in instead
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="font-body" style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                Enter the email tied to your account. We'll send you a secure link to set a new password — it works for 30 minutes.
              </p>
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" type="email" icon={Mail} />
              <button type="submit" disabled={loading} className="eh-btn eh-btn-primary w-full"
                style={{ padding: '11px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Spinner size={16} color="#FAF8F3" /> Sending…</> : 'Send reset link'}
              </button>
              <div className="font-body text-center" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Remembered it?{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-display" style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="font-body" style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                Choose a strong new password. You'll be signed in immediately after.
              </p>
              <div>
                <Label>New password</Label>
                <div className="relative">
                  <KeyRound size={15} style={{ color: 'var(--muted)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input type={showPw ? 'text' : 'password'} value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    className="eh-input w-full font-body" placeholder="At least 8 characters"
                    style={{ padding: '10px 40px 10px 38px', fontSize: 14 }} required minLength={8} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPw ? <EyeOff size={15} style={{ color: 'var(--muted)' }} /> : <Eye size={15} style={{ color: 'var(--muted)' }} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="eh-btn eh-btn-primary w-full"
                style={{ padding: '11px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Spinner size={16} color="#FAF8F3" /> Updating…</> : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// ADMIN PANEL
// =====================================================================
const StatCard = ({ icon: Icon, label, value, sub, tone }) => (
  <div className="eh-card" style={{ padding: 18 }}>
    <div className="flex items-center justify-between mb-4">
      <Icon size={16} style={{ color: tone === 'danger' ? 'var(--danger)' : 'var(--accent)' }} />
      <span className="font-display" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
    </div>
    <div className="font-display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
      {formatNum(value)}
    </div>
    <div className="font-body mt-2" style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
  </div>
);

const AdminOverview = ({ posts }) => {
  const byCat = CATEGORIES.map(c => ({ ...c, count: posts.filter(p => p.category === c.id).length }));
  const total = posts.length || 1;
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="eh-card" style={{ padding: 22 }}>
        <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Distribution by Category
        </div>
        <div className="eh-rule mt-3 mb-5"></div>
        <div className="space-y-4">
          {byCat.map(c => {
            const pct = Math.round((c.count / total) * 100);
            return (
              <div key={c.id}>
                <div className="flex justify-between mb-1.5">
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                  <span className="font-body" style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{c.count} posts · {pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--line-2)', borderRadius: 1 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: c.color, transition: 'width .4s ease' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="eh-card" style={{ padding: 22 }}>
        <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Recent Activity</div>
        <div className="eh-rule mt-3 mb-5"></div>
        <div className="space-y-3.5">
          {[...posts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map(p => (
            <div key={p.id} className="flex items-start gap-3">
              <Avatar name={p.author.display} size={30} />
              <div className="flex-1 min-w-0">
                <div className="font-display" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {p.title.length > 72 ? p.title.slice(0, 72) + '…' : p.title}
                </div>
                <div className="font-body" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                  {p.author.display} · {getCategory(p.category)?.name} · {timeAgo(p.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminPosts = ({ posts, onDelete }) => (
  <div className="eh-card" style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ overflowX: 'auto' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'var(--bg)' }}>
            {['Post', 'Author', 'Category', 'Engagement', 'Posted', ''].map(h => (
              <th key={h} className="font-display text-left"
                style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posts.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
              <td style={{ padding: '14px 16px', maxWidth: 320 }}>
                <div className="font-display" style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {p.title}
                </div>
              </td>
              <td style={{ padding: '14px 16px' }} className="font-body text-sm">{p.author.display}</td>
              <td style={{ padding: '14px 16px' }}><CategoryChip categoryId={p.category} compact /></td>
              <td style={{ padding: '14px 16px' }} className="font-body text-sm" >
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>
                  {totalReactions(p)} reactions · {p.comments} comments · {formatNum(p.views)} views
                </span>
              </td>
              <td style={{ padding: '14px 16px' }} className="font-body text-sm" ><span style={{ color: 'var(--muted)' }}>{timeAgo(p.createdAt)}</span></td>
              <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                <button onClick={() => onDelete(p.id)} className="font-display" style={{ fontSize: 12, fontWeight: 500, color: 'var(--danger)', padding: '6px 10px', borderRadius: 2 }}>
                  <Trash2 size={13} style={{ display: 'inline', marginRight: 4 }} /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AdminUsers = ({ users, onBan, onUnban }) => (
  <div className="eh-card" style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ overflowX: 'auto' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'var(--bg)' }}>
            {['User', 'University', 'Role', 'Status', 'Joined', ''].map(h => (
              <th key={h} className="font-display text-left"
                style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
              <td style={{ padding: '12px 16px' }}>
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.display} size={30} />
                  <div>
                    <div className="font-display" style={{ fontSize: 13, fontWeight: 600 }}>{u.display}</div>
                    <div className="font-body" style={{ fontSize: 11.5, color: 'var(--muted)' }}>@{u.username} · {u.email}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px 16px' }} className="font-body text-sm" ><span style={{ color: 'var(--ink-2)' }}>{u.university}</span></td>
              <td style={{ padding: '12px 16px' }}>
                <span className="font-display" style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 2,
                  color: u.role === 'admin' ? 'var(--accent-deep)' : 'var(--ink-2)',
                  background: u.role === 'admin' ? 'var(--accent-soft)' : 'var(--line-2)',
                }}>{u.role}</span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span className="font-display flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 500, color: u.isBanned ? 'var(--danger)' : 'var(--success)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: u.isBanned ? 'var(--danger)' : 'var(--success)' }}></span>
                  {u.isBanned ? 'Banned' : 'Active'}
                </span>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--muted)' }} className="font-body text-sm" >{timeAgo(u.createdAt)}</td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                {u.role !== 'admin' && (
                  u.isBanned ? (
                    <button onClick={() => onUnban(u.id)} className="font-display" style={{ fontSize: 12, fontWeight: 500, color: 'var(--success)' }}>
                      <Check size={13} style={{ display: 'inline', marginRight: 4 }} /> Restore
                    </button>
                  ) : (
                    <button onClick={() => onBan(u.id)} className="font-display" style={{ fontSize: 12, fontWeight: 500, color: 'var(--danger)' }}>
                      <Ban size={13} style={{ display: 'inline', marginRight: 4 }} /> Ban
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AdminPanel = ({ posts, users, onBack, onDeletePost, onBanUser, onUnbanUser }) => {
  const [tab, setTab] = useState('overview');
  const stats = {
    users: users.length,
    active: users.filter(u => !u.isBanned).length,
    banned: users.filter(u => u.isBanned).length,
    posts: posts.length,
    reactions: posts.reduce((s, p) => s + totalReactions(p), 0),
    comments: posts.reduce((s, p) => s + p.comments, 0),
    views: posts.reduce((s, p) => s + p.views, 0),
  };

  return (
    <div className="eh-root min-h-screen hex-texture">
      <GlobalStyles />
      <div style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px' }} className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 font-display"
            style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#EADFC7' }}>
            <ArrowLeft size={14} /> Back to feed
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} style={{ color: 'var(--accent)' }} />
            <span className="font-display" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#EADFC7' }}>
              Administrator Console
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div className="mb-8">
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            Moderation & Oversight
          </h1>
          <div className="eh-rule mt-3 mb-3"></div>
          <p className="font-body" style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 640 }}>
            Keep the community healthy. Act on what breaks the rules, preserve what carries value.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users}    label="Total users"   value={stats.users}     sub={`${stats.active} active`} />
          <StatCard icon={FileText} label="Total posts"   value={stats.posts}     sub={`${formatNum(stats.comments)} comments`} />
          <StatCard icon={Activity} label="Reactions"     value={stats.reactions} sub={`${formatNum(stats.views)} views`} />
          <StatCard icon={Ban}      label="Banned users"  value={stats.banned}    sub="Currently restricted" tone="danger" />
        </div>

        <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid var(--line)' }}>
          {[['overview','Overview'],['posts','Posts'],['users','Users']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className="font-display"
              style={{
                fontSize: 13, fontWeight: 600, padding: '10px 16px',
                color: tab === k ? 'var(--ink)' : 'var(--muted)',
                borderBottom: `2px solid ${tab === k ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1, letterSpacing: '0.02em',
              }}>{l}</button>
          ))}
        </div>

        {tab === 'overview' && <AdminOverview posts={posts} />}
        {tab === 'posts'    && <AdminPosts posts={posts} onDelete={onDeletePost} />}
        {tab === 'users'    && <AdminUsers users={users} onBan={onBanUser} onUnban={onUnbanUser} />}
      </div>
    </div>
  );
};

// =====================================================================
// ROOT APP
// =====================================================================
export default function EchoHive() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('feed');
  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [users, setUsers] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);
  const [creatingPost, setCreatingPost] = useState(false);
  const [repostTarget, setRepostTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);

  const [showToast, toastNode] = useToast();

  const isResetFlow = window.location.pathname === '/reset-password' ||
                      window.location.hash.includes('type=recovery');

  // Auth + initial feed load
  useEffect(() => {
    getCurrentUser().then(res => { if (res) setUser(toUserShape(res)); }).catch(console.error);

    setFeedLoading(true);
    fetchFeed().then(setPosts).catch(console.error).finally(() => setFeedLoading(false));

    const { data: sub } = onAuthChange(async (authUser) => {
      if (!authUser) { setUser(null); return; }
      try {
        const res = await getCurrentUser();
        if (res) setUser(toUserShape(res));
      } catch (e) {
        console.error('Auth profile fetch failed:', e);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Mirror selectedPost to live posts state
  useEffect(() => {
    if (selectedPost) {
      const fresh = posts.find(p => p.id === selectedPost.id);
      if (fresh && fresh !== selectedPost) setSelectedPost(fresh);
    }
  }, [posts, selectedPost]);

  const refreshFeed = async (cat) => {
    const slug = cat !== undefined ? cat : (activeCategory === 'all' ? null : activeCategory);
    setFeedLoading(true);
    try {
      setPosts(await fetchFeed({ categorySlug: slug || null }));
    } catch (e) {
      showToast(e.message);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    refreshFeed(cat === 'all' ? null : cat);
  };

  // ----- Actions -----
  const handleReact = async (postId, type) => {
    try {
      await toggleReaction(postId, type);
      refreshFeed();
    } catch (e) { showToast(e.message); }
  };

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId);
      if (selectedPost?.id === postId) setSelectedPost(null);
      refreshFeed();
      showToast('Post deleted');
    } catch (e) { showToast(e.message); }
  };

  const handleCreate = async ({ title, content, category }) => {
    try {
      await createPost({ title, content, categorySlug: category });
      setCreatingPost(false);
      refreshFeed();
      showToast('Posted to the feed');
    } catch (e) { showToast(e.message); }
  };

  const handleAddComment = async (postId, content, parentId = null) => {
    try {
      await addComment(postId, content, parentId);
      setComments(prev => ({ ...prev, [postId]: null }));
      fetchComments(postId).then(c => setComments(prev => ({ ...prev, [postId]: c })));
      if (parentId === null) refreshFeed();
    } catch (e) { showToast(e.message); }
  };

  const handleBookmark = async (postId) => {
    const post = posts.find(p => p.id === postId);
    try {
      await toggleBookmark(postId);
      refreshFeed();
      showToast(post?.isBookmarked ? 'Removed from saved' : 'Saved');
    } catch (e) { showToast(e.message); }
  };

  const handleShare = async (post) => {
    const link = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.title, url: link });
        return;
      } catch (e) { /* fall through to modal */ }
    }
    setShareTarget(post);
  };

  const handleCopyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copied to clipboard');
      setShareTarget(null);
    } catch (e) {
      showToast('Could not copy. Try selecting the text.');
    }
  };

  const handleRepost = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.isReposted) {
      try {
        await toggleRepost(postId);
        refreshFeed();
        showToast('Repost removed');
      } catch (e) { showToast(e.message); }
    } else {
      setRepostTarget(post);
    }
  };

  const confirmRepost = async (comment) => {
    try {
      await toggleRepost(repostTarget.id, comment);
      setRepostTarget(null);
      refreshFeed();
      showToast(comment ? 'Reposted with your take' : 'Reposted');
    } catch (e) { showToast(e.message); }
  };

  const handleOpenPost = async (post) => {
    await recordView(post.id);
    setSelectedPost(post);
    fetchComments(post.id).then(c => setComments(prev => ({ ...prev, [post.id]: c })));
    refreshFeed();
  };

  const handleBan   = async (uid) => { try { await adminBanUser(uid, true);  adminFetchUsers().then(setUsers); showToast('User banned');    } catch (e) { showToast(e.message); } };
  const handleUnban = async (uid) => { try { await adminBanUser(uid, false); adminFetchUsers().then(setUsers); showToast('User restored'); } catch (e) { showToast(e.message); } };

  if (isResetFlow) return (<>{toastNode}<AuthView onLogin={setUser} toast={showToast} initialMode="reset" /></>);
  if (!user) return (<>{toastNode}<AuthView onLogin={setUser} toast={showToast} /></>);

  if (view === 'admin' && user.role === 'admin') {
    if (users.length === 0) adminFetchUsers().then(setUsers);
    return (
      <>
        {toastNode}
        <AdminPanel
          posts={posts} users={users}
          onBack={() => setView('feed')}
          onDeletePost={handleDelete}
          onBanUser={handleBan} onUnbanUser={handleUnban}
        />
      </>
    );
  }

  const postComments = selectedPost ? (comments[selectedPost.id] || []) : [];
  const savedPosts = posts.filter(p => p.isBookmarked);

  return (
    <div className="eh-root min-h-screen hex-texture">
      <GlobalStyles />

      <Header
        user={user}
        onLogout={async () => { try { await signOut(); } catch (e) { showToast(e.message); } setUser(null); }}
        onCreate={() => setCreatingPost(true)}
        onNavigate={setView}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        <div className="eh-grid">
          <Sidebar
            activeCategory={activeCategory}
            onSelect={handleCategoryChange}
            posts={posts}
            onNavigate={setView}
            currentView={view}
            savedCount={savedPosts.length}
          />

          {view === 'saved' ? (
            <Feed
              posts={savedPosts}
              activeCategory="all"
              onReact={handleReact}
              onOpen={handleOpenPost}
              onDelete={handleDelete}
              onBookmark={handleBookmark}
              onShare={handleShare}
              onRepost={handleRepost}
              isAdmin={user.role === 'admin'}
              currentUserId={user.id}
              title="Saved"
              subtitle="Posts you bookmarked. Only you can see this list."
              emptyState="No saved posts yet"
              loading={feedLoading}
            />
          ) : (
            <Feed
              posts={posts}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              onReact={handleReact}
              onOpen={handleOpenPost}
              onDelete={handleDelete}
              onBookmark={handleBookmark}
              onShare={handleShare}
              onRepost={handleRepost}
              isAdmin={user.role === 'admin'}
              currentUserId={user.id}
              onCreate={() => setCreatingPost(true)}
              loading={feedLoading}
            />
          )}

          <RightRail posts={posts} />
        </div>
      </div>

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          comments={postComments}
          currentUser={user}
          onClose={() => setSelectedPost(null)}
          onReact={handleReact}
          onAddComment={handleAddComment}
          onBookmark={handleBookmark}
          onShare={handleShare}
          onRepost={handleRepost}
        />
      )}

      {creatingPost && (
        <CreatePost onClose={() => setCreatingPost(false)} onSubmit={handleCreate} />
      )}

      {repostTarget && (
        <RepostModal post={repostTarget} onClose={() => setRepostTarget(null)} onConfirm={confirmRepost} />
      )}

      {shareTarget && (
        <ShareModal post={shareTarget} onClose={() => setShareTarget(null)} onCopy={handleCopyLink} />
      )}

      {toastNode}
    </div>
  );
}

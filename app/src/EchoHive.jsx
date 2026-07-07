import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Hexagon,
  Search,
  Bell,
  Plus,
  User,
  LogOut,
  Settings,
  ShieldCheck,
  GraduationCap,
  Home,
  Calendar,
  AlertCircle,
  TrendingUp,
  MessageCircle,
  Trash2,
  Ban,
  X,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Users,
  FileText,
  Activity,
  Sparkles,
  Bookmark,
  Share2,
  Filter,
  Repeat2,
  Mail,
  Building2,
  KeyRound,
  CornerDownRight,
  Send,
  Link2,
  Image as ImageIcon,
  Paperclip,
  Heart,
  Camera,
  Flag,
} from "lucide-react";
import {
  getCurrentUser,
  onAuthChange,
  signIn,
  signUp,
  signOut,
  resendConfirmationEmail,
  sendPasswordResetEmail,
  updatePassword,
  fetchFeed,
  createPost,
  deletePost,
  toggleReaction,
  toggleBookmark,
  toggleRepost,
  recordView,
  fetchComments,
  addComment,
  adminFetchUsers,
  adminBanUser,
  updateAvatar,
  fetchPostById,
  subscribeToFeed,
  subscribeToComments,
  reportContent,
  adminFetchReports,
  adminResolveReport,
  fetchNotifications,
  markNotificationsRead,
  subscribeToNotifications,
} from "./supabaseClient";
import {
  MAX_POST_MEDIA,
  MAX_MEDIA_BYTES,
  LIKE_TYPE,
  timeAgo,
  formatNum,
  initials,
  totalReactions,
  validateMediaFile,
} from "./utils";

// =====================================================================
// EchoHive — Your Voice. Your Campus.
// =====================================================================

// =====================================================================
// MEDIA — shared attach/gallery helpers for posts + comments
// =====================================================================

const MediaGallery = ({ items, onRemove, maxHeight = 340 }) => {
  if (!items || items.length === 0) return null;
  const cols = items.length === 1 ? 1 : 2;
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, marginBottom: 12 }}
    >
      {items.map((m, i) => (
        <div
          key={i}
          className="relative overflow-hidden"
          style={{ borderRadius: 12, background: "rgba(255,255,255,0.03)" }}
        >
          {m.type === "video" ? (
            <video
              src={m.url}
              controls
              className="w-full block"
              style={{ maxHeight, width: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={m.url}
              alt=""
              className="w-full block"
              style={{ maxHeight, width: "100%", objectFit: "cover" }}
            />
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="flex items-center justify-center"
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "rgba(3, 4, 8, 0.75)",
                color: "#fff",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// Multi-file picker used by the post composer.
const MediaPicker = ({ items, onAdd, onRemove, max = MAX_POST_MEDIA }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const handleFiles = (fileList) => {
    const room = max - items.length;
    if (room <= 0) {
      setError(`You can attach up to ${max} files`);
      return;
    }
    const accepted = [];
    let err = "";
    for (const file of Array.from(fileList).slice(0, room)) {
      const fileErr = validateMediaFile(file);
      if (fileErr) {
        err = fileErr;
        continue;
      }
      accepted.push({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
      });
    }
    setError(err);
    if (accepted.length) onAdd(accepted);
  };

  return (
    <div className="mb-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <MediaGallery items={items} onRemove={onRemove} maxHeight={180} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={items.length >= max}
          className="eh-btn eh-btn-ghost text-sm flex items-center gap-1.5"
          style={{
            padding: "7px 14px",
            opacity: items.length >= max ? 0.4 : 1,
            cursor: items.length >= max ? "not-allowed" : "pointer",
          }}
        >
          <ImageIcon size={13} /> Photo/video
        </button>
        <span
          className="font-body"
          style={{ fontSize: 11, color: "var(--muted)" }}
        >
          {items.length}/{max}
        </span>
      </div>
      {error && (
        <div
          className="font-body mt-1.5"
          style={{ fontSize: 11.5, color: "var(--danger)" }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

// Single-file attach button used by comment/reply composers.
const SingleMediaAttach = ({ file, onPick, onClear }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const preview = useMemo(() => {
    if (!file) return null;
    return {
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    };
  }, [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const err = validateMediaFile(f);
            if (err) setError(err);
            else {
              setError("");
              onPick(f);
            }
          }
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Attach photo or video"
        className="flex items-center justify-center"
        style={{ padding: 6, color: "var(--muted)" }}
      >
        <Paperclip size={14} />
      </button>
      {preview && (
        <div className="relative" style={{ width: 36, height: 36 }}>
          {preview.type === "video" ? (
            <video
              src={preview.url}
              className="w-full h-full"
              style={{ borderRadius: 6, objectFit: "cover" }}
            />
          ) : (
            <img
              src={preview.url}
              alt=""
              className="w-full h-full"
              style={{ borderRadius: 6, objectFit: "cover" }}
            />
          )}
          <button
            type="button"
            onClick={onClear}
            className="flex items-center justify-center"
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 15,
              height: 15,
              borderRadius: 999,
              background: "rgba(3, 4, 8, 0.85)",
              color: "#fff",
            }}
          >
            <X size={9} />
          </button>
        </div>
      )}
      {error && (
        <span
          className="font-body"
          style={{ fontSize: 11, color: "var(--danger)" }}
        >
          {error}
        </span>
      )}
    </div>
  );
};

const FEED_PAGE_SIZE = 20;

const CATEGORIES = [
  {
    id: "academics",
    name: "Academics",
    icon: GraduationCap,
    color: "#00D4FF",
    bg: "rgba(0, 212, 255, 0.08)",
  },
  { id: "hostel", name: "Hostel", icon: Home, color: "#FFB800", bg: "rgba(255, 184, 0, 0.08)" },
  {
    id: "events",
    name: "Events",
    icon: Calendar,
    color: "#B366FF",
    bg: "rgba(179, 102, 255, 0.08)",
  },
  {
    id: "complaints",
    name: "Complaints",
    icon: AlertCircle,
    color: "#FF3366",
    bg: "rgba(255, 51, 102, 0.08)",
  },
];

const UNIVERSITIES = [
  "Institute of Accountancy Arusha",
  "University of Dar es Salaam",
  "Mzumbe University",
  "University of Dodoma",
  "Sokoine University of Agriculture",
  "St Augustine University of Tanzania",
  "Ardhi University",
  "Nelson Mandela African Institution of Science and Technology",
  "Other",
];

// ---------- Mock data ----------
const INITIAL_POSTS = [
  {
    id: 1,
    title: "Mid-semester exam timetable feels unusually compressed this year",
    content:
      "Four major exams inside five days, with two of them back-to-back on Thursday. I understand the academic calendar pressure, but there has to be a middle ground between efficiency and burning the entire cohort out. Has anyone raised this with the Dean of Studies? A petition might help us get at least a day of spacing between Operating Systems and Database Management.",
    category: "academics",
    author: {
      id: 2,
      username: "amina.j",
      display: "Amina Juma",
      university: "Institute of Accountancy Arusha",
      year: "Year 3 • BCSe",
    },
    createdAt: Date.now() - 1000 * 60 * 42,
    reactions: { like: 87, love: 5, laugh: 0, wow: 4, sad: 2, angry: 1 },
    userReaction: null,
    comments: 23,
    views: 1247,
    reposts: 4,
    isBookmarked: false,
    isReposted: false,
  },
  {
    id: 2,
    title: "Block C water supply has been inconsistent for two weeks straight",
    content:
      "The water comes on for maybe an hour in the morning then nothing until late night. Several of us have raised it at the hostel office but the response has been vague. Is this happening in other blocks or just ours? If it is widespread we should put together a formal note to the administration.",
    category: "hostel",
    author: {
      id: 3,
      username: "brian.m",
      display: "Brian Mwangi",
      university: "Institute of Accountancy Arusha",
      year: "Year 2 • BCSe",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    reactions: { like: 86, love: 12, laugh: 0, wow: 6, sad: 24, angry: 18 },
    userReaction: "like",
    comments: 47,
    views: 2891,
    reposts: 12,
    isBookmarked: true,
    isReposted: false,
  },
  {
    id: 3,
    title: "IAA Tech Innovation Summit — who is presenting and who is going?",
    content:
      "The line-up this year looks genuinely exciting. Real engineers from real companies, not just sponsor demos. I am submitting a poster on a low-bandwidth campus messaging idea. If anyone else is presenting or wants to carpool from East Campus, drop a comment.",
    category: "events",
    author: {
      id: 4,
      username: "james.k",
      display: "James Kalolo",
      university: "Institute of Accountancy Arusha",
      year: "Year 4 • BCSe",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    reactions: { like: 31, love: 18, laugh: 4, wow: 7, sad: 0, angry: 0 },
    userReaction: null,
    comments: 18,
    views: 882,
    reposts: 3,
    isBookmarked: false,
    isReposted: false,
  },
  {
    id: 4,
    title: "Library should stay open until midnight during examination weeks",
    content:
      "The 10pm closing time is workable most of the semester, but during exam weeks it genuinely hurts. Many of us do not have quiet study space in the hostels. A simple rotating student-staff schedule could extend hours without huge cost to the institution.",
    category: "complaints",
    author: {
      id: 5,
      username: "grace.n",
      display: "Grace Ndagire",
      university: "Institute of Accountancy Arusha",
      year: "Year 3 • BACC",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 14,
    reactions: { like: 145, love: 22, laugh: 0, wow: 4, sad: 18, angry: 12 },
    userReaction: null,
    comments: 62,
    views: 4108,
    reposts: 21,
    isBookmarked: false,
    isReposted: false,
  },
  {
    id: 5,
    title:
      "Data Structures lecturer is posting genuinely excellent supplementary notes",
    content:
      "Shout out to the DS team this semester. The weekly problem sets and the annotated reference implementations are the best supplementary material I have seen in three years here. If you are taking the course, actually read the footnotes — they explain the why, not just the what.",
    category: "academics",
    author: {
      id: 6,
      username: "peter.o",
      display: "Peter Okello",
      university: "Institute of Accountancy Arusha",
      year: "Year 2 • BCSe",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
    reactions: { like: 102, love: 64, laugh: 6, wow: 5, sad: 0, angry: 1 },
    userReaction: "love",
    comments: 29,
    views: 2245,
    reposts: 7,
    isBookmarked: false,
    isReposted: false,
  },
  {
    id: 6,
    title:
      "Friday open-mic and poetry night at the student centre — lineup confirmed",
    content:
      "Seven poets, three musicians, one stand-up slot still open. Entry free for students with ID, small fee for guests. Proceeds go toward the student welfare fund this month. Doors open 6:30pm, first performer on at 7.",
    category: "events",
    author: {
      id: 7,
      username: "sofia.l",
      display: "Sofia Lema",
      university: "Institute of Accountancy Arusha",
      year: "Year 4 • BBA",
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    reactions: { like: 54, love: 31, laugh: 8, wow: 1, sad: 0, angry: 0 },
    userReaction: null,
    comments: 21,
    views: 1502,
    reposts: 9,
    isBookmarked: false,
    isReposted: false,
  },
];

// Comments are flat with parent_comment_id; UI renders them as nested threads.
const INITIAL_COMMENTS = {
  1: [
    {
      id: 1,
      postId: 1,
      parentId: null,
      author: { username: "brian.m", display: "Brian Mwangi" },
      content: "Agreed. Two heavy papers on Thursday is rough. I will sign.",
      createdAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 2,
      postId: 1,
      parentId: 1,
      author: { username: "amina.j", display: "Amina Juma" },
      content: "Thanks Brian. I will collect signatures by Wednesday.",
      createdAt: Date.now() - 1000 * 60 * 26,
    },
    {
      id: 3,
      postId: 1,
      parentId: null,
      author: { username: "grace.n", display: "Grace Ndagire" },
      content:
        "The dean office usually responds to a formal written submission from at least twenty students. Worth doing properly.",
      createdAt: Date.now() - 1000 * 60 * 22,
    },
    {
      id: 4,
      postId: 1,
      parentId: 3,
      author: { username: "peter.o", display: "Peter Okello" },
      content:
        "Good point. I can help draft the letter — I have a template from last year.",
      createdAt: Date.now() - 1000 * 60 * 18,
    },
  ],
  2: [
    {
      id: 5,
      postId: 2,
      parentId: null,
      author: { username: "james.k", display: "James Kalolo" },
      content:
        "Same situation in Block A for three days last week. Not just you.",
      createdAt: Date.now() - 1000 * 60 * 90,
    },
  ],
};

const INITIAL_USERS = [
  {
    id: 1,
    username: "admin",
    display: "System Admin",
    email: "admin@iaa.ac.tz",
    university: "Institute of Accountancy Arusha",
    role: "admin",
    isBanned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
  },
  {
    id: 2,
    username: "amina.j",
    display: "Amina Juma",
    email: "amina@iaa.ac.tz",
    university: "Institute of Accountancy Arusha",
    role: "student",
    isBanned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 80,
  },
  {
    id: 3,
    username: "brian.m",
    display: "Brian Mwangi",
    email: "brian@iaa.ac.tz",
    university: "Institute of Accountancy Arusha",
    role: "student",
    isBanned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 75,
  },
  {
    id: 4,
    username: "james.k",
    display: "James Kalolo",
    email: "james@iaa.ac.tz",
    university: "Institute of Accountancy Arusha",
    role: "student",
    isBanned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
  },
  {
    id: 5,
    username: "grace.n",
    display: "Grace Ndagire",
    email: "grace@iaa.ac.tz",
    university: "Institute of Accountancy Arusha",
    role: "student",
    isBanned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 50,
  },
  {
    id: 6,
    username: "peter.o",
    display: "Peter Okello",
    email: "peter@iaa.ac.tz",
    university: "Institute of Accountancy Arusha",
    role: "student",
    isBanned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
  },
  {
    id: 7,
    username: "sofia.l",
    display: "Sofia Lema",
    email: "sofia@iaa.ac.tz",
    university: "Institute of Accountancy Arusha",
    role: "student",
    isBanned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  },
  {
    id: 8,
    username: "rude.one",
    display: "Banned User",
    email: "x@iaa.ac.tz",
    university: "Institute of Accountancy Arusha",
    role: "student",
    isBanned: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
  },
];

// ---------- Helpers ----------
const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

// ---------- Global styles ----------
const GlobalStyles = () => (
  <style>{`
    :root {
      --bg:          #06080F;
      --bg-elevated: #0A0E1A;
      --surface:     rgba(12, 18, 35, 0.65);
      --surface-solid: #0C1223;
      --ink:         #E8ECF4;
      --ink-2:       #94A3C4;
      --muted:       #506080;
      --line:        rgba(0, 240, 255, 0.08);
      --line-2:      rgba(0, 240, 255, 0.04);
      --accent:      #00F0FF;
      --accent-deep: #00C8D6;
      --accent-soft: rgba(0, 240, 255, 0.08);
      --success:     #00FF88;
      --danger:      #FF3366;
      --neon-magenta: #FF3399;
      --glow:        rgba(0, 240, 255, 0.15);
      --glass-border: rgba(0, 240, 255, 0.1);
      --grid-color:  rgba(0, 240, 255, 0.025);
    }

    .eh-root {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--ink);
      background: var(--bg);
    }
    .font-display { font-family: 'Inter', system-ui, sans-serif; letter-spacing: -0.02em; }
    .font-body    { font-family: 'Inter', system-ui, sans-serif; letter-spacing: -0.005em; }
    .font-mono    { font-family: 'JetBrains Mono', 'Fira Code', monospace; }

    .hex-texture {
      background-color: var(--bg);
      background-image:
        linear-gradient(var(--grid-color) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid-color) 1px, transparent 1px),
        radial-gradient(ellipse at 20% 20%, rgba(0, 240, 255, 0.03) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(179, 102, 255, 0.02) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(255, 51, 102, 0.01) 0%, transparent 60%);
      background-size: 60px 60px, 60px 60px, 100% 100%, 100% 100%, 100% 100%;
      background-position: -1px -1px;
    }

    .eh-card {
      background: var(--surface);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      transition: border-color .25s ease, box-shadow .25s ease, transform .25s ease;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.02), inset 0 1px 0 rgba(255,255,255,0.03);
    }
    .eh-card:hover {
      border-color: rgba(0, 240, 255, 0.2);
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.05), 0 0 60px rgba(0, 240, 255, 0.02), inset 0 1px 0 rgba(255,255,255,0.04);
    }

    .eh-btn {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      letter-spacing: 0.01em;
      border-radius: 8px;
      transition: all .2s ease;
      position: relative;
      overflow: hidden;
    }
    .eh-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
      pointer-events: none;
    }
    .eh-btn-primary {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);
      color: #06080F;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.15);
    }
    .eh-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.3), 0 4px 16px rgba(0, 240, 255, 0.15);
    }
    .eh-btn-primary:active {
      transform: translateY(0) scale(.97);
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.2);
    }
    .eh-btn-accent {
      background: linear-gradient(135deg, var(--accent) 0%, #00B8FF 100%);
      color: #06080F;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.12);
    }
    .eh-btn-accent:hover {
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.25);
      transform: translateY(-1px);
    }
    .eh-btn-accent:active {
      transform: translateY(0) scale(.97);
    }
    .eh-btn-ghost {
      background: rgba(0, 240, 255, 0.04);
      color: var(--ink-2);
      border: 1px solid var(--glass-border);
    }
    .eh-btn-ghost:hover {
      background: rgba(0, 240, 255, 0.08);
      border-color: rgba(0, 240, 255, 0.2);
      color: var(--ink);
    }
    .eh-btn-ghost:active {
      transform: scale(.97);
    }

    .eh-input {
      font-family: 'Inter', sans-serif;
      background: rgba(6, 8, 15, 0.6);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      transition: border-color .2s ease, box-shadow .2s ease;
      color: var(--ink);
    }
    .eh-input::placeholder {
      color: var(--muted);
    }
    .eh-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.08), 0 0 20px rgba(0, 240, 255, 0.06);
    }

    @keyframes eh-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .eh-fade-up { animation: eh-fade-up .45s cubic-bezier(0.16, 1, 0.3, 1) both; }
    @keyframes eh-mode-switch { from { opacity: 0; transform: translateY(8px) scale(.98); filter: blur(2px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    .eh-mode-switch { animation: eh-mode-switch .4s cubic-bezier(0.16, 1, 0.3, 1) both; }
    @keyframes eh-orb-float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(24px, -32px) scale(1.08); }
    }
    .eh-auth-orb {
      position: absolute;
      border-radius: 999px;
      filter: blur(70px);
      pointer-events: none;
      animation: eh-orb-float 14s ease-in-out infinite;
      z-index: 0;
    }
    @keyframes eh-fade-in { from { opacity: 0; } to { opacity: 1; } }
    .eh-fade-in { animation: eh-fade-in .25s ease both; }
    @keyframes eh-pop { 0% { transform: scale(.5); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
    .eh-pop { animation: eh-pop .3s cubic-bezier(.34,1.56,.64,1) both; }
    @keyframes eh-spin { to { transform: rotate(360deg); } }

    @keyframes eh-glow-pulse {
      0%, 100% { box-shadow: 0 0 15px rgba(0, 240, 255, 0.08); }
      50% { box-shadow: 0 0 30px rgba(0, 240, 255, 0.15); }
    }
    .eh-glow-pulse { animation: eh-glow-pulse 3s ease-in-out infinite; }

    @keyframes eh-border-glow {
      0%, 100% { border-color: rgba(0, 240, 255, 0.08); }
      50% { border-color: rgba(0, 240, 255, 0.2); }
    }

    @keyframes eh-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }

    @keyframes eh-neon-flicker {
      0%, 100% { opacity: 1; }
      92% { opacity: 1; }
      93% { opacity: 0.8; }
      94% { opacity: 1; }
      96% { opacity: 0.9; }
      97% { opacity: 1; }
    }

    .eh-scroll::-webkit-scrollbar { width: 6px; }
    .eh-scroll::-webkit-scrollbar-track { background: transparent; }
    .eh-scroll::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.12); border-radius: 3px; }
    .eh-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0, 240, 255, 0.25); }

    .eh-rule { display: inline-block; width: 32px; height: 2px; background: linear-gradient(90deg, var(--accent), transparent); border-radius: 1px; }

    .eh-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 32px;
    }
    @media (min-width: 1024px) {
      .eh-grid { grid-template-columns: 240px minmax(0, 1fr); }
    }
    @media (min-width: 1280px) {
      .eh-grid { grid-template-columns: 240px minmax(0, 1fr) 300px; }
    }

    /* Holographic shimmer effect for special elements */
    .eh-holographic {
      background: linear-gradient(135deg, rgba(0,240,255,0.05), rgba(179,102,255,0.05), rgba(255,51,102,0.05), rgba(0,255,136,0.05));
      background-size: 400% 400%;
      animation: eh-shimmer 8s ease infinite;
    }

    /* Glow text utility */
    .eh-text-glow {
      text-shadow: 0 0 10px rgba(0, 240, 255, 0.3), 0 0 30px rgba(0, 240, 255, 0.1);
    }
  `}</style>
);

// ---------- Logo / Avatar / CategoryChip ----------
const Logo = ({ size = 32 }) => (
  <div className="flex items-center gap-2.5" aria-label="EchoHive">
    <div style={{ width: size, height: size, filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.3))' }}>
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
        <defs>
          <linearGradient id="hex-glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="100%" stopColor="#B366FF" />
          </linearGradient>
        </defs>
        <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" fill="#0A0E1A" stroke="url(#hex-glow)" strokeWidth="0.5" />
        <path
          d="M16 8 L22 11.5 L22 20.5 L16 24 L10 20.5 L10 11.5 Z"
          fill="url(#hex-glow)"
          opacity="0.9"
        />
        <circle cx="16" cy="16" r="2.2" fill="#E8ECF4" />
      </svg>
    </div>
    <div
      className="font-display"
      style={{
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: "-0.03em",
        color: "var(--ink)",
      }}
    >
      Echo<span style={{ color: "var(--accent)", textShadow: '0 0 12px rgba(0, 240, 255, 0.4)' }}>Hive</span>
    </div>
  </div>
);

const Avatar = ({ name, size = 36, src }) => {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="shrink-0"
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          objectFit: "cover",
          border: "1px solid var(--glass-border)",
        }}
      />
    );
  }
  const palette = [
    ["#00F0FF", "rgba(0, 240, 255, 0.1)"],
    ["#B366FF", "rgba(179, 102, 255, 0.1)"],
    ["#00FF88", "rgba(0, 255, 136, 0.1)"],
    ["#FFB800", "rgba(255, 184, 0, 0.1)"],
    ["#FF3366", "rgba(255, 51, 102, 0.1)"],
    ["#00B8FF", "rgba(0, 184, 255, 0.1)"],
  ];
  const h = (name || "X").charCodeAt(0) % palette.length;
  const [fg, bg] = palette[h];
  return (
    <div
      className="font-display flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.38,
        fontWeight: 600,
        borderRadius: 8,
        border: `1px solid ${fg}22`,
        boxShadow: `0 0 10px ${fg}15`,
      }}
    >
      {initials(name)}
    </div>
  );
};

const CategoryChip = ({ categoryId, compact = false }) => {
  const cat = getCategory(categoryId);
  if (!cat) return null;
  const Icon = cat.icon;
  return (
    <span
      className="font-mono inline-flex items-center gap-1.5"
      style={{
        color: cat.color,
        background: cat.bg,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        padding: compact ? "3px 8px" : "4px 10px",
        borderRadius: 6,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        border: `1px solid ${cat.color}20`,
        boxShadow: `0 0 8px ${cat.color}10`,
      }}
    >
      <Icon size={compact ? 11 : 12} strokeWidth={2.4} />
      {cat.name}
    </span>
  );
};

// ---------- Toast ----------
const useToast = () => {
  const [msg, setMsg] = useState(null);
  const show = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2200);
  };
  const node = msg && (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] eh-pop"
      style={{
        background: "rgba(12, 18, 35, 0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color: "var(--ink)",
        padding: "10px 18px",
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        letterSpacing: "0.01em",
        border: "1px solid rgba(0, 240, 255, 0.15)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(0, 240, 255, 0.08)",
      }}
    >
      {msg}
    </div>
  );
  return [show, node];
};

const Spinner = ({ size = 20, color = "var(--accent)" }) => (
  <div
    style={{
      width: size,
      height: size,
      border: `2px solid rgba(0, 240, 255, 0.1)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "eh-spin .7s linear infinite",
      flexShrink: 0,
      boxShadow: `0 0 8px ${color}30`,
    }}
  />
);

// =====================================================================
// LIKE BUTTON — single Instagram-style heart, no emoji picker
// =====================================================================
const LikeButton = ({ post, onReact }) => {
  const liked = !!post.userReaction;
  return (
    <button
      onClick={() => onReact(post.id)}
      className="flex items-center gap-1.5"
      style={{
        padding: "7px 11px",
        borderRadius: 6,
        fontSize: 12.5,
        color: liked ? "#FF3366" : "var(--ink-2)",
        fontWeight: liked ? 600 : 400,
        fontFamily: "'Inter', sans-serif",
        background: "transparent",
        transition: "background .15s ease, color .15s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(255, 51, 102, 0.06)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Heart size={15} strokeWidth={2.2} fill={liked ? "#FF3366" : "none"} />
      <span>{liked ? "Liked" : "Like"}</span>
    </button>
  );
};

const LikeSummary = ({ post, onClick }) => {
  const total = totalReactions(post);
  if (total === 0) return <div />;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5"
      style={{ padding: "4px 0" }}
    >
      <Heart size={13} style={{ color: "#FF3366" }} fill="#FF3366" />
      <span
        className="font-body"
        style={{
          fontSize: 12,
          color: "var(--muted)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatNum(total)}
      </span>
    </button>
  );
};

// =====================================================================
// HEADER
// =====================================================================
const notificationText = (type) =>
  ({
    like: "liked your post",
    comment: "commented on your post",
    reply: "replied to your comment",
    repost: "reposted your post",
  })[type] || "interacted with your post";

const Header = ({
  user,
  onLogout,
  onCreate,
  onNavigate,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  notifications,
  unreadCount,
  onOpenNotifications,
  onNotificationClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <header
      style={{
        background: "rgba(6, 8, 15, 0.8)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid var(--glass-border)",
        boxShadow: "0 1px 30px rgba(0, 240, 255, 0.03)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px" }}
        className="flex items-center gap-6"
      >
        <button onClick={() => onNavigate("feed")}>
          <Logo />
        </button>

        <div
          className="hidden md:flex items-center gap-1 flex-1 max-w-md"
          style={{
            background: "rgba(0, 240, 255, 0.03)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            padding: "8px 14px",
            transition: "border-color .2s ease, box-shadow .2s ease",
          }}
        >
          <Search size={15} style={{ color: "var(--muted)" }} />
          <input
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onNavigate("feed");
            }}
            className="font-body flex-1 bg-transparent focus:outline-none text-sm"
            placeholder="Search posts, people, categories…"
            style={{ color: "var(--ink)" }}
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} aria-label="Clear search">
              <X size={13} style={{ color: "var(--muted)" }} />
            </button>
          )}
        </div>

        <div className="flex-1 md:hidden" />

        <button
          onClick={onCreate}
          className="eh-btn eh-btn-accent hidden sm:flex items-center gap-2 text-sm"
          style={{ padding: "8px 14px" }}
        >
          <Plus size={15} strokeWidth={2.5} />
          New Post
        </button>
        <button
          onClick={onCreate}
          aria-label="New post"
          className="sm:hidden eh-btn eh-btn-accent"
          style={{ padding: 8 }}
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>

        <div className="relative">
          <button
            className="relative"
            aria-label="Notifications"
            style={{ padding: 6 }}
            onClick={() => {
              const next = !notifOpen;
              setNotifOpen(next);
              if (next) onOpenNotifications();
            }}
          >
            <Bell size={18} style={{ color: "var(--ink-2)" }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 font-mono flex items-center justify-center eh-glow-pulse"
                style={{
                  background: "var(--danger)",
                  color: "white",
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "0 4px",
                  boxShadow: "0 0 8px rgba(255, 51, 102, 0.4)",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotifOpen(false)}
              />
              <div
                className="fixed eh-card eh-fade-in"
                style={{
                  top: 66,
                  right: 16,
                  width: "min(320px, calc(100vw - 32px))",
                  maxHeight: "min(420px, calc(100vh - 82px))",
                  overflowY: "auto",
                  zIndex: 50,
                  padding: 6,
                  background: "rgba(12, 18, 35, 0.95)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0, 240, 255, 0.04)",
                }}
              >
                <div
                  className="font-mono"
                  style={{
                    padding: "10px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div
                    className="font-body"
                    style={{ padding: "24px 12px", textAlign: "center", fontSize: 13, color: "var(--muted)" }}
                  >
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        onNotificationClick(n);
                        setNotifOpen(false);
                      }}
                      className="flex items-start gap-2.5 w-full text-left"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: n.isRead ? "transparent" : "rgba(0, 240, 255, 0.05)",
                      }}
                    >
                      <Avatar name={n.actor.display} size={30} src={n.actor.avatarUrl} />
                      <div className="flex-1 min-w-0">
                        <div className="font-body" style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600 }}>{n.actor.display}</span>{" "}
                          {notificationText(n.type)}
                          {n.postTitle && (
                            <span style={{ color: "var(--muted)" }}> "{n.postTitle}"</span>
                          )}
                        </div>
                        <div className="font-mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                      {!n.isRead && (
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            background: "var(--accent)",
                            marginTop: 5,
                            flexShrink: 0,
                            boxShadow: "0 0 6px var(--accent)",
                          }}
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)}>
            <Avatar name={user.display} size={34} src={user.avatarUrl} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 mt-2 eh-card eh-fade-in"
                style={{
                  width: 260,
                  zIndex: 20,
                  padding: 6,
                  background: "rgba(12, 18, 35, 0.95)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0, 240, 255, 0.04)",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <div
                    className="font-display text-sm"
                    style={{ fontWeight: 600 }}
                  >
                    {user.display}
                  </div>
                  <div
                    className="font-body text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    @{user.username}
                  </div>
                  <div
                    className="font-body"
                    style={{
                      fontSize: 11,
                      color: "var(--accent-deep)",
                      marginTop: 4,
                    }}
                  >
                    {user.university}
                  </div>
                </div>
                <MenuItem
                  icon={User}
                  label="Your Profile"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                />
                <MenuItem
                  icon={Bookmark}
                  label="Saved"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate("saved");
                  }}
                />
                <MenuItem
                  icon={Settings}
                  label="Settings"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                />
                {user.role === "admin" && (
                  <MenuItem
                    icon={ShieldCheck}
                    label="Admin Panel"
                    highlight
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate("admin");
                    }}
                  />
                )}
                <div
                  style={{
                    height: 1,
                    background: "var(--glass-border)",
                    margin: "4px 0",
                  }}
                />
                <MenuItem
                  icon={LogOut}
                  label="Sign out"
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const MenuItem = ({ icon: Icon, label, onClick, highlight, danger }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2.5 w-full text-left"
    style={{
      padding: "8px 12px",
      borderRadius: 6,
      fontSize: 13,
      color: danger
        ? "var(--danger)"
        : highlight
          ? "var(--accent)"
          : "var(--ink-2)",
      fontWeight: highlight ? 600 : 400,
      fontFamily: "'Inter', sans-serif",
      transition: "background .15s ease",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 240, 255, 0.06)")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    <Icon size={15} strokeWidth={2} />
    {label}
  </button>
);

// =====================================================================
// SIDEBAR
// =====================================================================
const Sidebar = ({
  activeCategory,
  onSelect,
  posts,
  onNavigate,
  currentView,
  savedCount,
}) => {
  const counts = useMemo(() => {
    const c = { all: posts.length };
    CATEGORIES.forEach((cat) => {
      c[cat.id] = posts.filter((p) => p.category === cat.id).length;
    });
    return c;
  }, [posts]);

  return (
    <aside className="hidden lg:block">
      <div style={{ position: "sticky", top: 84 }}>
        <div
          className="font-display"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Categories
        </div>
        <div className="eh-rule mb-3"></div>

        <nav className="space-y-0.5">
          <SidebarItem
            label="All Posts"
            icon={Sparkles}
            count={counts.all}
            active={currentView === "feed" && activeCategory === "all"}
            onClick={() => {
              onNavigate("feed");
              onSelect("all");
            }}
          />
          {CATEGORIES.map((cat) => (
            <SidebarItem
              key={cat.id}
              label={cat.name}
              icon={cat.icon}
              color={cat.color}
              count={counts[cat.id]}
              active={currentView === "feed" && activeCategory === cat.id}
              onClick={() => {
                onNavigate("feed");
                onSelect(cat.id);
              }}
            />
          ))}
        </nav>

        <div
          className="font-display mt-7 mb-3"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Personal
        </div>
        <div className="eh-rule mb-3"></div>
        <SidebarItem
          label="Saved"
          icon={Bookmark}
          count={savedCount}
          active={currentView === "saved"}
          onClick={() => onNavigate("saved")}
        />

        <div className="mt-8">
          <div
            className="font-display"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Guidelines
          </div>
          <div className="eh-rule mb-3"></div>
          <div
            className="font-body"
            style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.65 }}
          >
            Speak honestly. Speak responsibly. Disagree with ideas, not with
            people. This is your campus — keep it worth coming back to.
          </div>
        </div>
      </div>
    </aside>
  );
};

const SidebarItem = ({ label, icon: Icon, color, count, active, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between text-left"
    style={{
      padding: "10px 14px",
      borderRadius: 8,
      background: active ? "rgba(0, 240, 255, 0.08)" : "transparent",
      borderLeft: `3px solid ${active ? "var(--accent)" : "transparent"}`,
      transition: "background .15s ease, border-color .15s ease",
      boxShadow: active ? "0 0 15px rgba(0, 240, 255, 0.05)" : "none",
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.background = "rgba(0, 240, 255, 0.04)";
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = "transparent";
    }}
  >
    <span className="flex items-center gap-2.5">
      <Icon
        size={15}
        strokeWidth={2}
        style={{
          color: color || "var(--ink-2)",
          filter: active && color ? `drop-shadow(0 0 4px ${color})` : "none",
        }}
      />
      <span
        className="font-display"
        style={{
          fontSize: 13.5,
          fontWeight: active ? 600 : 500,
          color: active ? "var(--accent)" : "var(--ink)",
          textShadow: active ? "0 0 8px rgba(0, 240, 255, 0.2)" : "none",
        }}
      >
        {label}
      </span>
    </span>
    <span
      className="font-mono"
      style={{
        fontSize: 11,
        color: active ? "var(--accent)" : "var(--muted)",
      }}
    >
      {count}
    </span>
  </button>
);

// =====================================================================
// RIGHT RAIL
// =====================================================================
const RightRail = ({ posts }) => {
  const trending = useMemo(
    () =>
      [...posts]
        .sort(
          (a, b) =>
            totalReactions(b) +
            b.comments +
            b.reposts -
            (totalReactions(a) + a.comments + a.reposts),
        )
        .slice(0, 4),
    [posts],
  );

  return (
    <aside className="hidden xl:block">
      <div style={{ position: "sticky", top: 84 }} className="space-y-6">
        <div className="eh-card" style={{ padding: 18 }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: "var(--accent)" }} />
            <div
              className="font-display"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Trending on Campus
            </div>
          </div>
          <div className="eh-rule mb-4"></div>
          <ol className="space-y-3.5">
            {trending.map((p, i) => (
              <li key={p.id} className="flex gap-3">
                <span
                  className="font-mono"
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--accent)",
                    lineHeight: 1,
                    minWidth: 24,
                    textShadow: "0 0 8px rgba(0, 240, 255, 0.4)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--ink)",
                      lineHeight: 1.4,
                      marginBottom: 4,
                    }}
                  >
                    {p.title.length > 64 ? p.title.slice(0, 64) + "…" : p.title}
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 10, color: "var(--muted)" }}
                  >
                    {formatNum(totalReactions(p) + p.comments)} INT ·{" "}
                    {getCategory(p.category)?.name.toUpperCase()}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div
          className="eh-card eh-holographic"
          style={{
            padding: 20,
            border: "1px solid rgba(0, 240, 255, 0.25)",
            boxShadow: "0 0 20px rgba(0, 240, 255, 0.05), inset 0 1px 0 rgba(255,255,255,0.02)",
          }}
        >
          <Hexagon size={18} style={{ color: "var(--accent)", filter: "drop-shadow(0 0 6px var(--accent))" }} />
          <div
            className="font-display mt-3"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
              textShadow: "0 0 10px rgba(0, 240, 255, 0.2)",
            }}
          >
            Your voice matters here.
          </div>
          <div
            className="font-body mt-2"
            style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}
          >
            Every post, every comment, every reaction shapes the campus
            conversation. Be the reason someone feels heard today.
          </div>
        </div>

        <div
          className="font-mono px-1"
          style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.7 }}
        >
          ECHOHIVE // MULTI-CAMPUS COMMAND
          <br />
          ABOUT · GUIDELINES · PRIVACY · CONTACT
          <br />
          <span style={{ color: "rgba(0, 240, 255, 0.2)" }}>
            © 2026 // SYSTEM TERMINAL
          </span>
        </div>
      </div>
    </aside>
  );
};

// =====================================================================
// POST CARD
// =====================================================================
const ActionBtn = ({
  icon: Icon,
  label,
  active,
  activeColor,
  onClick,
  fillWhenActive,
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5"
    style={{
      padding: "7px 11px",
      borderRadius: 6,
      fontSize: 12.5,
      color: active ? activeColor : "var(--ink-2)",
      fontWeight: active ? 600 : 400,
      fontFamily: "'Inter', sans-serif",
      background: "transparent",
      transition: "background .15s ease, color .15s ease",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 240, 255, 0.05)")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    <Icon
      size={14}
      strokeWidth={active ? 2.4 : 2}
      fill={active && fillWhenActive ? activeColor : "none"}
      style={{
        filter: active ? `drop-shadow(0 0 4px ${activeColor})` : "none",
      }}
    />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const PostCard = ({
  post,
  onReact,
  onOpen,
  onDelete,
  onBookmark,
  onShare,
  onRepost,
  onReport,
  isAdmin,
  currentUserId,
  index,
}) => {
  const isOwner = post.author.id === currentUserId;

  return (
    <article
      className="eh-card eh-fade-up"
      style={{
        padding: "20px 22px",
        animationDelay: `${Math.min(index * 40, 280)}ms`,
      }}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.author.display} size={38} src={post.author.avatarUrl} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-display"
                style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}
              >
                {post.author.display}
              </span>
              <span
                className="font-body"
                style={{ fontSize: 12, color: "var(--muted)" }}
              >
                @{post.author.username}
              </span>
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 11, color: "var(--muted)" }}
            >
              <span style={{ color: "var(--accent)", textShadow: "0 0 8px rgba(0, 240, 255, 0.2)" }}>
                {post.author.university}
              </span>
              {post.author.year && <> · {post.author.year}</>} ·{" "}
              {timeAgo(post.createdAt)}
            </div>
          </div>
        </div>
        <CategoryChip categoryId={post.category} compact />
      </header>

      <button onClick={() => onOpen(post)} className="text-left w-full block">
        <h3
          className="font-display"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.35,
            marginBottom: 8,
            letterSpacing: "-0.015em",
          }}
        >
          {post.title}
        </h3>
        <p
          className="font-body"
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            marginBottom: 14,
          }}
        >
          {post.content.length > 240
            ? post.content.slice(0, 240) + "…"
            : post.content}
        </p>
      </button>

      <MediaGallery items={post.media} />

      <div
        className="flex items-center justify-between mb-2.5"
        style={{ minHeight: 22 }}
      >
        <LikeSummary post={post} onClick={() => onOpen(post)} />
        <div
          className="flex items-center gap-3 font-body"
          style={{ fontSize: 11.5, color: "var(--muted)" }}
        >
          <span className="flex items-center gap-1">
            <Eye size={11} /> {formatNum(post.views)}
          </span>
          <span>{formatNum(post.comments)} comments</span>
          <span>{formatNum(post.reposts)} reposts</span>
        </div>
      </div>

      <footer
        className="flex items-center justify-between flex-wrap gap-1"
        style={{ borderTop: "1px solid var(--line-2)", paddingTop: 8 }}
      >
        <div className="flex items-center gap-1 flex-wrap">
          <LikeButton post={post} onReact={onReact} />
          <ActionBtn
            icon={MessageCircle}
            label="Comment"
            onClick={() => onOpen(post)}
          />
          <ActionBtn
            icon={Repeat2}
            label={post.isReposted ? "Reposted" : "Repost"}
            active={post.isReposted}
            activeColor="var(--success)"
            onClick={() => onRepost(post.id)}
          />
          <ActionBtn
            icon={Share2}
            label="Share"
            onClick={() => onShare(post)}
          />
          <ActionBtn
            icon={Bookmark}
            label={post.isBookmarked ? "Saved" : "Save"}
            active={post.isBookmarked}
            activeColor="var(--accent-deep)"
            fillWhenActive
            onClick={() => onBookmark(post.id)}
          />
        </div>

        <div className="flex items-center gap-1">
          {!isOwner && !isAdmin && (
            <button
              onClick={() => onReport(post.id)}
              title="Report post"
              className="flex items-center justify-center"
              style={{
                fontSize: 12,
                color: "var(--muted)",
                padding: 6,
                borderRadius: 6,
                transition: "all .15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--danger)";
                e.currentTarget.style.background = "rgba(255, 51, 102, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Flag size={13} />
            </button>
          )}
          {(isAdmin || isOwner) && (
            <button
              onClick={() => onDelete(post.id)}
              className="flex items-center justify-center"
              style={{
                fontSize: 12,
                color: "var(--muted)",
                padding: 6,
                borderRadius: 6,
                transition: "all .15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--danger)";
                e.currentTarget.style.background = "rgba(255, 51, 102, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </footer>
    </article>
  );
};

// =====================================================================
// FEED
// =====================================================================
const SortTab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className="font-display"
    style={{
      fontSize: 11,
      fontWeight: active ? 600 : 500,
      padding: "6px 14px",
      borderRadius: 6,
      color: active ? "var(--accent)" : "var(--ink-2)",
      background: active ? "rgba(0, 240, 255, 0.08)" : "transparent",
      border: `1px solid ${active ? "rgba(0, 240, 255, 0.25)" : "var(--glass-border)"}`,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      transition: "all .2s ease",
      boxShadow: active ? "0 0 10px rgba(0, 240, 255, 0.05)" : "none",
    }}
  >
    {label}
  </button>
);

const MobileChip = ({ label, active, onClick, color }) => (
  <button
    onClick={onClick}
    className="font-mono shrink-0"
    style={{
      fontSize: 11,
      fontWeight: active ? 700 : 500,
      padding: "7px 14px",
      borderRadius: 8,
      color: active ? "#06080F" : color || "var(--ink-2)",
      background: active ? color || "var(--accent)" : "rgba(12, 18, 35, 0.5)",
      border: `1px solid ${active ? color || "var(--accent)" : "var(--glass-border)"}`,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
      transition: "all .15s ease",
      boxShadow: active ? `0 0 15px ${color || "var(--accent)"}30` : "none",
    }}
  >
    {label.toUpperCase()}
  </button>
);

const Feed = ({
  posts,
  activeCategory,
  onCategoryChange,
  onReact,
  onOpen,
  onDelete,
  onBookmark,
  onShare,
  onRepost,
  onReport,
  isAdmin,
  currentUserId,
  onCreate,
  title,
  subtitle,
  emptyState,
  loading,
  searchQuery,
  hasMore,
  loadingMore,
  onLoadMore,
}) => {
  const [sort, setSort] = useState("recent");

  const filtered = useMemo(() => {
    let list =
      activeCategory === "all"
        ? posts
        : posts.filter((p) => p.category === activeCategory);
    const q = searchQuery?.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.title, p.content, p.author.display, p.author.username, getCategory(p.category)?.name]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q)),
      );
    }
    if (sort === "popular")
      list = [...list].sort((a, b) => totalReactions(b) - totalReactions(a));
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [posts, activeCategory, sort, searchQuery]);

  const cat = activeCategory === "all" ? null : getCategory(activeCategory);

  return (
    <main>
      <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="font-display"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            {title || (cat ? cat.name : "The Feed")}
          </h1>
          <div className="eh-rule mt-3 mb-2.5"></div>
          <p
            className="font-body"
            style={{ fontSize: 13.5, color: "var(--ink-2)", maxWidth: 520 }}
          >
            {subtitle ||
              (cat
                ? `Opinions, questions, and announcements tagged ${cat.name.toLowerCase()}. Fresh first.`
                : "The pulse of the campus, ordered by the conversations that matter right now.")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <SortTab
            label="Recent"
            active={sort === "recent"}
            onClick={() => setSort("recent")}
          />
          <SortTab
            label="Popular"
            active={sort === "popular"}
            onClick={() => setSort("popular")}
          />
        </div>
      </div>

      {onCategoryChange && (
        <div
          className="lg:hidden -mx-1 mb-5 flex gap-2 overflow-x-auto eh-scroll"
          style={{ paddingBottom: 6 }}
        >
          <MobileChip
            label="All"
            active={activeCategory === "all"}
            onClick={() => onCategoryChange("all")}
          />
          {CATEGORIES.map((c) => (
            <MobileChip
              key={c.id}
              label={c.name}
              active={activeCategory === c.id}
              color={c.color}
              onClick={() => onCategoryChange(c.id)}
            />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div
            className="eh-card"
            style={{
              padding: 48,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Spinner size={24} />
            <span
              className="font-body"
              style={{ fontSize: 13.5, color: "var(--muted)" }}
            >
              Loading posts…
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="eh-card" style={{ padding: 48, textAlign: "center" }}>
            <Filter
              size={22}
              style={{ color: "var(--muted)", margin: "0 auto 10px" }}
            />
            <div
              className="font-display"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {searchQuery ? "No matches" : emptyState || "Nothing here yet"}
            </div>
            <div
              className="font-body"
              style={{ fontSize: 13, color: "var(--muted)" }}
            >
              {searchQuery
                ? `Nothing found for "${searchQuery}".`
                : "Be the first to share something in this space."}
            </div>
            {!searchQuery && onCreate && (
              <button
                onClick={onCreate}
                className="eh-btn eh-btn-primary mt-4 text-sm"
                style={{ padding: "9px 16px" }}
              >
                Write a post
              </button>
            )}
          </div>
        ) : (
          filtered.map((p, i) => (
            <PostCard
              key={p.id}
              post={p}
              index={i}
              onReact={onReact}
              onOpen={onOpen}
              onDelete={onDelete}
              onBookmark={onBookmark}
              onShare={onShare}
              onRepost={onRepost}
              onReport={onReport}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      {!loading && !searchQuery && filtered.length > 0 && hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="eh-btn eh-btn-ghost text-sm flex items-center gap-2"
            style={{ padding: "9px 20px" }}
          >
            {loadingMore ? (
              <>
                <Spinner size={13} /> Loading…
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </main>
  );
};

// =====================================================================
// POST DETAIL — with nested comments
// =====================================================================
const CommentNode = ({
  comment,
  allComments,
  currentUser,
  onReply,
  depth = 0,
}) => {
  const replies = allComments.filter((c) => c.parentId === comment.id);
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState("");
  const [replyMedia, setReplyMedia] = useState(null);

  const submit = () => {
    if (!text.trim()) return;
    onReply(comment.postId, text.trim(), comment.id, replyMedia);
    setText("");
    setReplyMedia(null);
    setReplyOpen(false);
  };

  return (
    <div
      style={{
        marginLeft: depth > 0 ? 28 : 0,
        paddingLeft: depth > 0 ? 12 : 0,
        borderLeft: depth > 0 ? "2px solid rgba(0, 240, 255, 0.1)" : "none",
      }}
    >
      <div className="flex gap-3">
        <Avatar name={comment.author.display} size={depth > 0 ? 28 : 32} src={comment.author.avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="eh-card" style={{ padding: "10px 13px" }}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="font-display"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}
              >
                {comment.author.display}
              </span>
              <span
                className="font-body"
                style={{ fontSize: 11.5, color: "var(--muted)" }}
              >
                @{comment.author.username} · {timeAgo(comment.createdAt)}
              </span>
            </div>
            <p
              className="font-body"
              style={{
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "var(--ink-2)",
              }}
            >
              {comment.content}
            </p>
            <MediaGallery
              items={comment.media ? [comment.media] : []}
              maxHeight={220}
            />
          </div>

          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button
              onClick={() => setReplyOpen((v) => !v)}
              className="font-mono flex items-center gap-1"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <CornerDownRight size={11} /> Reply
            </button>
            {replies.length > 0 && (
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "var(--muted)" }}
              >
                {replies.length} {replies.length === 1 ? "REPLY" : "REPLIES"}
              </span>
            )}
          </div>

          {replyOpen && (
            <div className="flex gap-2 mt-2 eh-fade-in">
              <Avatar name={currentUser.display} size={26} src={currentUser.avatarUrl} />
              <div className="flex-1">
                <div className="flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder={`Reply to ${comment.author.display.split(" ")[0]}…`}
                    className="eh-input flex-1 font-body text-xs"
                    style={{ padding: "7px 11px" }}
                    autoFocus
                  />
                  <button
                    onClick={submit}
                    className="eh-btn eh-btn-primary"
                    style={{ padding: "7px 14px", fontSize: 11 }}
                    disabled={!text.trim()}
                  >
                    <Send size={11} />
                  </button>
                </div>
                <div className="mt-1.5">
                  <SingleMediaAttach
                    file={replyMedia}
                    onPick={setReplyMedia}
                    onClear={() => setReplyMedia(null)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              allComments={allComments}
              currentUser={currentUser}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PostDetail = ({
  post,
  comments,
  onClose,
  onReact,
  onAddComment,
  onBookmark,
  onShare,
  onRepost,
  onReport,
  currentUser,
}) => {
  const [text, setText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [commentMedia, setCommentMedia] = useState(null);
  const topLevel = comments.filter((c) => c.parentId === null);

  const submit = async () => {
    if (!text.trim() || commenting) return;
    setCommenting(true);
    try {
      await onAddComment(post.id, text.trim(), null, commentMedia);
      setText("");
      setCommentMedia(null);
    } finally {
      setCommenting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{
        background: "rgba(3, 4, 8, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "24px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="eh-card w-full"
        style={{ maxWidth: 780, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 240, 255, 0.05)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: "14px 22px",
            borderBottom: "1px solid var(--line-2)",
          }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2 font-display"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--ink-2)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <ArrowLeft size={14} /> Back to feed
          </button>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        <div style={{ padding: "28px 32px 24px" }}>
          <CategoryChip categoryId={post.category} />
          <h1
            className="font-display mt-4"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {post.title}
          </h1>

          <div
            className="flex items-center gap-3 mt-4"
            style={{
              paddingBottom: 18,
              borderBottom: "1px solid var(--line-2)",
            }}
          >
            <Avatar name={post.author.display} size={40} src={post.author.avatarUrl} />
            <div>
              <div
                className="font-display"
                style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
              >
                {post.author.display}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 11, color: "var(--muted)" }}
              >
                @{post.author.username} ·{" "}
                <span style={{ color: "var(--accent)" }}>
                  {post.author.university}
                </span>
                {post.author.year && <> · {post.author.year}</>} ·{" "}
                {timeAgo(post.createdAt)}
              </div>
            </div>
          </div>

          <p
            className="font-body mt-5"
            style={{
              fontSize: 16,
              lineHeight: 1.75,
              color: "var(--ink)",
              whiteSpace: "pre-wrap",
            }}
          >
            {post.content}
          </p>

          <div className="mt-5">
            <MediaGallery items={post.media} maxHeight={460} />
          </div>

          <div
            className="flex items-center justify-between flex-wrap gap-3 mt-6 pt-4"
            style={{ borderTop: "1px solid var(--line-2)" }}
          >
            <LikeSummary post={post} />
            <div
              className="flex items-center gap-4 font-body"
              style={{ fontSize: 12, color: "var(--muted)" }}
            >
              <span className="flex items-center gap-1">
                <Eye size={12} /> {formatNum(post.views)} views
              </span>
              <span>{formatNum(post.comments)} comments</span>
              <span>{formatNum(post.reposts)} reposts</span>
            </div>
          </div>

          <div
            className="flex items-center gap-1 mt-3 flex-wrap"
            style={{ borderTop: "1px solid var(--line-2)", paddingTop: 12 }}
          >
            <LikeButton post={post} onReact={onReact} />
            <ActionBtn icon={MessageCircle} label="Comment" />
            <ActionBtn
              icon={Repeat2}
              label={post.isReposted ? "Reposted" : "Repost"}
              active={post.isReposted}
              activeColor="var(--success)"
              onClick={() => onRepost(post.id)}
            />
            <ActionBtn
              icon={Share2}
              label="Share"
              onClick={() => onShare(post)}
            />
            <ActionBtn
              icon={Bookmark}
              label={post.isBookmarked ? "Saved" : "Save"}
              active={post.isBookmarked}
              activeColor="var(--accent-deep)"
              fillWhenActive
              onClick={() => onBookmark(post.id)}
            />
            {post.author.id !== currentUser.id && (
              <ActionBtn icon={Flag} label="Report" onClick={() => onReport(post.id)} />
            )}
          </div>
        </div>

        <div style={{ padding: "20px 32px 28px", background: "rgba(6, 8, 15, 0.45)" }}>
          <div
            className="font-mono"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {comments.length} {comments.length === 1 ? "REPLY" : "REPLIES"}
          </div>
          <div className="eh-rule mb-5"></div>

          <div className="flex gap-3 mb-6">
            <Avatar name={currentUser.display} size={36} src={currentUser.avatarUrl} />
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add to the conversation…"
                className="eh-input w-full font-body"
                rows={2}
                style={{
                  padding: "10px 12px",
                  fontSize: 13.5,
                  resize: "vertical",
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <SingleMediaAttach
                  file={commentMedia}
                  onPick={setCommentMedia}
                  onClear={() => setCommentMedia(null)}
                />
                <button
                  onClick={submit}
                  className="eh-btn eh-btn-primary text-sm"
                  style={{
                    padding: "7px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    opacity: !text.trim() || commenting ? 0.4 : 1,
                  }}
                  disabled={!text.trim() || commenting}
                >
                  {commenting ? (
                    <>
                      <Spinner size={13} color="#06080F" /> Posting…
                    </>
                  ) : (
                    "Reply"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {topLevel.length === 0 && (
              <div
                className="font-body text-center"
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  padding: "16px 0",
                }}
              >
                Be the first to reply.
              </div>
            )}
            {topLevel.map((c) => (
              <CommentNode
                key={c.id}
                comment={c}
                allComments={comments}
                currentUser={currentUser}
                onReply={onAddComment}
              />
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
  <label
    className="font-display block mb-2"
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: "var(--ink-2)",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </label>
);

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
}) => (
  <div>
    <Label>{label}</Label>
    <div className="relative">
      {Icon && (
        <Icon
          size={15}
          style={{
            color: "var(--muted)",
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="eh-input w-full font-body"
        placeholder={placeholder}
        style={{
          padding: Icon ? "10px 14px 10px 38px" : "10px 14px",
          fontSize: 14,
        }}
      />
    </div>
  </div>
);

// =====================================================================
// CREATE POST MODAL
// =====================================================================
const CreatePost = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("academics");
  const [submitting, setSubmitting] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const canSubmit = title.trim().length >= 8 && content.trim().length >= 20;

  useEffect(() => {
    return () => mediaItems.forEach((m) => URL.revokeObjectURL(m.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeMedia = (index) => {
    setMediaItems((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category,
        mediaFiles: mediaItems.map((m) => m.file),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{
        background: "rgba(3, 4, 8, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "32px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="eh-card w-full"
        style={{ maxWidth: 640, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 240, 255, 0.05)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--line-2)",
          }}
        >
          <div>
            <div
              className="font-display"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
              }}
            >
              Share something
            </div>
            <div
              className="font-body"
              style={{ fontSize: 12, color: "var(--muted)" }}
            >
              Your post will be visible to the campus community.
            </div>
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <Label>Category</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className="font-mono flex items-center justify-center gap-1.5"
                  style={{
                    padding: "10px 8px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    background: active ? c.bg : "rgba(12, 18, 35, 0.5)",
                    color: active ? c.color : "var(--ink-2)",
                    border: `1px solid ${active ? c.color : "var(--glass-border)"}`,
                    transition: "all .15s ease",
                    boxShadow: active ? `0 0 10px ${c.color}20` : "none",
                  }}
                >
                  <Icon size={12} strokeWidth={2.4} />
                  {c.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          <Label>Title</Label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="Give your post a clear headline"
            className="eh-input w-full font-display mb-1"
            style={{ padding: "11px 14px", fontSize: 15, fontWeight: 500 }}
          />
          <div
            className="font-body"
            style={{ fontSize: 11, color: "var(--muted)", marginBottom: 18 }}
          >
            {title.length} / 140
          </div>

          <Label>Your thoughts</Label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Be honest, be respectful, be clear about what you're asking or saying."
            rows={6}
            className="eh-input w-full font-body"
            style={{
              padding: "12px 14px",
              fontSize: 14,
              lineHeight: 1.6,
              resize: "vertical",
              marginBottom: 18,
            }}
          />

          <Label>Photos & video (optional)</Label>
          <MediaPicker
            items={mediaItems}
            onAdd={(accepted) => setMediaItems((prev) => [...prev, ...accepted])}
            onRemove={removeMedia}
          />

          <div className="flex justify-between items-center mt-6">
            <div
              className="font-body"
              style={{ fontSize: 11.5, color: "var(--muted)" }}
            >
              Posting as an EchoHive community member
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="eh-btn eh-btn-ghost text-sm"
                style={{ padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="eh-btn eh-btn-primary text-sm"
                style={{
                  padding: "8px 20px",
                  opacity: canSubmit && !submitting ? 1 : 0.4,
                  cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {submitting ? (
                  <>
                    <Spinner size={14} color="#06080F" /> Publishing…
                  </>
                ) : (
                  "Publish"
                )}
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
  const [comment, setComment] = useState("");
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{
        background: "rgba(3, 4, 8, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "32px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="eh-card w-full"
        style={{ maxWidth: 540, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 240, 255, 0.05)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--line-2)",
          }}
        >
          <div
            className="font-display"
            style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}
          >
            Repost to your followers
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--muted)" }} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a thought (optional)…"
            maxLength={280}
            rows={3}
            className="eh-input w-full font-body"
            style={{ padding: "10px 12px", fontSize: 13.5, marginBottom: 14 }}
          />
          <div
            className="eh-card"
            style={{ padding: 12, background: "rgba(6, 8, 15, 0.45)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar name={post.author.display} size={24} src={post.author.avatarUrl} />
              <span
                className="font-display"
                style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}
              >
                {post.author.display}
              </span>
              <span
                className="font-body"
                style={{ fontSize: 11, color: "var(--muted)" }}
              >
                · {timeAgo(post.createdAt)}
              </span>
            </div>
            <div
              className="font-display"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ink)",
                marginBottom: 4,
              }}
            >
              {post.title}
            </div>
            <div
              className="font-body"
              style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}
            >
              {post.content.length > 140
                ? post.content.slice(0, 140) + "…"
                : post.content}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              className="eh-btn eh-btn-ghost text-sm"
              style={{ padding: "8px 16px" }}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(comment.trim() || null)}
              className="eh-btn eh-btn-primary text-sm"
              style={{ padding: "8px 20px" }}
            >
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{
        background: "rgba(3, 4, 8, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "32px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="eh-card w-full"
        style={{ maxWidth: 460, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 240, 255, 0.05)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--line-2)",
          }}
        >
          <div
            className="font-display"
            style={{ fontSize: 15, fontWeight: 600 }}
          >
            Share this post
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--muted)" }} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          <div
            className="font-display"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink)",
              marginBottom: 10,
            }}
          >
            {post.title}
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              className="eh-input flex-1 font-body"
              style={{
                padding: "9px 12px",
                fontSize: 12.5,
                color: "var(--ink-2)",
              }}
            />
            <button
              onClick={() => onCopy(link)}
              className="eh-btn eh-btn-primary flex items-center gap-1.5 text-sm"
              style={{ padding: "9px 14px" }}
            >
              <Link2 size={13} /> Copy
            </button>
          </div>
          <div
            className="font-body mt-5"
            style={{
              fontSize: 11.5,
              color: "var(--muted)",
              textAlign: "center",
            }}
          >
            Tip: on a phone, the system share sheet will open automatically.
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// PROFILE SETTINGS — upload/change profile picture
// =====================================================================
const ProfileSettingsModal = ({ user, onClose, onSaved }) => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickFile = (f) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (f.size > MAX_MEDIA_BYTES) {
      setError("Image is larger than 25MB");
      return;
    }
    setError("");
    setFile(f);
  };

  const save = async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      const avatarUrl = await updateAvatar(file);
      onSaved(avatarUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{
        background: "rgba(3, 4, 8, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "32px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="eh-card w-full"
        style={{ maxWidth: 420, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 240, 255, 0.05)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: "16px 24px", borderBottom: "1px solid var(--line-2)" }}
        >
          <div
            className="font-display"
            style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}
          >
            Your profile
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        <div className="flex flex-col items-center" style={{ padding: 28 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative"
            style={{ width: 96, height: 96 }}
          >
            {preview || user.avatarUrl ? (
              <img
                src={preview || user.avatarUrl}
                alt=""
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  objectFit: "cover",
                  border: "1px solid var(--glass-border)",
                }}
              />
            ) : (
              <Avatar name={user.display} size={96} />
            )}
            <span
              className="flex items-center justify-center"
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderRadius: 999,
                background: "var(--accent)",
                border: "2px solid var(--bg)",
              }}
            >
              <Camera size={14} color="#06080F" />
            </span>
          </button>
          <div
            className="font-body mt-3"
            style={{ fontSize: 12, color: "var(--muted)" }}
          >
            Tap the photo to choose a new one
          </div>
          {error && (
            <div
              className="font-body mt-2"
              style={{ fontSize: 12, color: "var(--danger)" }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-6 w-full">
            <button
              onClick={onClose}
              disabled={saving}
              className="eh-btn eh-btn-ghost text-sm flex-1"
              style={{ padding: "9px 16px" }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!file || saving}
              className="eh-btn eh-btn-primary text-sm flex-1 flex items-center justify-center gap-2"
              style={{
                padding: "9px 16px",
                opacity: !file || saving ? 0.4 : 1,
                cursor: !file || saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? (
                <>
                  <Spinner size={13} color="#06080F" /> Saving…
                </>
              ) : (
                "Save photo"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// REPORT CONTENT
// =====================================================================
const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Misinformation",
  "Inappropriate content",
  "Something else",
];

const ReportModal = ({ onClose, onSubmit }) => {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(reason, details.trim() || null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center eh-fade-in"
      style={{
        background: "rgba(3, 4, 8, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "32px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="eh-card w-full"
        style={{ maxWidth: 420, boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 240, 255, 0.05)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: "16px 24px", borderBottom: "1px solid var(--line-2)" }}
        >
          <div
            className="font-display"
            style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}
          >
            Report content
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <Label>Why are you reporting this?</Label>
          <div className="space-y-1.5 mb-5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className="flex items-center gap-2 w-full text-left font-body"
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  color: reason === r ? "var(--accent)" : "var(--ink-2)",
                  background: reason === r ? "rgba(0, 240, 255, 0.06)" : "transparent",
                  border: `1px solid ${reason === r ? "rgba(0, 240, 255, 0.25)" : "var(--glass-border)"}`,
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <Label>Additional details (optional)</Label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Anything that would help a moderator review this."
            rows={3}
            maxLength={500}
            className="eh-input w-full font-body"
            style={{ padding: "10px 12px", fontSize: 13.5, resize: "vertical" }}
          />

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              disabled={submitting}
              className="eh-btn eh-btn-ghost text-sm"
              style={{ padding: "8px 16px" }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="eh-btn eh-btn-primary text-sm flex items-center gap-2"
              style={{ padding: "8px 20px" }}
            >
              {submitting ? (
                <>
                  <Spinner size={13} color="#06080F" /> Reporting…
                </>
              ) : (
                "Submit report"
              )}
            </button>
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
  avatarUrl: res.profile.avatar_url || null,
});

const AuthView = ({ onLogin, toast, initialMode }) => {
  const [mode, setMode] = useState(initialMode || "login"); // 'login' | 'register' | 'forgot' | 'reset'
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    newPassword: "",
    username: "",
    display: "",
    university: "Institute of Accountancy Arusha",
  });

  const switchMode = (m) => {
    setMode(m);
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await signIn({ email: form.email, password: form.password });
      const res = await getCurrentUser();
      if (res) onLogin(toUserShape(res));
      else toast("Signed in but profile not found — contact support.");
    } catch (err) {
      toast(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const data = await signUp({
        email: form.email,
        password: form.password,
        username: form.username,
        displayName: form.display,
        university: form.university,
      });
      if (data.session) {
        // Email confirmation is off (or already satisfied) — log straight in.
        const res = await getCurrentUser();
        if (res) onLogin(toUserShape(res));
        else switchMode("login");
      } else {
        switchMode("check-email");
      }
    } catch (err) {
      toast(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleResendConfirmation = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await resendConfirmationEmail(form.email);
      toast(`Confirmation email resent to ${form.email}`);
    } catch (err) {
      toast(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleForgot = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(form.email);
      toast(`Reset link sent to ${form.email}`);
    } catch (err) {
      toast(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleReset = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await updatePassword(form.newPassword);
      toast("Password updated");
      switchMode("login");
    } catch (err) {
      toast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="eh-root min-h-screen hex-texture flex items-center justify-center"
      style={{ padding: 20, position: "relative", overflow: "hidden" }}
    >
      <GlobalStyles />
      <div
        className="eh-auth-orb"
        style={{
          width: 420,
          height: 420,
          top: "-10%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(0,240,255,0.16) 0%, transparent 70%)",
        }}
      />
      <div
        className="eh-auth-orb"
        style={{
          width: 380,
          height: 380,
          bottom: "-12%",
          right: "-6%",
          background: "radial-gradient(circle, rgba(179,102,255,0.14) 0%, transparent 70%)",
          animationDelay: "-7s",
        }}
      />
      <div
        className="w-full grid md:grid-cols-2 gap-10 items-center"
        style={{ maxWidth: 980, position: "relative", zIndex: 1 }}
      >
        <div className="hidden md:block eh-fade-up">
          <Logo size={40} />
          <h1
            className="font-display mt-10"
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: "var(--ink)",
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
            }}
          >
            Your voice.
            <br />
            <span style={{ color: "var(--accent)", textShadow: "0 0 20px rgba(0, 240, 255, 0.4)" }}>Your campus.</span>
          </h1>
          <div className="eh-rule mt-5 mb-5" style={{ width: 48 }}></div>
          <p
            className="font-body"
            style={{
              fontSize: 15.5,
              color: "var(--ink-2)",
              lineHeight: 1.7,
              maxWidth: 420,
            }}
          >
            A considered space for the opinions, questions, and conversations
            that shape student life — across every university that joins us.
            Structured. Accountable. Yours.
          </p>
          <div className="mt-10 space-y-5">
            {[
              [
                "Open to every campus",
                "Pick your university when you sign up. EchoHive is not tied to one institution.",
              ],
              [
                "Live, always",
                "Likes, replies, and new posts appear the moment they happen — no refresh needed.",
              ],
              [
                "Saved, shared, reposted",
                "Bookmark for yourself. Repost what your peers should see. Share beyond.",
              ],
            ].map(([h, s], i) => (
              <div
                key={i}
                className="flex gap-3 eh-fade-up"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(0, 240, 255, 0.1)",
                    border: "1px solid rgba(0, 240, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    shrink: 0,
                    marginTop: 2,
                    boxShadow: "0 0 10px rgba(0, 240, 255, 0.15)",
                  }}
                >
                  <Check
                    size={14}
                    style={{ color: "var(--accent)" }}
                    strokeWidth={3}
                  />
                </div>
                <div>
                  <div
                    className="font-display"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {h}
                  </div>
                  <div
                    className="font-body"
                    style={{
                      fontSize: 13,
                      color: "var(--ink-2)",
                      lineHeight: 1.55,
                    }}
                  >
                    {s}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="eh-card eh-fade-up"
          style={{
            padding: "40px 40px 36px",
            borderRadius: 20,
            animationDelay: "120ms",
            background: "rgba(12, 18, 35, 0.55)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: "1px solid rgba(0, 240, 255, 0.15)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45), 0 0 40px rgba(0, 240, 255, 0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="md:hidden mb-6">
            <Logo />
          </div>

          <div key={mode} className="eh-mode-switch">
          <div
            className="font-display"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {mode === "login" && "Welcome back"}
            {mode === "register" && "Create account"}
            {mode === "check-email" && "One more step"}
            {mode === "forgot" && "Forgot password"}
            {mode === "reset" && "Set a new password"}
          </div>
          <h2
            className="font-display mt-1"
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {mode === "login" && "Sign in to EchoHive"}
            {mode === "register" && "Join the conversation"}
            {mode === "check-email" && "Confirm your email"}
            {mode === "forgot" && "We'll send a reset link"}
            {mode === "reset" && "Almost done"}
          </h2>
          <div className="eh-rule mt-4 mb-6"></div>

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="you@example.com"
                type="email"
                icon={Mail}
              />
              <div>
                <div className="flex justify-between items-end mb-2">
                  <Label>Password</Label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--accent)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound
                    size={15}
                    style={{
                      color: "var(--muted)",
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="eh-input w-full font-body"
                    placeholder="••••••••"
                    style={{ padding: "10px 40px 10px 38px", fontSize: 14 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPw ? (
                      <EyeOff size={15} style={{ color: "var(--muted)" }} />
                    ) : (
                      <Eye size={15} style={{ color: "var(--muted)" }} />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="eh-btn eh-btn-primary w-full"
                style={{
                  padding: "11px",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Spinner size={16} color="#06080F" /> Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
              <div
                className="font-body text-center"
                style={{ fontSize: 13, color: "var(--ink-2)" }}
              >
                New to EchoHive?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-mono"
                  style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12, letterSpacing: "0.02em" }}
                >
                  CREATE AN ACCOUNT
                </button>
              </div>
              <div
                className="pt-4"
                style={{ borderTop: "1px solid var(--line-2)" }}
              >
                <div
                  className="font-body text-center"
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    lineHeight: 1.6,
                  }}
                >
                  EchoHive connects ideas, people, and innovation in one smart
                  digital workspace.
                </div>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field
                label="Full name"
                value={form.display}
                onChange={(v) => setForm({ ...form, display: v })}
                placeholder="Jane Doe"
                icon={User}
              />
              <Field
                label="Username"
                value={form.username}
                onChange={(v) => setForm({ ...form, username: v })}
                placeholder="jane.d"
              />
              <div>
                <Label>University</Label>
                <div className="relative">
                  <Building2
                    size={15}
                    style={{
                      color: "var(--muted)",
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <select
                    value={form.university}
                    onChange={(e) =>
                      setForm({ ...form, university: e.target.value })
                    }
                    className="eh-input w-full font-body"
                    style={{
                      padding: "10px 14px 10px 38px",
                      fontSize: 14,
                      cursor: "pointer",
                      background: "rgba(6, 8, 15, 0.8)",
                    }}
                  >
                    {UNIVERSITIES.map((u) => (
                      <option key={u} value={u} style={{ background: "var(--bg-elevated)", color: "var(--ink)" }}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="you@example.com"
                type="email"
                icon={Mail}
              />
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    style={{
                      color: "var(--muted)",
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="eh-input w-full font-body"
                    placeholder="At least 8 characters"
                    style={{ padding: "10px 40px 10px 38px", fontSize: 14 }}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPw ? (
                      <EyeOff size={15} style={{ color: "var(--muted)" }} />
                    ) : (
                      <Eye size={15} style={{ color: "var(--muted)" }} />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="eh-btn eh-btn-primary w-full"
                style={{
                  padding: "11px",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Spinner size={16} color="#06080F" /> Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </button>
              <div
                className="font-body text-center"
                style={{ fontSize: 13, color: "var(--ink-2)" }}
              >
                Already on EchoHive?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-mono"
                  style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12, letterSpacing: "0.02em" }}
                >
                  SIGN IN INSTEAD
                </button>
              </div>
            </form>
          )}

          {mode === "check-email" && (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: "rgba(0, 240, 255, 0.08)",
                    border: "1px solid rgba(0, 240, 255, 0.2)",
                  }}
                >
                  <Mail size={24} style={{ color: "var(--accent)" }} />
                </div>
              </div>
              <p
                className="font-body text-center"
                style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6 }}
              >
                We sent a confirmation link to{" "}
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                  {form.email}
                </span>
                . Click it to activate your account, then come back and sign
                in.
              </p>
              <button
                onClick={handleResendConfirmation}
                disabled={loading}
                className="eh-btn eh-btn-ghost w-full text-sm flex items-center justify-center gap-2"
                style={{ padding: "10px" }}
              >
                {loading ? (
                  <>
                    <Spinner size={14} /> Resending…
                  </>
                ) : (
                  "Resend confirmation email"
                )}
              </button>
              <div
                className="font-body text-center"
                style={{ fontSize: 13, color: "var(--ink-2)" }}
              >
                Already confirmed?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-mono"
                  style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12, letterSpacing: "0.02em" }}
                >
                  SIGN IN
                </button>
              </div>
            </div>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p
                className="font-body"
                style={{
                  fontSize: 13.5,
                  color: "var(--ink-2)",
                  lineHeight: 1.6,
                }}
              >
                Enter the email tied to your account. We'll send you a secure
                link to set a new password — it works for 30 minutes.
              </p>
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="you@example.com"
                type="email"
                icon={Mail}
              />
              <button
                type="submit"
                disabled={loading}
                className="eh-btn eh-btn-primary w-full"
                style={{
                  padding: "11px",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Spinner size={16} color="#06080F" /> Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
              <div
                className="font-body text-center"
                style={{ fontSize: 13, color: "var(--ink-2)" }}
              >
                Remembered it?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-mono"
                  style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12, letterSpacing: "0.02em" }}
                >
                  BACK TO SIGN IN
                </button>
              </div>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              <p
                className="font-body"
                style={{
                  fontSize: 13.5,
                  color: "var(--ink-2)",
                  lineHeight: 1.6,
                }}
              >
                Choose a strong new password. You'll be signed in immediately
                after.
              </p>
              <div>
                <Label>New password</Label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    style={{
                      color: "var(--muted)",
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.newPassword}
                    onChange={(e) =>
                      setForm({ ...form, newPassword: e.target.value })
                    }
                    className="eh-input w-full font-body"
                    placeholder="At least 8 characters"
                    style={{ padding: "10px 40px 10px 38px", fontSize: 14 }}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPw ? (
                      <EyeOff size={15} style={{ color: "var(--muted)" }} />
                    ) : (
                      <Eye size={15} style={{ color: "var(--muted)" }} />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="eh-btn eh-btn-primary w-full"
                style={{
                  padding: "11px",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Spinner size={16} color="#06080F" /> Updating…
                  </>
                ) : (
                  "Set new password"
                )}
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// ADMIN PANEL
// =====================================================================
const StatCard = ({ icon: Icon, label, value, sub, tone }) => (
  <div
    className="eh-card"
    style={{
      padding: "20px 22px",
      border: `1px solid ${tone === "danger" ? "rgba(255, 51, 102, 0.25)" : "rgba(0, 240, 255, 0.15)"}`,
      boxShadow: tone === "danger"
        ? "0 8px 32px rgba(255, 51, 102, 0.05)"
        : "0 8px 32px rgba(0, 240, 255, 0.03)",
    }}
  >
    <div className="flex items-center justify-between mb-4">
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: tone === "danger" ? "rgba(255, 51, 102, 0.1)" : "rgba(0, 240, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          size={16}
          style={{
            color: tone === "danger" ? "var(--danger)" : "var(--accent)",
            filter: `drop-shadow(0 0 4px ${tone === "danger" ? "var(--danger)" : "var(--accent)"})`,
          }}
        />
      </div>
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--muted)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
    <div
      className="font-display"
      style={{
        fontSize: 32,
        fontWeight: 800,
        color: tone === "danger" ? "var(--danger)" : "var(--ink)",
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        textShadow: tone === "danger" ? "0 0 10px rgba(255, 51, 102, 0.2)" : "0 0 10px rgba(0, 240, 255, 0.1)",
      }}
    >
      {formatNum(value)}
    </div>
    <div
      className="font-mono"
      style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}
    >
      {sub.toUpperCase()}
    </div>
  </div>
);

const AdminOverview = ({ posts }) => {
  const byCat = CATEGORIES.map((c) => ({
    ...c,
    count: posts.filter((p) => p.category === c.id).length,
  }));
  const total = posts.length || 1;
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="eh-card" style={{ padding: 22 }}>
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Distribution by Category
        </div>
        <div className="eh-rule mt-3 mb-5"></div>
        <div className="space-y-4">
          {byCat.map((c) => {
            const pct = Math.round((c.count / total) * 100);
            return (
              <div key={c.id}>
                <div className="flex justify-between mb-1.5">
                  <span
                    className="font-display"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {c.name}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {c.count} POSTS · {pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "rgba(0, 240, 255, 0.05)",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid rgba(0, 240, 255, 0.08)",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: c.color,
                      transition: "width .4s ease",
                      borderRadius: 4,
                      boxShadow: `0 0 10px ${c.color}`,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="eh-card" style={{ padding: 22 }}>
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Recent Activity
        </div>
        <div className="eh-rule mt-3 mb-5"></div>
        <div className="space-y-3.5">
          {[...posts]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
            .map((p) => (
              <div key={p.id} className="flex items-start gap-3">
                <Avatar name={p.author.display} size={30} src={p.author.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display"
                    style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}
                  >
                    {p.title.length > 72 ? p.title.slice(0, 72) + "…" : p.title}
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 10.5,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    {p.author.display.toUpperCase()} · {getCategory(p.category)?.name.toUpperCase()} ·{" "}
                    {timeAgo(p.createdAt).toUpperCase()}
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
  <div className="eh-card" style={{ padding: 0, overflow: "hidden" }}>
    <div style={{ overflowX: "auto" }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: "rgba(6, 8, 15, 0.45)" }}>
            {["Post", "Author", "Category", "Engagement", "Posted", ""].map(
              (h) => (
                <th
                  key={h}
                  className="font-mono text-left"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--muted)",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--glass-border)",
                  }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background .15s ease" }} className="hover:bg-[rgba(0,240,255,0.02)]">
              <td style={{ padding: "14px 18px", maxWidth: 320 }}>
                <div
                  className="font-display"
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {p.title}
                </div>
              </td>
              <td
                style={{ padding: "14px 18px" }}
                className="font-body text-sm"
              >
                {p.author.display}
              </td>
              <td style={{ padding: "14px 18px" }}>
                <CategoryChip categoryId={p.category} compact />
              </td>
              <td
                style={{ padding: "14px 18px" }}
                className="font-mono text-xs"
              >
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--ink-2)",
                  }}
                >
                  {totalReactions(p)} REACTIONS · {p.comments} COMMENTS ·{" "}
                  {formatNum(p.views)} VIEWS
                </span>
              </td>
              <td
                style={{ padding: "14px 18px" }}
                className="font-body text-sm"
              >
                <span style={{ color: "var(--muted)" }}>
                  {timeAgo(p.createdAt)}
                </span>
              </td>
              <td style={{ padding: "14px 18px", textAlign: "right" }}>
                <button
                  onClick={() => onDelete(p.id)}
                  className="font-mono flex items-center justify-center ml-auto"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--danger)",
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 51, 102, 0.2)",
                    background: "rgba(255, 51, 102, 0.05)",
                    transition: "all .15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 51, 102, 0.15)";
                    e.currentTarget.style.boxShadow = "0 0 10px rgba(255, 51, 102, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 51, 102, 0.05)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Trash2
                    size={11}
                    style={{ marginRight: 4 }}
                  />{" "}
                  DELETE
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
  <div className="eh-card" style={{ padding: 0, overflow: "hidden" }}>
    <div style={{ overflowX: "auto" }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: "rgba(6, 8, 15, 0.45)" }}>
            {["User", "University", "Role", "Status", "Joined", ""].map((h) => (
              <th
                key={h}
                className="font-mono text-left"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--muted)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--glass-border)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background .15s ease" }} className="hover:bg-[rgba(0,240,255,0.02)]">
              <td style={{ padding: "14px 18px" }}>
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.display} size={30} src={u.avatarUrl} />
                  <div>
                    <div
                      className="font-display"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {u.display}
                    </div>
                    <div
                      className="font-mono"
                      style={{ fontSize: 10.5, color: "var(--muted)" }}
                    >
                      @{u.username} · {u.email}
                    </div>
                  </div>
                </div>
              </td>
              <td
                style={{ padding: "14px 18px" }}
                className="font-body text-sm"
              >
                <span style={{ color: "var(--ink-2)" }}>{u.university}</span>
              </td>
              <td style={{ padding: "14px 18px" }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 6,
                    color:
                      u.role === "admin"
                        ? "var(--accent)"
                        : "var(--ink-2)",
                    background:
                      u.role === "admin"
                        ? "rgba(0, 240, 255, 0.1)"
                        : "rgba(12, 18, 35, 0.5)",
                    border: `1px solid ${u.role === "admin" ? "rgba(0, 240, 255, 0.25)" : "var(--glass-border)"}`,
                  }}
                >
                  {u.role}
                </span>
              </td>
              <td style={{ padding: "14px 18px" }}>
                <span
                  className="font-mono flex items-center gap-1.5"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: u.isBanned ? "var(--danger)" : "var(--success)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: u.isBanned
                        ? "var(--danger)"
                        : "var(--success)",
                      boxShadow: u.isBanned
                        ? "0 0 6px var(--danger)"
                        : "0 0 6px var(--success)",
                    }}
                  ></span>
                  {u.isBanned ? "BANNED" : "ACTIVE"}
                </span>
              </td>
              <td
                style={{ padding: "14px 18px", color: "var(--muted)" }}
                className="font-body text-sm"
              >
                {timeAgo(u.createdAt)}
              </td>
              <td style={{ padding: "14px 18px", textAlign: "right" }}>
                {u.role !== "admin" &&
                  (u.isBanned ? (
                    <button
                      onClick={() => onUnban(u.id)}
                      className="font-mono flex items-center justify-center ml-auto"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--success)",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(0, 230, 118, 0.2)",
                        background: "rgba(0, 230, 118, 0.05)",
                        transition: "all .15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0, 230, 118, 0.15)";
                        e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 230, 118, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0, 230, 118, 0.05)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <Check
                        size={12}
                        style={{ marginRight: 4 }}
                      />{" "}
                      RESTORE
                    </button>
                  ) : (
                    <button
                      onClick={() => onBan(u.id)}
                      className="font-mono flex items-center justify-center ml-auto"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--danger)",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255, 51, 102, 0.2)",
                        background: "rgba(255, 51, 102, 0.05)",
                        transition: "all .15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255, 51, 102, 0.15)";
                        e.currentTarget.style.boxShadow = "0 0 10px rgba(255, 51, 102, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 51, 102, 0.05)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <Ban
                        size={11}
                        style={{ marginRight: 4 }}
                      />{" "}
                      BAN
                    </button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AdminReports = ({ reports, onResolve, onDeletePost }) => {
  if (reports.length === 0) {
    return (
      <div className="eh-card" style={{ padding: 48, textAlign: "center" }}>
        <Flag
          size={22}
          style={{ color: "var(--muted)", margin: "0 auto 10px" }}
        />
        <div
          className="font-display"
          style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}
        >
          No open reports
        </div>
        <div
          className="font-body"
          style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}
        >
          Flagged posts and comments will show up here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="eh-card" style={{ padding: 18 }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 6,
                    color: "var(--danger)",
                    background: "rgba(255, 51, 102, 0.08)",
                    border: "1px solid rgba(255, 51, 102, 0.2)",
                  }}
                >
                  {r.reason}
                </span>
                <span
                  className="font-body"
                  style={{ fontSize: 11.5, color: "var(--muted)" }}
                >
                  reported by @{r.reporter.username} · {timeAgo(r.createdAt)}
                </span>
              </div>
              <div
                className="font-body"
                style={{ fontSize: 13.5, color: "var(--ink-2)", maxWidth: 560 }}
              >
                {r.post ? (
                  <>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                      Post:{" "}
                    </span>
                    {r.post.title}
                  </>
                ) : (
                  <>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                      Comment:{" "}
                    </span>
                    {r.comment.content}
                  </>
                )}
              </div>
              {r.details && (
                <div
                  className="font-body mt-1.5"
                  style={{ fontSize: 12.5, color: "var(--muted)" }}
                >
                  “{r.details}”
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {r.post && (
                <button
                  onClick={() => onDeletePost(r.post.id)}
                  className="font-mono flex items-center gap-1"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--danger)",
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 51, 102, 0.2)",
                    background: "rgba(255, 51, 102, 0.05)",
                  }}
                >
                  <Trash2 size={11} /> DELETE POST
                </button>
              )}
              <button
                onClick={() => onResolve(r.id, "dismissed")}
                className="font-mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--muted)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--glass-border)",
                }}
              >
                DISMISS
              </button>
              <button
                onClick={() => onResolve(r.id, "resolved")}
                className="font-mono flex items-center gap-1"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--success)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(0, 230, 118, 0.2)",
                  background: "rgba(0, 230, 118, 0.05)",
                }}
              >
                <Check size={11} /> RESOLVE
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminPanel = ({
  posts,
  users,
  reports,
  onBack,
  onDeletePost,
  onBanUser,
  onUnbanUser,
  onResolveReport,
}) => {
  const [tab, setTab] = useState("overview");
  const stats = {
    users: users.length,
    active: users.filter((u) => !u.isBanned).length,
    banned: users.filter((u) => u.isBanned).length,
    posts: posts.length,
    reactions: posts.reduce((s, p) => s + totalReactions(p), 0),
    comments: posts.reduce((s, p) => s + p.comments, 0),
    views: posts.reduce((s, p) => s + p.views, 0),
  };

  return (
    <div className="eh-root min-h-screen hex-texture">
      <GlobalStyles />
      <div
        style={{
          background: "rgba(6, 8, 15, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0, 240, 255, 0.15)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(0, 240, 255, 0.1)",
        }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px" }}
          className="flex items-center justify-between"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 font-mono"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--accent)",
              textShadow: "0 0 10px rgba(0, 240, 255, 0.2)",
            }}
          >
            <ArrowLeft size={14} /> BACK TO FEED
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} style={{ color: "var(--accent)", filter: "drop-shadow(0 0 5px var(--accent))" }} />
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink)",
              }}
            >
              ADMINISTRATOR CONSOLE
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div className="mb-8">
          <h1
            className="font-display"
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.03em",
            }}
          >
            Moderation & Oversight
          </h1>
          <div className="eh-rule mt-3 mb-3"></div>
          <p
            className="font-body"
            style={{ fontSize: 14, color: "var(--ink-2)", maxWidth: 640 }}
          >
            Keep the community healthy. Act on what breaks the rules, preserve
            what carries value.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Total users"
            value={stats.users}
            sub={`${stats.active} active`}
          />
          <StatCard
            icon={FileText}
            label="Total posts"
            value={stats.posts}
            sub={`${formatNum(stats.comments)} comments`}
          />
          <StatCard
            icon={Activity}
            label="Reactions"
            value={stats.reactions}
            sub={`${formatNum(stats.views)} views`}
          />
          <StatCard
            icon={Ban}
            label="Banned users"
            value={stats.banned}
            sub="Currently restricted"
            tone="danger"
          />
        </div>

        <div
          className="flex gap-1 mb-6"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          {[
            ["overview", "Overview"],
            ["posts", "Posts"],
            ["users", "Users"],
            ["reports", `Reports${reports.length ? ` (${reports.length})` : ""}`],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="font-mono"
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "12px 18px",
                color: tab === k ? "var(--accent)" : "var(--muted)",
                borderBottom: `2px solid ${tab === k ? "var(--accent)" : "transparent"}`,
                marginBottom: -1,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textShadow: tab === k ? "0 0 10px rgba(0, 240, 255, 0.3)" : "none",
                transition: "all .2s ease",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "overview" && <AdminOverview posts={posts} />}
        {tab === "posts" && (
          <AdminPosts posts={posts} onDelete={onDeletePost} />
        )}
        {tab === "users" && (
          <AdminUsers users={users} onBan={onBanUser} onUnban={onUnbanUser} />
        )}
        {tab === "reports" && (
          <AdminReports reports={reports} onResolve={onResolveReport} onDeletePost={onDeletePost} />
        )}
      </div>
    </div>
  );
};

// =====================================================================
// ROOT APP
// =====================================================================
export default function EchoHive() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [users, setUsers] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);
  const [creatingPost, setCreatingPost] = useState(false);
  const [repostTarget, setRepostTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedOffset, setFeedOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [showToast, toastNode] = useToast();

  const isResetFlow =
    window.location.pathname === "/reset-password" ||
    window.location.hash.includes("type=recovery");

  // Auth + initial feed load
  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) setUser(toUserShape(res));
      })
      .catch(console.error);

    setFeedLoading(true);
    fetchFeed({ limit: FEED_PAGE_SIZE, offset: 0 })
      .then((page) => {
        setPosts(page);
        setFeedOffset(page.length);
        setHasMorePosts(page.length === FEED_PAGE_SIZE);
      })
      .catch(console.error)
      .finally(() => setFeedLoading(false));

    const { data: sub } = onAuthChange(async (authUser) => {
      if (!authUser) {
        setUser(null);
        return;
      }
      try {
        const res = await getCurrentUser();
        if (res) setUser(toUserShape(res));
      } catch (e) {
        console.error("Auth profile fetch failed:", e);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Mirror selectedPost to live posts state
  useEffect(() => {
    if (selectedPost) {
      const fresh = posts.find((p) => p.id === selectedPost.id);
      if (fresh && fresh !== selectedPost) setSelectedPost(fresh);
    }
  }, [posts, selectedPost]);

  // Realtime — engagement counters are denormalized onto the posts row by DB
  // triggers, so subscribing to that one table keeps everyone's feed numbers
  // (and new/deleted posts) live without polling.
  const activeCategoryRef = useRef(activeCategory);
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    const unsubscribe = subscribeToFeed({
      onInsert: async (row) => {
        try {
          const full = await fetchPostById(row.post_id);
          setPosts((prev) => {
            if (prev.some((p) => p.id === full.id)) return prev;
            const cat = activeCategoryRef.current;
            if (cat !== "all" && full.category !== cat) return prev;
            return [full, ...prev];
          });
        } catch (e) {
          console.error("Realtime post fetch failed:", e);
        }
      },
      onUpdate: (row) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === row.post_id
              ? {
                  ...p,
                  title: row.title,
                  content: row.content,
                  likeCount: row.reaction_count,
                  comments: row.comment_count,
                  views: row.view_count,
                  reposts: row.repost_count,
                }
              : p,
          ),
        );
      },
      onDelete: (row) => {
        setPosts((prev) => prev.filter((p) => p.id !== row.post_id));
        setSelectedPost((prev) => (prev?.id === row.post_id ? null : prev));
      },
    });
    return unsubscribe;
  }, []);

  // Realtime — new comments/replies stream into whichever post is open
  useEffect(() => {
    if (!selectedPost) return;
    const postId = selectedPost.id;
    const unsubscribe = subscribeToComments(postId, async () => {
      try {
        const fresh = await fetchComments(postId);
        setComments((prev) => ({ ...prev, [postId]: fresh }));
      } catch (e) {
        console.error("Realtime comment fetch failed:", e);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost?.id]);

  // Notifications — fetch once per session and stream new ones in live.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([]);
      return;
    }
    fetchNotifications().then(setNotifications).catch(console.error);
    const unsubscribe = subscribeToNotifications(user.id, () => {
      fetchNotifications().then(setNotifications).catch(console.error);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const handleOpenNotifications = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markNotificationsRead(unreadIds);
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.postId) return;
    const existing = posts.find((p) => p.id === n.postId);
    if (existing) {
      handleOpenPost(existing);
      return;
    }
    try {
      const full = await fetchPostById(n.postId);
      setPosts((prev) => (prev.some((p) => p.id === full.id) ? prev : [full, ...prev]));
      handleOpenPost(full);
    } catch {
      showToast("That post is no longer available");
    }
  };

  const refreshFeed = async (cat, { silent = false } = {}) => {
    const slug =
      cat !== undefined
        ? cat
        : activeCategory === "all"
          ? null
          : activeCategory;
    if (!silent) setFeedLoading(true);
    try {
      const page = await fetchFeed({ categorySlug: slug || null, limit: FEED_PAGE_SIZE, offset: 0 });
      setPosts(page);
      setFeedOffset(page.length);
      setHasMorePosts(page.length === FEED_PAGE_SIZE);
    } catch (e) {
      showToast(e.message);
    } finally {
      if (!silent) setFeedLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMorePosts) return;
    setLoadingMore(true);
    try {
      const slug = activeCategory === "all" ? null : activeCategory;
      const page = await fetchFeed({ categorySlug: slug, limit: FEED_PAGE_SIZE, offset: feedOffset });
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...page.filter((p) => !existingIds.has(p.id))];
      });
      setFeedOffset((prev) => prev + page.length);
      setHasMorePosts(page.length === FEED_PAGE_SIZE);
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Applies a local edit to one post without refetching the whole feed —
  // keeps likes/comments/bookmarks snappy instead of reloading everything.
  const patchPost = (postId, updater) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    refreshFeed(cat === "all" ? null : cat);
  };

  // ----- Actions -----
  const handleReact = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = !!post.userReaction;
    const prevType = post.userReaction;
    patchPost(postId, (p) => ({
      ...p,
      likeCount: Math.max(0, p.likeCount + (wasLiked ? -1 : 1)),
      userReaction: wasLiked ? null : LIKE_TYPE,
    }));
    try {
      await toggleReaction(postId, wasLiked ? prevType : LIKE_TYPE);
    } catch (e) {
      patchPost(postId, () => post);
      showToast(e.message);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (selectedPost?.id === postId) setSelectedPost(null);
      showToast("Post deleted");
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleCreate = async ({ title, content, category, mediaFiles }) => {
    try {
      await createPost({ title, content, categorySlug: category, mediaFiles });
      setCreatingPost(false);
      refreshFeed(undefined, { silent: true });
      showToast("Posted to the feed");
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleAddComment = async (postId, content, parentId = null, mediaFile = null) => {
    try {
      await addComment(postId, content, parentId, mediaFile);
      setComments((prev) => ({ ...prev, [postId]: null }));
      fetchComments(postId).then((c) =>
        setComments((prev) => ({ ...prev, [postId]: c })),
      );
      if (parentId === null) {
        patchPost(postId, (p) => ({ ...p, comments: p.comments + 1 }));
      }
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleBookmark = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasBookmarked = post.isBookmarked;
    patchPost(postId, (p) => ({ ...p, isBookmarked: !wasBookmarked }));
    try {
      await toggleBookmark(postId);
      showToast(wasBookmarked ? "Removed from saved" : "Saved");
    } catch (e) {
      patchPost(postId, (p) => ({ ...p, isBookmarked: wasBookmarked }));
      showToast(e.message);
    }
  };

  const handleShare = async (post) => {
    const link = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.title,
          url: link,
        });
        return;
      } catch (e) {
        /* fall through to modal */
      }
    }
    setShareTarget(post);
  };

  const handleCopyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copied to clipboard");
      setShareTarget(null);
    } catch (e) {
      showToast("Could not copy. Try selecting the text.");
    }
  };

  const handleSubmitReport = async (reason, details) => {
    try {
      await reportContent({ postId: reportTarget, reason, details });
      setReportTarget(null);
      showToast("Report submitted — a moderator will review it");
    } catch (e) {
      showToast(e.message);
    }
  };

  const loadReports = async (status = "open") => {
    try {
      setReports(await adminFetchReports({ status }));
    } catch (e) {
      showToast(e.message);
    } finally {
      setReportsLoaded(true);
    }
  };

  const handleResolveReport = async (reportId, status) => {
    try {
      await adminResolveReport(reportId, status);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      showToast(status === "resolved" ? "Report resolved" : "Report dismissed");
    } catch (e) {
      showToast(e.message);
    }
  };

  const handleRepost = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    if (post.isReposted) {
      patchPost(postId, (p) => ({
        ...p,
        isReposted: false,
        reposts: Math.max(0, p.reposts - 1),
      }));
      try {
        await toggleRepost(postId);
        showToast("Repost removed");
      } catch (e) {
        patchPost(postId, (p) => ({ ...p, isReposted: true, reposts: p.reposts + 1 }));
        showToast(e.message);
      }
    } else {
      setRepostTarget(post);
    }
  };

  const confirmRepost = async (comment) => {
    const postId = repostTarget.id;
    patchPost(postId, (p) => ({ ...p, isReposted: true, reposts: p.reposts + 1 }));
    try {
      await toggleRepost(postId, comment);
      setRepostTarget(null);
      showToast(comment ? "Reposted with your take" : "Reposted");
    } catch (e) {
      patchPost(postId, (p) => ({ ...p, isReposted: false, reposts: Math.max(0, p.reposts - 1) }));
      showToast(e.message);
    }
  };

  const handleOpenPost = (post) => {
    setSelectedPost(post);
    fetchComments(post.id).then((c) =>
      setComments((prev) => ({ ...prev, [post.id]: c })),
    );
    recordView(post.id)
      .then(() => patchPost(post.id, (p) => ({ ...p, views: p.views + 1 })))
      .catch(() => {});
  };

  const handleBan = async (uid) => {
    try {
      await adminBanUser(uid, true);
      adminFetchUsers().then(setUsers);
      showToast("User banned");
    } catch (e) {
      showToast(e.message);
    }
  };
  const handleUnban = async (uid) => {
    try {
      await adminBanUser(uid, false);
      adminFetchUsers().then(setUsers);
      showToast("User restored");
    } catch (e) {
      showToast(e.message);
    }
  };

  if (isResetFlow)
    return (
      <>
        {toastNode}
        <AuthView onLogin={setUser} toast={showToast} initialMode="reset" />
      </>
    );
  if (!user)
    return (
      <>
        {toastNode}
        <AuthView onLogin={setUser} toast={showToast} />
      </>
    );

  if (view === "admin" && user.role === "admin") {
    if (users.length === 0) adminFetchUsers().then(setUsers);
    if (!reportsLoaded) loadReports();
    return (
      <>
        {toastNode}
        <AdminPanel
          posts={posts}
          users={users}
          reports={reports}
          onBack={() => setView("feed")}
          onDeletePost={handleDelete}
          onBanUser={handleBan}
          onUnbanUser={handleUnban}
          onResolveReport={handleResolveReport}
        />
      </>
    );
  }

  const postComments = selectedPost ? comments[selectedPost.id] || [] : [];
  const savedPosts = posts.filter((p) => p.isBookmarked);

  return (
    <div className="eh-root min-h-screen hex-texture">
      <GlobalStyles />

      <Header
        user={user}
        onLogout={async () => {
          try {
            await signOut();
          } catch (e) {
            showToast(e.message);
          }
          setUser(null);
        }}
        onCreate={() => setCreatingPost(true)}
        onNavigate={setView}
        onOpenSettings={() => setSettingsOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        notifications={notifications}
        unreadCount={unreadNotifCount}
        onOpenNotifications={handleOpenNotifications}
        onNotificationClick={handleNotificationClick}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
        <div className="eh-grid">
          <Sidebar
            activeCategory={activeCategory}
            onSelect={handleCategoryChange}
            posts={posts}
            onNavigate={setView}
            currentView={view}
            savedCount={savedPosts.length}
          />

          {view === "saved" ? (
            <Feed
              posts={savedPosts}
              activeCategory="all"
              onReact={handleReact}
              onOpen={handleOpenPost}
              onDelete={handleDelete}
              onBookmark={handleBookmark}
              onShare={handleShare}
              onRepost={handleRepost}
              onReport={setReportTarget}
              isAdmin={user.role === "admin"}
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
              onReport={setReportTarget}
              isAdmin={user.role === "admin"}
              currentUserId={user.id}
              onCreate={() => setCreatingPost(true)}
              loading={feedLoading}
              searchQuery={searchQuery}
              hasMore={hasMorePosts}
              loadingMore={loadingMore}
              onLoadMore={loadMorePosts}
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
          onReport={setReportTarget}
        />
      )}

      {reportTarget && (
        <ReportModal
          onClose={() => setReportTarget(null)}
          onSubmit={handleSubmitReport}
        />
      )}

      {creatingPost && (
        <CreatePost
          onClose={() => setCreatingPost(false)}
          onSubmit={handleCreate}
        />
      )}

      {repostTarget && (
        <RepostModal
          post={repostTarget}
          onClose={() => setRepostTarget(null)}
          onConfirm={confirmRepost}
        />
      )}

      {shareTarget && (
        <ShareModal
          post={shareTarget}
          onClose={() => setShareTarget(null)}
          onCopy={handleCopyLink}
        />
      )}

      {settingsOpen && (
        <ProfileSettingsModal
          user={user}
          onClose={() => setSettingsOpen(false)}
          onSaved={(avatarUrl) => {
            setUser((prev) => ({ ...prev, avatarUrl }));
            setSettingsOpen(false);
            showToast("Profile photo updated");
            refreshFeed(undefined, { silent: true });
          }}
        />
      )}

      {toastNode}
    </div>
  );
}

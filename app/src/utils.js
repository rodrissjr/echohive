// Pure, framework-free helpers pulled out of EchoHive.jsx so they can be
// unit tested without mounting the whole app or touching Supabase.

export const MAX_POST_MEDIA = 6;
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

// Single Instagram-style like — reactions in the DB still carry a `type`
// column for backward compatibility with older data, but the app only
// ever writes "love" now.
export const LIKE_TYPE = "love";

export const timeAgo = (ts) => {
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

export const formatNum = (n) => {
  if (n < 1000) return n.toString();
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1000000) return Math.floor(n / 1000) + "k";
  return (n / 1000000).toFixed(1) + "M";
};

export const initials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const totalReactions = (post) => post.likeCount || 0;

export const validateMediaFile = (file) => {
  if (!/^image\/|^video\//.test(file.type)) {
    return `"${file.name}" isn't an image or video`;
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return `"${file.name}" is larger than 25MB`;
  }
  return null;
};

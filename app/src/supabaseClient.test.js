import { describe, it, expect, vi, beforeEach } from "vitest";

// The module under test calls createClient() at import time, so the mock
// must exist before it's imported. All Supabase calls are stubbed — these
// tests never touch the network.
const mockAuth = { getUser: vi.fn() };
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockStorageFrom = vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }));
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: mockAuth,
    storage: { from: mockStorageFrom },
    from: () => ({ update: mockUpdate }),
  }),
}));

const { uploadMedia, updateAvatar } = await import("./supabaseClient");

const authedUser = { id: "user-123" };
const makeFile = (name, type, size) => ({ name, type, size });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.getUser.mockResolvedValue({ data: { user: authedUser } });
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.test/media/user-123/f.png" } });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockResolvedValue({ error: null });
});

describe("uploadMedia", () => {
  it("rejects when there is no signed-in user, without touching storage", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    await expect(uploadMedia(makeFile("a.png", "image/png", 10))).rejects.toThrow("Not authenticated");
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects a non-image/video file before uploading", async () => {
    await expect(uploadMedia(makeFile("resume.pdf", "application/pdf", 10)))
      .rejects.toThrow(/not an image or video/);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects a file over 25MB before uploading", async () => {
    await expect(uploadMedia(makeFile("big.png", "image/png", 26 * 1024 * 1024)))
      .rejects.toThrow(/larger than 25MB/);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("uploads a valid image under the user's id and returns its type", async () => {
    const result = await uploadMedia(makeFile("photo.jpg", "image/jpeg", 1024));
    expect(result.type).toBe("image");
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const [path] = mockUpload.mock.calls[0];
    expect(path.startsWith(`${authedUser.id}/`)).toBe(true);
  });

  it("classifies a valid video correctly", async () => {
    const result = await uploadMedia(makeFile("clip.mp4", "video/mp4", 1024));
    expect(result.type).toBe("video");
  });
});

describe("updateAvatar", () => {
  it("rejects a non-image file", async () => {
    await expect(updateAvatar(makeFile("clip.mp4", "video/mp4", 10)))
      .rejects.toThrow(/must be an image/);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects an oversized image", async () => {
    await expect(updateAvatar(makeFile("big.png", "image/png", 26 * 1024 * 1024)))
      .rejects.toThrow(/larger than 25MB/);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("uploads to a fixed per-user path so re-uploading replaces the old photo", async () => {
    await updateAvatar(makeFile("me.png", "image/png", 1024));
    const [path, , options] = mockUpload.mock.calls[0];
    expect(path).toBe(`${authedUser.id}/avatar.png`);
    expect(options.upsert).toBe(true);
  });

  it("saves a cache-busted URL onto the profile row", async () => {
    const url = await updateAvatar(makeFile("me.png", "image/png", 1024));
    expect(url).toMatch(/^https:\/\/cdn\.test\/media\/user-123\/f\.png\?t=\d+$/);
    expect(mockUpdate).toHaveBeenCalledWith({ avatar_url: url });
  });
});

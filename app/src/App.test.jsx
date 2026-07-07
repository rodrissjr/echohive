import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("./supabaseClient", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
  onAuthChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updatePassword: vi.fn(),
  fetchFeed: vi.fn().mockResolvedValue([]),
  createPost: vi.fn(),
  deletePost: vi.fn(),
  toggleReaction: vi.fn(),
  toggleBookmark: vi.fn(),
  toggleRepost: vi.fn(),
  recordView: vi.fn(),
  fetchComments: vi.fn(),
  addComment: vi.fn(),
  adminFetchUsers: vi.fn().mockResolvedValue([]),
  adminBanUser: vi.fn(),
  updateAvatar: vi.fn(),
  fetchPostById: vi.fn(),
  subscribeToFeed: vi.fn(() => () => {}),
  subscribeToComments: vi.fn(() => () => {}),
}));

const { default: EchoHive } = await import("./EchoHive");

describe("EchoHive app shell", () => {
  it("shows the sign-in form when no session is active", async () => {
    render(<EchoHive />);
    await waitFor(() => {
      expect(screen.getByText("Sign in to EchoHive")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("does not render the feed while logged out", async () => {
    render(<EchoHive />);
    await waitFor(() => {
      expect(screen.getByText("Sign in to EchoHive")).toBeInTheDocument();
    });
    expect(screen.queryByText("The Feed")).not.toBeInTheDocument();
  });
});

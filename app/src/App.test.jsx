import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("./supabaseClient", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
  onAuthChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resendConfirmationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updatePassword: vi.fn(),
  mfaListFactors: vi.fn().mockResolvedValue([]),
  mfaEnroll: vi.fn(),
  mfaVerifyCode: vi.fn(),
  mfaUnenroll: vi.fn(),
  mfaGetAssurance: vi.fn().mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal1" }),
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
  reportContent: vi.fn(),
  adminFetchReports: vi.fn().mockResolvedValue([]),
  adminResolveReport: vi.fn(),
  fetchNotifications: vi.fn().mockResolvedValue([]),
  markNotificationsRead: vi.fn(),
  subscribeToNotifications: vi.fn(() => () => {}),
}));

const { default: EchoHive } = await import("./EchoHive");
const { getCurrentUser, mfaGetAssurance } = await import("./supabaseClient");

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

  it("does not auto-login on mount when a session exists but MFA step-up is still required", async () => {
    // Regression test: a password-verified (aal1) session used to be treated
    // as fully logged in before the user completed their TOTP challenge.
    getCurrentUser.mockResolvedValueOnce({
      user: { id: "u1" },
      profile: { user_id: "u1", username: "u", display_name: "U", email: "u@u.com", university: "X", role: "student" },
    });
    mfaGetAssurance.mockResolvedValueOnce({ currentLevel: "aal1", nextLevel: "aal2" });

    render(<EchoHive />);
    await waitFor(() => {
      expect(screen.getByText("Sign in to EchoHive")).toBeInTheDocument();
    });
    expect(screen.queryByText("The Feed")).not.toBeInTheDocument();
  });
});

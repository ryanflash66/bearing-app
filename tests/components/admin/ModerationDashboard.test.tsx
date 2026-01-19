/**
 * Tests for ModerationDashboard component
 * Story 6.3: Admin Blog Moderation
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ModerationDashboard from "@/components/admin/ModerationDashboard";
import { ModerationPost } from "@/lib/moderation";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockPublishedPost: ModerationPost = {
  id: "post-1",
  title: "Published Post",
  slug: "published-post",
  status: "published",
  excerpt: "A nice excerpt",
  word_count: 500,
  views_count: 100,
  published_at: "2026-01-15T12:00:00Z",
  suspended_at: null,
  suspension_reason: null,
  is_flagged: false,
  flagged_at: null,
  flag_reason: null,
  flag_source: null,
  flag_confidence: null,
  created_at: "2026-01-14T12:00:00Z",
  author_id: "author-1",
  author_email: "author@example.com",
  author_display_name: "Test Author",
  author_handle: "testauthor",
};

const mockSuspendedPost: ModerationPost = {
  id: "post-2",
  title: "Suspended Post",
  slug: "suspended-post",
  status: "suspended",
  excerpt: "Bad content",
  word_count: 100,
  views_count: 50,
  published_at: "2026-01-10T12:00:00Z",
  suspended_at: "2026-01-16T12:00:00Z",
  suspension_reason: "Content policy violation",
  is_flagged: true,
  flagged_at: "2026-01-16T12:00:00Z",
  flag_reason: "Content policy violation",
  flag_source: "admin",
  flag_confidence: null,
  created_at: "2026-01-09T12:00:00Z",
  author_id: "author-2",
  author_email: "bad@example.com",
  author_display_name: "Bad Author",
  author_handle: "badauthor",
};

const mockFlaggedPost: ModerationPost = {
  id: "post-3",
  title: "Flagged Post",
  slug: "flagged-post",
  status: "published",
  excerpt: "Needs review",
  word_count: 200,
  views_count: 25,
  published_at: "2026-01-12T12:00:00Z",
  suspended_at: null,
  suspension_reason: null,
  is_flagged: true,
  flagged_at: "2026-01-16T12:00:00Z",
  flag_reason: "Potential policy violation",
  flag_source: "auto",
  flag_confidence: 0.9,
  created_at: "2026-01-11T12:00:00Z",
  author_id: "author-3",
  author_email: "flagged@example.com",
  author_display_name: "Flagged Author",
  author_handle: "flaggedauthor",
};

describe("ModerationDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders published posts section", () => {
    render(<ModerationDashboard initialPosts={[mockPublishedPost]} />);

    expect(screen.getByText("Published Posts (1)")).toBeInTheDocument();
    expect(screen.getByText("Published Post")).toBeInTheDocument();
    expect(screen.getByText("/published-post")).toBeInTheDocument();
    expect(screen.getByText("Test Author")).toBeInTheDocument();
    expect(screen.getByText("@testauthor")).toBeInTheDocument();
  });

  it("renders suspended posts section when posts exist", () => {
    render(<ModerationDashboard initialPosts={[mockSuspendedPost]} />);

    expect(screen.getByText("Suspended Posts (1)")).toBeInTheDocument();
    expect(screen.getByText("Suspended Post")).toBeInTheDocument();
    expect(screen.getByText("Content policy violation")).toBeInTheDocument();
  });

  it("shows Takedown button for published posts", () => {
    render(<ModerationDashboard initialPosts={[mockPublishedPost]} />);

    const takedownButton = screen.getByRole("button", { name: /takedown/i });
    expect(takedownButton).toBeInTheDocument();
  });

  it("shows Restore button for suspended posts", () => {
    render(<ModerationDashboard initialPosts={[mockSuspendedPost]} />);

    const restoreButton = screen.getByRole("button", { name: /restore/i });
    expect(restoreButton).toBeInTheDocument();
  });

  it("shows Approve button for flagged posts", () => {
    render(<ModerationDashboard initialPosts={[mockFlaggedPost]} />);

    const approveButton = screen.getByRole("button", { name: /approve/i });
    expect(approveButton).toBeInTheDocument();
  });

  it("opens suspension reason modal when Takedown is clicked", () => {
    render(<ModerationDashboard initialPosts={[mockPublishedPost]} />);

    const takedownButton = screen.getByRole("button", { name: /takedown/i });
    fireEvent.click(takedownButton);

    expect(screen.getByText("Suspend Post")).toBeInTheDocument();
    expect(screen.getByText("Suspension Reason")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm suspension/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("closes modal when Cancel is clicked", () => {
    render(<ModerationDashboard initialPosts={[mockPublishedPost]} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /takedown/i }));
    expect(screen.getByText("Suspend Post")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Suspend Post")).not.toBeInTheDocument();
  });

  it("suspends post when confirmation is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        postId: "post-1",
        authorEmail: "author@example.com",
        title: "Published Post",
        emailSent: true,
      }),
    });

    render(<ModerationDashboard initialPosts={[mockPublishedPost]} />);

    // Open modal and confirm
    fireEvent.click(screen.getByRole("button", { name: /takedown/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm suspension/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/moderation/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: "post-1",
          reason: "Content policy violation",
        }),
      });
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/post "published post" suspended/i)).toBeInTheDocument();
    });
  });

  it("restores suspended post when Restore is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, postId: "post-2" }),
    });

    render(<ModerationDashboard initialPosts={[mockSuspendedPost]} />);

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/moderation/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-2" }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/post restored to published status/i)).toBeInTheDocument();
    });
  });

  it("approves flagged post when Approve is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, postId: "post-3" }),
    });

    render(<ModerationDashboard initialPosts={[mockFlaggedPost]} />);

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/moderation/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: "post-3" }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/post approved/i)).toBeInTheDocument();
    });
  });

  it("displays error message on suspension failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Admin access required" }),
    });

    render(<ModerationDashboard initialPosts={[mockPublishedPost]} />);

    // Open modal and confirm
    fireEvent.click(screen.getByRole("button", { name: /takedown/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm suspension/i }));

    await waitFor(() => {
      expect(screen.getByText("Admin access required")).toBeInTheDocument();
    });
  });

  it("displays empty state when no published posts", () => {
    render(<ModerationDashboard initialPosts={[]} />);

    expect(screen.getByText("No published posts to moderate.")).toBeInTheDocument();
  });

  it("displays both sections when mixed posts exist", () => {
    render(
      <ModerationDashboard
        initialPosts={[mockPublishedPost, mockSuspendedPost, mockFlaggedPost]}
      />
    );

    expect(screen.getByText("Suspended Posts (1)")).toBeInTheDocument();
    expect(screen.getByText("Published Posts (1)")).toBeInTheDocument();
    expect(screen.getByText("Flagged Posts (1)")).toBeInTheDocument();
  });
});

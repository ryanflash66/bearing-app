import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BlogPostList from "@/components/blog/BlogPostList";
import { BlogPostListItem } from "@/types/blog";
import userEvent from "@testing-library/user-event";

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockPosts: BlogPostListItem[] = [
  {
    id: "post-1",
    title: "Test Post 1",
    slug: "test-post-1",
    status: "published",
    excerpt: "Excerpt 1",
    views_count: 100,
    reads_count: 50,
    word_count: 500,
    published_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "post-2",
    title: "Draft Post",
    slug: "draft-post",
    status: "draft",
    excerpt: null,
    views_count: 0,
    reads_count: 0,
    word_count: 0,
    published_at: null,
    updated_at: "2026-01-03T00:00:00Z",
    created_at: "2026-01-03T00:00:00Z",
  },
];

describe("BlogPostList", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.alert = jest.fn();
  });

  it("renders empty state when no posts provided", () => {
    render(<BlogPostList initialPosts={[]} />);
    expect(screen.getByText(/no blog posts yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new post/i })).toBeInTheDocument();
  });

  it("renders list of posts", () => {
    render(<BlogPostList initialPosts={mockPosts} />);
    expect(screen.getByText("Test Post 1")).toBeInTheDocument();
    expect(screen.getByText("Draft Post")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("displays metrics correctly", () => {
    render(<BlogPostList initialPosts={mockPosts} />);
    expect(screen.getByText("100 views")).toBeInTheDocument();
    expect(screen.getByText("500 words")).toBeInTheDocument();
  });

  it("handles archive action", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<BlogPostList initialPosts={mockPosts} />);

    // Reveal archive button (it's opacity-0 by default group-hover)
    // We can just click it if it's in the DOM, even if invisible to eye, 
    // strictly RTL warns about visibility but clicking programmatic works or we force style?
    // Let's rely on finding by title "Archive post"
    const archiveBtns = screen.getAllByTitle("Archive post");
    await user.click(archiveBtns[0]);

    // Confirm modal appears
    expect(screen.getByText(/archive blog post\?/i)).toBeInTheDocument();
    
    // Click Archive in modal
    const confirmBtn = screen.getByRole("button", { name: "Archive" });
    await user.click(confirmBtn);

    // Verify API call
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/blog/posts/${mockPosts[0].id}/archive`,
      expect.objectContaining({ method: "POST" })
    );

    // Verify post removed from list
    await waitFor(() => {
        expect(screen.queryByText("Test Post 1")).not.toBeInTheDocument();
    });
  });

  it("handles cancelling archive action", async () => {
    const user = userEvent.setup();
    render(<BlogPostList initialPosts={mockPosts} />);

    const archiveBtns = screen.getAllByTitle("Archive post");
    await user.click(archiveBtns[0]);

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelBtn);

    expect(screen.queryByText(/archive blog post\?/i)).not.toBeInTheDocument();
    expect(screen.getByText("Test Post 1")).toBeInTheDocument();
  });
});

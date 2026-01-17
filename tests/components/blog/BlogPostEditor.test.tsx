import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import BlogPostEditor from "@/components/blog/BlogPostEditor";
import userEvent from "@testing-library/user-event";
import { BlogPostStatus } from "@/types/blog";

// Mock TipTap editor since it's complex and browser-reliant
jest.mock("@/components/editor/TiptapEditor", () => {
  return function MockTiptapEditor({ onUpdate, content }: any) {
    return (
      <div data-testid="tiptap-mock">
        <textarea
          data-testid="tiptap-textarea"
          defaultValue={content?.text || ""}
          onChange={(e) =>
            onUpdate({ json: { text: e.target.value }, html: `<p>${e.target.value}</p>`, text: e.target.value })
          }
        />
      </div>
    );
  };
});

// Mock generateSlug logic slightly different from implementation to prove independence?
// Or just reuse implementation logic if we trust it?
// The component imports it, so we can mock the import.
jest.mock("@/lib/blog", () => ({
  generateSlug: (title: string) => title.toLowerCase().replace(/\s+/g, "-"),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const defaultProps = {
  postId: "post-123",
  initialTitle: "Initial Title",
  initialSlug: "initial-title",
  initialContent: {},
  initialContentText: "",
  initialStatus: "draft" as BlogPostStatus,
  initialUpdatedAt: "2026-01-01T00:00:00Z",
};

describe("BlogPostEditor", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders initial state correctly", () => {
    render(<BlogPostEditor {...defaultProps} />);
    expect(screen.getByDisplayValue("Initial Title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("initial-title")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("updates slug when title changes (if slug not edited)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BlogPostEditor {...defaultProps} />);

    const titleInput = screen.getByPlaceholderText("Post title");
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    expect(screen.getByDisplayValue("new-title")).toBeInTheDocument();
  });

  it("does not update slug if slug was manually edited", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<BlogPostEditor {...defaultProps} />);

    // Manually edit slug
    const slugInput = screen.getByPlaceholderText("post-slug");
    await user.clear(slugInput);
    await user.type(slugInput, "custom-slug");

    // Change title
    const titleInput = screen.getByPlaceholderText("Post title");
    await user.clear(titleInput);
    await user.type(titleInput, "Another Title");

    // Slug should remain custom
    expect(screen.getByDisplayValue("custom-slug")).toBeInTheDocument();
  });

  it("triggers autosave on content change", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated_at: "2026-01-01T00:01:00Z" }),
    });

    render(<BlogPostEditor {...defaultProps} />);

    // Type in mocked editor
    const editor = screen.getByTestId("tiptap-textarea");
    fireEvent.change(editor, { target: { value: "Updated content" } });

    // Fast-forward debounce timer (3000ms)
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/blog/posts/${defaultProps.postId}`,
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Updated content"),
        })
      );
    });
  });

  it("handles publish action", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
       ok: true,
       json: async () => ({ status: "published", updated_at: "2026-01-01T00:02:00Z" })
    });

    render(<BlogPostEditor {...defaultProps} />);

    const publishBtn = screen.getByRole("button", { name: "Publish" });
    await user.click(publishBtn);

    expect(global.fetch).toHaveBeenCalledWith(
        `/api/blog/posts/${defaultProps.postId}/publish`,
        expect.objectContaining({ method: "POST" })
    );

    await waitFor(() => {
        expect(screen.getByText("Published")).toBeInTheDocument();
    });
  });

  it("handles unpublish action", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
       ok: true,
       json: async () => ({ status: "draft", updated_at: "2026-01-01T00:03:00Z" })
    });

    render(<BlogPostEditor {...defaultProps} initialStatus="published" />);

    const unpublishBtn = screen.getByRole("button", { name: "Unpublish" });
    await user.click(unpublishBtn);

    expect(global.fetch).toHaveBeenCalledWith(
        `/api/blog/posts/${defaultProps.postId}/unpublish`,
        expect.objectContaining({ method: "POST" })
    );

    await waitFor(() => {
        expect(screen.getByText("Draft")).toBeInTheDocument();
    });
  });
});

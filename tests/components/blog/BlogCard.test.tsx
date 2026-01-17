import { render, screen } from "@testing-library/react";
import BlogCard from "@/components/blog/BlogCard";

describe("BlogCard", () => {
  it("renders title, excerpt, and link", () => {
    const publishedAt = "2026-01-01T00:00:00.000Z";

    render(
      <BlogCard
        title="Test Post"
        excerpt="Short summary"
        href="/author/blog/test-post"
        publishedAt={publishedAt}
      />
    );

    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.getByText("Short summary")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read post/i })).toHaveAttribute(
      "href",
      "/author/blog/test-post"
    );
    const formattedDate = new Date(publishedAt).toLocaleDateString();
    expect(screen.getByText(`Published ${formattedDate}`)).toBeInTheDocument();
  });

  it("renders fallback excerpt when none provided", () => {
    render(<BlogCard title="Test Post" href="/author/blog/test-post" />);
    expect(screen.getByText(/no excerpt available/i)).toBeInTheDocument();
  });
});

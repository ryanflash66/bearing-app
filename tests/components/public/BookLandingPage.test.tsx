import { render, screen } from "@testing-library/react";
import BookLandingPage from "@/components/public/BookLandingPage";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

describe("BookLandingPage", () => {
  const mockBook = {
    id: "book-123",
    title: "The Great Novel",
    subtitle: "A story of testing",
    synopsis: "This is a compelling synopsis.",
    cover_image_url: "https://example.com/cover.jpg",
    theme_config: { theme: "light" },
    is_public: true,
    owner_user_id: "user-123",
  };

  const mockAuthor = {
    id: "user-123",
    display_name: "Jane Doe",
    pen_name: "janedoe",
    avatar_url: "https://example.com/avatar.jpg",
    bio: "Bestselling author.",
  };

  it("renders book details correctly", () => {
    render(<BookLandingPage book={mockBook} author={mockAuthor} />);
    
    expect(screen.getByText("The Great Novel")).toBeInTheDocument();
    expect(screen.getByText("A story of testing")).toBeInTheDocument();
    expect(screen.getByText("This is a compelling synopsis.")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByAltText("The Great Novel Cover")).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("renders email signup form", () => {
    render(<BookLandingPage book={mockBook} author={mockAuthor} />);
    
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notify me/i })).toBeInTheDocument();
  });
});

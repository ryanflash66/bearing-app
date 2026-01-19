import { generateMetadata } from "@/app/[handle]/[slug]/page";
import { getPublicBookBySlug } from "@/lib/public-book";

// Mock dependencies
jest.mock("@/lib/public-book", () => ({
  getPublicBookBySlug: jest.fn(),
}));

jest.mock("@/lib/public-api", () => ({
  getPublicClient: jest.fn(() => ({})),
}));

// Mock react cache
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: (fn: any) => fn,
}));

describe("generateMetadata", () => {
  const mockParams = Promise.resolve({
    handle: "testauthor",
    slug: "test-book",
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns default title if book not found", async () => {
    (getPublicBookBySlug as jest.Mock).mockResolvedValue({
      book: null,
      author: null,
      error: "Not found",
    });

    const metadata = await generateMetadata({ params: mockParams });
    expect(metadata.title).toBe("Book not found");
  });

  it("generates correct metadata for a book", async () => {
    const mockBook = {
      title: "My Amazing Book",
      slug: "test-book",
      synopsis: "A great story.",
      cover_image_url: "https://example.com/cover.jpg",
    };
    const mockAuthor = {
      display_name: "Jane Doe",
      pen_name: "janedoe",
    };

    (getPublicBookBySlug as jest.Mock).mockResolvedValue({
      book: mockBook,
      author: mockAuthor,
      error: null,
    });

    const metadata = await generateMetadata({ params: mockParams });

    expect(metadata.title).toBe("My Amazing Book | Jane Doe");
    expect(metadata.description).toBe("A great story.");
    expect(metadata.openGraph?.title).toBe("My Amazing Book | Jane Doe");
    expect(metadata.openGraph?.images).toContainEqual(
      expect.objectContaining({ url: "https://example.com/cover.jpg" })
    );
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });

  it("uses default values for missing book fields", async () => {
    const mockBook = {
      title: "Minimal Book",
      slug: "test-book",
    };
    const mockAuthor = {
      pen_name: "testauthor",
    };

    (getPublicBookBySlug as jest.Mock).mockResolvedValue({
      book: mockBook,
      author: mockAuthor,
      error: null,
    });

    const metadata = await generateMetadata({ params: mockParams });

    expect(metadata.title).toBe("Minimal Book | testauthor");
    expect(metadata.description).toBe("Coming soon from testauthor");
    expect(metadata.openGraph?.images?.[0]).toMatchObject({
        url: "/og-default.png"
    });
  });
});

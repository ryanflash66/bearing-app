import {
  buildDestinationUrl,
  extractR2KeyFromUrl,
  resolveCoverImageStoragePath,
  resolveCoverImageUrl,
  toPublicR2Url,
} from "@/lib/covers/storage";

describe("covers storage helpers", () => {
  const originalR2PublicUrl = process.env.R2_PUBLIC_URL;

  beforeEach(() => {
    process.env.R2_PUBLIC_URL = "https://cdn.example.com";
    process.env.R2_BUCKET_NAME = "bearing-uploads";
  });

  afterAll(() => {
    process.env.R2_PUBLIC_URL = originalR2PublicUrl;
  });

  it("extracts keys from full URLs and direct storage paths", () => {
    expect(extractR2KeyFromUrl("https://cdn.example.com/tmp/covers/m/j/0.webp")).toBe(
      "tmp/covers/m/j/0.webp"
    );
    expect(extractR2KeyFromUrl("tmp/covers/m/j/0.webp")).toBe("tmp/covers/m/j/0.webp");
  });

  it("builds public URLs from destination keys when source host is bucket name", () => {
    const destination = buildDestinationUrl(
      "https://bearing-uploads/tmp/covers/m/j/0.webp",
      "covers/a/m/new.webp"
    );

    expect(destination).toBe("https://cdn.example.com/covers/a/m/new.webp");
    expect(toPublicR2Url("covers/a/m/new.webp")).toBe("https://cdn.example.com/covers/a/m/new.webp");
  });

  it("resolves cover image URLs from canonical storage_path records", () => {
    const record = { storage_path: "tmp/covers/m/j/2.webp" };
    expect(resolveCoverImageStoragePath(record)).toBe("tmp/covers/m/j/2.webp");
    expect(resolveCoverImageUrl(record)).toBe("https://cdn.example.com/tmp/covers/m/j/2.webp");
  });
});


import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { getPublicClient } from "@/lib/public-api";
import { getPublicBookBySlug } from "@/lib/public-book";
import BookLandingPage from "@/components/public/BookLandingPage";

// Cache data fetch to deduplicate between generateMetadata and page component
const getCachedBookResult = cache(async (handle: string, slug: string) => {
  const supabase = getPublicClient();
  return getPublicBookBySlug(supabase, handle, slug);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}): Promise<Metadata> {
  const { handle, slug } = await params;
  const normalizedHandle = decodeURIComponent(handle).trim();
  const normalizedSlug = decodeURIComponent(slug).trim();

  if (!normalizedHandle || !normalizedSlug) {
    return { title: "Book not found" };
  }

  const { book, author } = await getCachedBookResult(normalizedHandle, normalizedSlug);

  if (!book || !author) {
    return { title: "Book not found" };
  }

  const authorName = author.display_name || author.pen_name || normalizedHandle;
  const title = `${book.title} | ${authorName}`;
  const description = book.synopsis || `Coming soon from ${authorName}`;
  const ogImage = book.cover_image_url || author.avatar_url || "/og-default.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "book",
      url: `/${normalizedHandle}/${book.slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${book.title} by ${authorName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicBookPage({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  const { handle, slug } = await params;
  const normalizedHandle = decodeURIComponent(handle).trim();
  const normalizedSlug = decodeURIComponent(slug).trim();

  if (!normalizedHandle || !normalizedSlug) {
    return notFound();
  }

  const { book, author } = await getCachedBookResult(normalizedHandle, normalizedSlug);

  if (!book || !author) {
    return notFound();
  }

  return <BookLandingPage book={book} author={author} />;
}
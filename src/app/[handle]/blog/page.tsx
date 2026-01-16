import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicClient } from "@/lib/public-api";
import { getPublicAuthorProfileByHandle } from "@/lib/public-profile";
import { getPublishedBlogPostsByAuthor } from "@/lib/public-blog";
import BlogCard from "@/components/blog/BlogCard";

function buildPageHref(basePath: string, page: number) {
  if (page <= 1) return basePath;
  return `${basePath}?page=${page}`;
}

export default async function PublicBlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { handle } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const normalizedHandle = decodeURIComponent(handle).trim();

  if (!normalizedHandle) {
    return notFound();
  }

  const rawPage = resolvedSearchParams?.page;
  const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : 1;
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const supabase = getPublicClient();
  const { profile } = await getPublicAuthorProfileByHandle(supabase, normalizedHandle);

  if (!profile) {
    return notFound();
  }

  const { posts, totalPages, totalCount, error } =
    await getPublishedBlogPostsByAuthor(supabase, profile.id, {
      page: currentPage,
      pageSize: 10,
    });

  const displayName = profile.display_name || profile.pen_name || normalizedHandle;
  const handleSlug = profile.pen_name || normalizedHandle;
  const basePath = `/${handleSlug}/blog`;
  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Link href={`/${handleSlug}`} className="hover:text-slate-700">
              {displayName}
            </Link>
            <span>/</span>
            <span>Blog</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{displayName}&apos;s Blog</h1>
            <p className="mt-2 text-sm text-slate-600">
              Read the latest updates and reflections from this author.
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No published blog posts yet.
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <BlogCard
                key={post.id}
                title={post.title}
                excerpt={post.excerpt}
                publishedAt={post.published_at}
                href={`/${handleSlug}/blog/${post.slug}`}
              />
            ))}
          </section>
        )}

        {totalCount > 0 && totalPages > 1 && (
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-3">
              <Link
                href={buildPageHref(basePath, prevPage ?? 1)}
                aria-disabled={!prevPage}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  prevPage
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    : "border-slate-100 bg-slate-100 text-slate-400 pointer-events-none"
                }`}
              >
                Previous
              </Link>
              <Link
                href={buildPageHref(basePath, nextPage ?? totalPages)}
                aria-disabled={!nextPage}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  nextPage
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    : "border-slate-100 bg-slate-100 text-slate-400 pointer-events-none"
                }`}
              >
                Next
              </Link>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

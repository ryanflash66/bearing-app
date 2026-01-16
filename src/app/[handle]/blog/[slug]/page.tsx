import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicClient } from "@/lib/public-api";
import { getPublicAuthorProfileByHandle } from "@/lib/public-profile";
import { getPublishedBlogPostBySlug } from "@/lib/public-blog";
import BlogPostViewer from "@/components/blog/BlogPostViewer";

function getDisplayName(handle: string, profile: { display_name: string | null; pen_name: string | null }) {
  return profile.display_name || profile.pen_name || handle;
}

function buildDescription(excerpt: string | null, contentText: string) {
  const base = excerpt || contentText || "Read the latest update from this author.";
  if (base.length <= 160) return base;
  return `${base.slice(0, 157).trimEnd()}...`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}): Promise<Metadata> {
  const { handle, slug } = await params;
  const normalizedHandle = decodeURIComponent(handle).trim();
  const normalizedSlug = decodeURIComponent(slug).trim();

  if (!normalizedHandle || !normalizedSlug) {
    return { title: "Post not found" };
  }

  const supabase = getPublicClient();
  const { profile } = await getPublicAuthorProfileByHandle(supabase, normalizedHandle);

  if (!profile) {
    return { title: "Author not found" };
  }

  const { post } = await getPublishedBlogPostBySlug(supabase, profile.id, normalizedSlug);

  if (!post) {
    return { title: "Post not found" };
  }

  const authorName = getDisplayName(normalizedHandle, profile);
  const description = buildDescription(post.excerpt, post.content_text);
  const title = `${post.title} | ${authorName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/${profile.pen_name || normalizedHandle}/blog/${post.slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicBlogPostPage({
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

  const supabase = getPublicClient();
  const { profile } = await getPublicAuthorProfileByHandle(supabase, normalizedHandle);

  if (!profile) {
    return notFound();
  }

  const { post } = await getPublishedBlogPostBySlug(supabase, profile.id, normalizedSlug);

  if (!post) {
    return notFound();
  }

  const authorName = getDisplayName(normalizedHandle, profile);
  const handleSlug = profile.pen_name || normalizedHandle;
  const publishedDate = post.published_at || post.updated_at;
  const displayDate = publishedDate ? new Date(publishedDate).toLocaleDateString() : null;
  const hasStructuredContent = post.content_json && Object.keys(post.content_json).length > 0;
  const content = hasStructuredContent ? post.content_json : post.content_text;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href={`/${handleSlug}`} className="hover:text-slate-700">
              {authorName}
            </Link>
            <span>/</span>
            <Link href={`/${handleSlug}/blog`} className="hover:text-slate-700">
              Blog
            </Link>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {displayDate && <span>Published {displayDate}</span>}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {authorName}
              </span>
            </div>
            {post.excerpt && (
              <p className="text-base text-slate-600">{post.excerpt}</p>
            )}
          </div>
        </header>

        <article className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          {content ? (
            <BlogPostViewer content={content} className="prose-lg" />
          ) : (
            <p className="text-sm text-slate-500">This post does not contain any content yet.</p>
          )}
        </article>
      </div>
    </div>
  );
}

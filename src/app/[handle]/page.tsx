import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicClient } from "@/lib/public-api";
import { getPublicAuthorProfileByHandle, getPublishedBooksByAuthor } from "@/lib/public-profile";

function getInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default async function PublicAuthorProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const normalizedHandle = decodeURIComponent(handle).trim();

  if (!normalizedHandle) {
    return notFound();
  }

  const supabase = getPublicClient();
  const { profile } = await getPublicAuthorProfileByHandle(supabase, normalizedHandle);

  if (!profile) {
    return notFound();
  }

  const { books, error: booksError } = await getPublishedBooksByAuthor(supabase, profile.id);

  const displayName = profile.display_name || profile.pen_name || normalizedHandle;
  const initials = getInitials(displayName);
  const bioText = profile.bio || "This author hasn't added a bio yet.";
  const avatarUrl = profile.avatar_url;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${displayName}'s avatar`}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{displayName}</h1>
              <p className="mt-1 text-sm text-slate-500">@{profile.pen_name || normalizedHandle}</p>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">{bioText}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${profile.pen_name || normalizedHandle}/blog`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Visit Blog
            </Link>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Published Books</h2>
              <p className="mt-1 text-sm text-slate-500">Explore what this author has shared publicly.</p>
            </div>
          </div>

          {booksError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {booksError}
            </div>
          )}

          {books.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No published books yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {books.map((book) => (
                <div key={book.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">{book.title}</h3>
                  <p className="mt-2 text-xs text-slate-500">
                    Updated {new Date(book.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

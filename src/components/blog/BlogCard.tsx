import Link from "next/link";

interface BlogCardProps {
  title: string;
  excerpt?: string | null;
  href: string;
  publishedAt?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

export default function BlogCard({
  title,
  excerpt,
  href,
  publishedAt,
}: BlogCardProps) {
  const displayExcerpt = excerpt?.trim() || "No excerpt available.";
  const formattedDate = formatDate(publishedAt);

  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>{formattedDate ? `Published ${formattedDate}` : "Published"}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{displayExcerpt}</p>
      </div>
      <div className="mt-6">
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          Read post
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

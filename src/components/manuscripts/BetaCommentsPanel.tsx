"use client";

interface BetaComment {
  id: string;
  author_name: string;
  comment_text: string;
  selected_text: string;
  type: string;
  status: string;
}

interface BetaCommentsPanelProps {
  comments: BetaComment[];
  onResolve: (commentId: string) => void;
  isLoading?: boolean;
}

export default function BetaCommentsPanel({
  comments,
  onResolve,
  isLoading = false,
}: BetaCommentsPanelProps) {
  return (
    <aside className="hidden xl:flex w-80 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-amber-500">Beta</div>
          <h3 className="text-sm font-semibold text-slate-900">Reader Comments</h3>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
          {comments.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading beta feedback...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-500">No beta comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-600">{comment.author_name}</div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {comment.type}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                “{comment.selected_text.slice(0, 90)}
                {comment.selected_text.length > 90 ? "..." : ""}”
              </div>
              <div className="mt-2 text-sm text-slate-700">{comment.comment_text}</div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase tracking-[0.15em]">
                  {comment.status === "resolved" ? "Resolved" : "Open"}
                </span>
                {comment.status !== "resolved" && (
                  <button
                    onClick={() => onResolve(comment.id)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

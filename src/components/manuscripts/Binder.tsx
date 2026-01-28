import { useMemo } from "react";
import { ConsistencyIssue } from "@/lib/gemini";

interface BinderProps {
  content: string;
  issues?: ConsistencyIssue[];
  onChapterClick?: (chapter: { title: string; index: number }) => void;
  onBadgeClick?: (chapterIndex: number) => void;
  className?: string;
}

interface Chapter {
  title: string;
  startIndex: number;
  endIndex: number;
  index: number;
  issueCount: {
    critical: number;
    warning: number;
  };
}

export default function Binder({ content, issues = [], onChapterClick, onBadgeClick, className = "" }: BinderProps) {

  const chapters = useMemo(() => {
    if (!content) return [];

    const extractedChapters: Chapter[] = [];
    
    // Use exec loop for better compatibility and control
    const regex = /^\s*(#{1,2})\s+(.+)$/gm;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.push(match);
    }
    
    if (matches.length === 0) {
        return [];
    }

    matches.forEach((match, i) => {
        const title = match[2]; // Capturing group 2 is the title
        const startIndex = match.index;
        const nextMatch = matches[i + 1];
        const endIndex = nextMatch ? nextMatch.index : content.length;

        // Count issues in this range
        const chapterIssues = issues.filter(issue => {
            if (!issue.location.quote) return false;
            const quoteIndex = content.indexOf(issue.location.quote);
            if (quoteIndex === -1) return false;
            return quoteIndex >= startIndex && quoteIndex < endIndex;
        });

        const critical = chapterIssues.filter(i => i.severity === "high").length;
        const warning = chapterIssues.filter(i => i.severity === "medium" || i.severity === "low").length;

        extractedChapters.push({
            title,
            startIndex,
            endIndex,
            index: i + 1, // 1-based chapter index
            issueCount: { critical, warning }
        });
    });

    return extractedChapters;
  }, [content, issues]);

  if (chapters.length === 0) {
      return null;
  }

  return (
    <aside className={`w-64 bg-slate-50/90 backdrop-blur-md border-r border-slate-200/50 overflow-y-auto flex-shrink-0 transition-all duration-300 ease-in-out ${className}`}>
      {/* Hide header when className includes border-0 (mobile sheet has its own header) */}
      {!className.includes('border-0') && (
        <div className="p-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Binder</h2>
        </div>
      )}
      <ul className="py-2 space-y-0.5">
        {chapters.map((chapter, index) => (
          <li key={index}>
            <button
              onClick={() => onChapterClick?.({ title: chapter.title, index: chapter.startIndex })}
              className="w-full text-left px-4 py-3 min-h-[44px] hover:bg-slate-100/50 flex items-center justify-between group transition-colors"
            >
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 line-clamp-2">
                {chapter.title}
              </span>
              
              {/* Badges */}
              {(chapter.issueCount.critical > 0 || chapter.issueCount.warning > 0) && (
                <div 
                  className="flex gap-1 ml-2 flex-shrink-0 cursor-pointer hover:opacity-80 active:scale-95 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBadgeClick?.(chapter.index);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      onBadgeClick?.(chapter.index);
                    }
                  }}
                >
                  {chapter.issueCount.critical > 0 && (
                    <span 
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                        title="Critical Issues"
                        aria-label={`Critical Issues: ${chapter.issueCount.critical}`}
                    >
                      <span className="mr-0.5">🔴</span> {chapter.issueCount.critical}
                    </span>
                  )}
                  {chapter.issueCount.warning > 0 && (
                     <span 
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                        title="Warnings"
                        aria-label={`Warnings: ${chapter.issueCount.warning}`}
                     >
                       <span className="mr-0.5">🟡</span> {chapter.issueCount.warning}
                     </span>
                  )}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

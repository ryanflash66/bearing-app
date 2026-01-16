"use client";

import TiptapEditor from "@/components/editor/TiptapEditor";

interface BlogPostViewerProps {
  content: string | object;
  className?: string;
}

export default function BlogPostViewer({ content, className = "" }: BlogPostViewerProps) {
  return (
    <TiptapEditor
      content={content}
      editable={false}
      placeholder=""
      className={`min-h-0 ${className}`}
    />
  );
}

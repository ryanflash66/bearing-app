"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import type { Manuscript } from "@/lib/manuscripts";
import CoverGenerator from "@/components/marketing/CoverGenerator";

interface Signup {
  id: string;
  email: string;
  created_at: string;
  source: string | null;
}

/** Subset of Manuscript fields needed by the marketing dashboard. */
type MarketingManuscript = Pick<
  Manuscript,
  | "id"
  | "title"
  | "slug"
  | "is_public"
  | "subtitle"
  | "synopsis"
  | "theme_config"
  | "owner_user_id"
  | "cover_image_url"
  | "metadata"
>;

interface MarketingDashboardProps {
  manuscript: MarketingManuscript;
  signups: Signup[];
  userHandle: string;
}

export default function MarketingDashboard({
  manuscript,
  signups,
  userHandle,
}: MarketingDashboardProps) {
  const supabase = createClient();
  const router = useRouter();

  const [slug, setSlug] = useState(manuscript.slug || "");
  const [isPublic, setIsPublic] = useState(manuscript.is_public);
  const [subtitle, setSubtitle] = useState(manuscript.subtitle || "");
  const [synopsis, setSynopsis] = useState(manuscript.synopsis || "");
  const [theme, setTheme] = useState(manuscript.theme_config?.theme || "light");
  const [accentColor, setAccentColor] = useState(manuscript.theme_config?.accent_color || "#78716c");
  const [activeTab, setActiveTab] = useState<"landing" | "cover-lab">("landing");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const publicUrl = `/${userHandle}/${slug}`;

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("manuscripts")
        .update({
          slug,
          is_public: isPublic,
          subtitle,
          synopsis,
          theme_config: { theme, accent_color: accentColor },
          updated_at: new Date().toISOString(),
        })
        .eq("id", manuscript.id);

      if (error) throw error;

      setMessage("Saved successfully!");
      router.refresh();
    } catch (err: unknown) {
      console.error("Error saving:", err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Unknown error";
      setMessage("Failed to save: " + message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const headers = ["Email", "Date", "Source"];
    const rows = signups.map((s) => [
      s.email,
      new Date(s.created_at).toLocaleDateString(),
      s.source || "landing_page",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${manuscript.title.replace(/\s+/g, "_")}_signups.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Marketing Dashboard</h1>
          <p className="text-stone-500">{manuscript.title}</p>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm text-stone-600">
                {isPublic ? "Public" : "Private"}
            </span>
            <button
                onClick={() => setIsPublic(!isPublic)}
                aria-label="Toggle public visibility"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? "bg-green-600" : "bg-stone-300"}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`}
                />
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200 space-y-4">
        <div className="border-b border-stone-200 pb-3">
          <div className="inline-flex rounded-md border border-stone-300 p-1">
            <button
              onClick={() => setActiveTab("landing")}
              className={`rounded px-3 py-2 text-sm font-medium ${
                activeTab === "landing"
                  ? "bg-stone-900 text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              Landing Page
            </button>
            <button
              onClick={() => setActiveTab("cover-lab")}
              className={`rounded px-3 py-2 text-sm font-medium ${
                activeTab === "cover-lab"
                  ? "bg-stone-900 text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              Cover Lab
            </button>
          </div>
        </div>

        {activeTab === "landing" && (
          <>
        <h2 className="text-lg font-semibold">Landing Page Content</h2>
        
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-700">URL Slug</label>
                <div className="flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-stone-300 bg-stone-50 text-stone-500 text-sm">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/{userHandle}/
                    </span>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-stone-300 focus:ring-stone-500 focus:border-stone-500 sm:text-sm"
                        placeholder="my-book-title"
                    />
                </div>
                {slug && (
                    <p className="text-sm text-stone-500">
                        Preview: <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{publicUrl}</a>
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-700">Subtitle</label>
                <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="block w-full px-3 py-2 rounded-md border border-stone-300 focus:ring-stone-500 focus:border-stone-500 sm:text-sm"
                    placeholder="A compelling subtitle for your landing page"
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-700">Synopsis / Blurb</label>
                <textarea
                    rows={4}
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    className="block w-full px-3 py-2 rounded-md border border-stone-300 focus:ring-stone-500 focus:border-stone-500 sm:text-sm"
                    placeholder="Write a short summary that makes readers want to join your waitlist."
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-stone-700">Theme</label>
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="block w-full px-3 py-2 rounded-md border border-stone-300 focus:ring-stone-500 focus:border-stone-500 sm:text-sm"
                    >
                        <option value="light">Light (Classic)</option>
                        <option value="dark">Dark (Modern)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-stone-700">Accent Color</label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="h-9 w-12 p-0.5 rounded-md border border-stone-300"
                        />
                        <input
                            type="text"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-md border border-stone-300 focus:ring-stone-500 focus:border-stone-500 sm:text-sm"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-4 border-t border-stone-100">
            <button
                onClick={handleSave}
                disabled={saving}
                className="bg-stone-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
            >
                {saving ? "Saving..." : "Save Changes"}
            </button>
            {message && (
                <span className={`ml-4 text-sm ${message.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                    {message}
                </span>
            )}
        </div>
          </>
        )}

        {activeTab === "cover-lab" && (
          <CoverGenerator
            manuscriptId={manuscript.id}
            manuscriptTitle={manuscript.title}
            authorName={
              manuscript.metadata &&
              typeof manuscript.metadata === "object" &&
              "author_name" in manuscript.metadata
                ? String((manuscript.metadata as Record<string, unknown>).author_name || userHandle)
                : userHandle
            }
            currentCoverUrl={manuscript.cover_image_url}
            manuscriptMetadata={
              manuscript.metadata && typeof manuscript.metadata === "object"
                ? (manuscript.metadata as Record<string, unknown>)
                : null
            }
          />
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-200">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Email Signups ({signups.length})</h2>
            <button
                onClick={handleExport}
                disabled={signups.length === 0}
                className="text-stone-600 hover:text-stone-900 text-sm font-medium flex items-center gap-2"
            >
                Download CSV
            </button>
        </div>

        {signups.length === 0 ? (
            <p className="text-stone-500 text-center py-8">No signups yet.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200">
                    <thead className="bg-stone-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Source</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-stone-200">
                        {signups.map((s) => (
                            <tr key={s.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">{s.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                    {new Date(s.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{s.source || "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}

"use client";

const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "Twitter/X" },
  { value: "facebook", label: "Facebook" },
  { value: "pinterest", label: "Pinterest" },
  { value: "threads", label: "Threads" },
];

const CONTENT_TYPES = [
  { value: "graphics", label: "Static Graphics" },
  { value: "stories", label: "Story Templates" },
  { value: "reels", label: "Video/Reels" },
  { value: "captions", label: "Caption Templates" },
  { value: "hashtags", label: "Hashtag Sets" },
  { value: "schedule", label: "Content Calendar" },
];

export interface SocialMediaData {
  bookGenre: string;
  targetAudience: string;
  platforms: string[];
  contentTypes: string[];
  timeline: string;
  additionalDetails: string;
}

interface SocialMediaFormProps {
  data: SocialMediaData;
  onChange: (data: SocialMediaData) => void;
  prompt: string;
}

export default function SocialMediaForm({
  data,
  onChange,
  prompt,
}: SocialMediaFormProps) {
  return (
    <>
      <div>
        <label htmlFor="socialGenre" className="block text-sm font-medium text-slate-700">
          Book Genre
        </label>
        <input
          id="socialGenre"
          type="text"
          value={data.bookGenre}
          onChange={(e) => onChange({ ...data, bookGenre: e.target.value })}
          placeholder="e.g., Fantasy, Memoir, Business..."
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="socialAudience" className="block text-sm font-medium text-slate-700">
          Target Audience
        </label>
        <textarea
          id="socialAudience"
          rows={2}
          value={data.targetAudience}
          onChange={(e) => onChange({ ...data, targetAudience: e.target.value })}
          placeholder="Describe your ideal readers..."
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Social Platforms
        </label>
        <div className="flex flex-wrap gap-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <label key={platform.value} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={data.platforms.includes(platform.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange({ ...data, platforms: [...data.platforms, platform.value] });
                  } else {
                    onChange({ ...data, platforms: data.platforms.filter(p => p !== platform.value) });
                  }
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-slate-700">{platform.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Content Types Needed
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((type) => (
            <label key={type.value} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={data.contentTypes.includes(type.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange({ ...data, contentTypes: [...data.contentTypes, type.value] });
                  } else {
                    onChange({ ...data, contentTypes: data.contentTypes.filter(t => t !== type.value) });
                  }
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-slate-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="timeline" className="block text-sm font-medium text-slate-700">
          Publication Timeline
        </label>
        <input
          id="timeline"
          type="text"
          value={data.timeline}
          onChange={(e) => onChange({ ...data, timeline: e.target.value })}
          placeholder="e.g., Launching March 2026, Already published..."
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="socialDetails" className="block text-sm font-medium text-slate-700">
          Additional Details <span className="text-slate-400">(optional)</span>
        </label>
        <p className="mt-1 text-sm text-slate-500 mb-2">{prompt}</p>
        <textarea
          id="socialDetails"
          rows={3}
          value={data.additionalDetails}
          onChange={(e) => onChange({ ...data, additionalDetails: e.target.value })}
          placeholder="Any specific themes, hashtags, or requirements..."
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
    </>
  );
}

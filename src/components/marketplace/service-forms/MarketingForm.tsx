"use client";

const MARKETING_GOALS = [
  { value: "launch", label: "Book Launch Campaign" },
  { value: "ongoing", label: "Ongoing Promotion" },
  { value: "email", label: "Email List Growth" },
  { value: "reviews", label: "Review Generation" },
  { value: "visibility", label: "Increased Visibility" },
  { value: "sales", label: "Sales Boost" },
];

const MARKETING_PLATFORMS = [
  { value: "amazon", label: "Amazon Ads" },
  { value: "facebook", label: "Facebook/Meta" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok/BookTok" },
  { value: "goodreads", label: "Goodreads" },
  { value: "bookbub", label: "BookBub" },
  { value: "email", label: "Email Marketing" },
];

const BUDGET_RANGES = [
  { value: "", label: "Select budget range" },
  { value: "starter", label: "Starter ($500-1,000)" },
  { value: "standard", label: "Standard ($1,000-2,500)" },
  { value: "premium", label: "Premium ($2,500-5,000)" },
  { value: "custom", label: "Custom (let's discuss)" },
];

export interface MarketingData {
  bookGenre: string;
  targetAudience: string;
  goals: string[];
  budgetRange: string;
  platforms: string[];
  additionalDetails: string;
}

interface MarketingFormProps {
  data: MarketingData;
  onChange: (data: MarketingData) => void;
  prompt: string;
}

export default function MarketingForm({
  data,
  onChange,
  prompt,
}: MarketingFormProps) {
  return (
    <>
      <div>
        <label htmlFor="bookGenre" className="block text-sm font-medium text-slate-700">
          Book Genre
        </label>
        <input
          id="bookGenre"
          type="text"
          value={data.bookGenre}
          onChange={(e) => onChange({ ...data, bookGenre: e.target.value })}
          placeholder="e.g., Romance, Thriller, Self-Help..."
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="targetAudience" className="block text-sm font-medium text-slate-700">
          Target Audience
        </label>
        <textarea
          id="targetAudience"
          rows={2}
          value={data.targetAudience}
          onChange={(e) => onChange({ ...data, targetAudience: e.target.value })}
          placeholder="Describe your ideal readers (age, interests, reading habits)..."
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Marketing Goals
        </label>
        <div className="flex flex-wrap gap-2">
          {MARKETING_GOALS.map((goal) => (
            <label key={goal.value} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={data.goals.includes(goal.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange({ ...data, goals: [...data.goals, goal.value] });
                  } else {
                    onChange({ ...data, goals: data.goals.filter(g => g !== goal.value) });
                  }
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-slate-700">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Preferred Platforms
        </label>
        <div className="flex flex-wrap gap-2">
          {MARKETING_PLATFORMS.map((platform) => (
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
        <label htmlFor="marketingBudget" className="block text-sm font-medium text-slate-700">
          Budget Range
        </label>
        <select
          id="marketingBudget"
          value={data.budgetRange}
          onChange={(e) => onChange({ ...data, budgetRange: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {BUDGET_RANGES.map((range) => (
            <option key={range.value} value={range.value}>{range.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="marketingDetails" className="block text-sm font-medium text-slate-700">
          Additional Details <span className="text-slate-400">(optional)</span>
        </label>
        <p className="mt-1 text-sm text-slate-500 mb-2">{prompt}</p>
        <textarea
          id="marketingDetails"
          rows={3}
          value={data.additionalDetails}
          onChange={(e) => onChange({ ...data, additionalDetails: e.target.value })}
          placeholder="Any specific campaigns, timing, or requirements..."
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
    </>
  );
}

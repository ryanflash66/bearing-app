"use client";

const DESIGN_STYLES = [
  { value: "", label: "Select a style" },
  { value: "modern", label: "Modern & Minimalist" },
  { value: "classic", label: "Classic & Elegant" },
  { value: "bold", label: "Bold & Colorful" },
  { value: "cozy", label: "Warm & Cozy" },
  { value: "professional", label: "Clean & Professional" },
  { value: "whimsical", label: "Playful & Whimsical" },
];

const WEBSITE_PAGES = [
  { value: "home", label: "Home" },
  { value: "about", label: "About the Author" },
  { value: "books", label: "Books/Works" },
  { value: "blog", label: "Blog" },
  { value: "contact", label: "Contact" },
  { value: "newsletter", label: "Newsletter Signup" },
  { value: "events", label: "Events/Appearances" },
  { value: "media", label: "Media Kit" },
];

const BUDGET_RANGES = [
  { value: "", label: "Select budget range" },
  { value: "starter", label: "Starter ($500-1,000)" },
  { value: "standard", label: "Standard ($1,000-2,500)" },
  { value: "premium", label: "Premium ($2,500-5,000)" },
  { value: "custom", label: "Custom (let's discuss)" },
];

export interface AuthorWebsiteData {
  designStyle: string;
  pages: string[];
  budgetRange: string;
  additionalDetails: string;
}

interface AuthorWebsiteFormProps {
  data: AuthorWebsiteData;
  onChange: (data: AuthorWebsiteData) => void;
  prompt: string;
}

export default function AuthorWebsiteForm({
  data,
  onChange,
  prompt,
}: AuthorWebsiteFormProps) {
  return (
    <>
      <div>
        <label htmlFor="designStyle" className="block text-sm font-medium text-slate-700">
          Design Style
        </label>
        <select
          id="designStyle"
          value={data.designStyle}
          onChange={(e) => onChange({ ...data, designStyle: e.target.value })}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {DESIGN_STYLES.map((style) => (
            <option key={style.value} value={style.value}>{style.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Pages Needed
        </label>
        <div className="flex flex-wrap gap-2">
          {WEBSITE_PAGES.map((page) => (
            <label key={page.value} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={data.pages.includes(page.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange({ ...data, pages: [...data.pages, page.value] });
                  } else {
                    onChange({ ...data, pages: data.pages.filter(p => p !== page.value) });
                  }
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-slate-700">{page.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="budgetRange" className="block text-sm font-medium text-slate-700">
          Budget Range
        </label>
        <select
          id="budgetRange"
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
        <label htmlFor="additionalDetails" className="block text-sm font-medium text-slate-700">
          Additional Details <span className="text-slate-400">(optional)</span>
        </label>
        <p className="mt-1 text-sm text-slate-500 mb-2">{prompt}</p>
        <textarea
          id="additionalDetails"
          rows={4}
          value={data.additionalDetails}
          onChange={(e) => onChange({ ...data, additionalDetails: e.target.value })}
          placeholder="Any existing branding, domain name, or special requirements..."
          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
    </>
  );
}

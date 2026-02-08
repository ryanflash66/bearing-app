"use client";

interface GenericServiceFormProps {
  details: string;
  onChange: (details: string) => void;
  prompt: string;
}

export default function GenericServiceForm({
  details,
  onChange,
  prompt,
}: GenericServiceFormProps) {
  return (
    <div>
      <label
        htmlFor="details"
        className="block text-sm font-medium text-slate-700"
      >
        Request Details
      </label>
      <p className="mt-1 text-sm text-slate-500 mb-3">{prompt}</p>
      <textarea
        id="details"
        rows={6}
        value={details}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your requirements..."
        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      />
    </div>
  );
}

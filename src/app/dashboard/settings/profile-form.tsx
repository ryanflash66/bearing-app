"use client";

import { useState } from "react";
import { updateProfileName } from "./actions";

export function ProfileForm({ initialDisplayName, email }: { initialDisplayName: string; email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    try {
      const result = await updateProfileName(formData);
      if (result?.error) {
        if (result.error === "Unauthorized") {
           setMessage({ type: "error", text: "Your session has expired. Please sign in again." });
        } else {
           setMessage({ type: "error", text: result.error });
        }
      } else {
        setMessage({ type: "success", text: "Profile updated successfully." });
      }
    } catch (e) {
      // Fallback for unexpected failures (e.g. network)
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="px-6 pb-6 space-y-4">
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
        <input 
          id="email" 
          value={email} 
          disabled 
          className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm opacity-70 cursor-not-allowed"
        />
        <p className="text-sm text-slate-500">
          Managed by your authentication provider.
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="displayName" className="text-sm font-medium leading-none">Display Name</label>
        <input 
          id="displayName"
          name="displayName"
          defaultValue={initialDisplayName}
          placeholder="Enter your name"
          required
          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
        />
      </div>
      
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <hr className="my-4 border-slate-200" />
      
      <div className="flex justify-end">
        <button 
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

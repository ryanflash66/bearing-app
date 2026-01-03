"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";

export default function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isNetworkOrServerError = (error: Error | { message: string }): boolean => {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("failed to fetch") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    );
  };

  const handleRetry = () => {
    setError(null);
    setIsNetworkError(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsNetworkError(false);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        if (isNetworkOrServerError(error)) {
          setIsNetworkError(true);
        }
        setError(error.message);
        setLoading(false);
      } else {
        logAuditEvent("password_reset_success", {
          userId: user?.id,
          email: user?.email ?? undefined,
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setIsNetworkError(true);
      setLoading(false);
    }
  };

  const RetryButton = () => (
    <button
      type="button"
      onClick={handleRetry}
      className="mt-2 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Try again
    </button>
  );

  return (
    <form onSubmit={handleUpdate} className="space-y-4 max-w-sm mx-auto">
      <h2 className="text-xl font-bold text-center">Set New Password</h2>
      {error && (
        <div className="text-red-600 text-sm">
          <p>{error}</p>
          {isNetworkError && <RetryButton />}
        </div>
      )}
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
        />
        <p className="text-gray-500 text-xs mt-1">
          Password must be at least 8 characters long
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

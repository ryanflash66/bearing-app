"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { logAuditEvent } from "@/lib/audit";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsNetworkError(false);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/auth/update-password`,
      });

      if (error) {
        if (isNetworkOrServerError(error)) {
          setIsNetworkError(true);
        }
        setError(error.message);
      } else {
        // Always log the request (note: we don't reveal if email exists)
        logAuditEvent("password_reset_request", {
          email,
        });
        setMessage("Check your email for the password reset link");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setIsNetworkError(true);
    }
    
    setLoading(false);
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
    <form onSubmit={handleReset} className="space-y-4 max-w-sm mx-auto">
      {error && (
        <div className="text-red-600 text-sm">
          <p>{error}</p>
          {isNetworkError && <RetryButton />}
        </div>
      )}
      {message && <div className="text-green-600 text-sm">{message}</div>}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? "Sending link..." : "Send Reset Link"}
      </button>
    </form>
  );
}

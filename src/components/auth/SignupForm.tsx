"use client";

import { useTransition, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { logAuditEvent } from "@/lib/audit";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsNetworkError(false);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });

        if (error) {
          logAuditEvent("signup_failure", {
            email,
            metadata: { reason: error.message },
          });

          if (isNetworkOrServerError(error)) {
            setIsNetworkError(true);
          }
          setError(error.message);
        } else {
          logAuditEvent("signup", {
            email,
            userId: data.user?.id,
          });
          setSuccess(true);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        
        logAuditEvent("signup_failure", {
          email,
          metadata: { reason: errorMessage, type: "unexpected_error" },
        });
        
        setError(errorMessage);
        setIsNetworkError(true);
      }
    });
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

  if (success) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <h3 className="text-green-800 font-bold">Check your email</h3>
        <p className="text-green-700">
          We have sent a verification link to <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4 max-w-sm mx-auto">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          disabled={isPending}
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          disabled={isPending}
        />
        <p className="text-gray-500 text-xs mt-1">
          Password must be at least 8 characters long
        </p>
      </div>
      {error && (
        <div className="text-red-500 text-sm">
          <p>{error}</p>
          {isNetworkError && <RetryButton />}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isPending ? "Signing up..." : "Sign up"}
      </button>
    </form>
  );
}

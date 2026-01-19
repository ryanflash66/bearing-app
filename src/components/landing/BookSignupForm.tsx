"use client";

import { useState, useRef } from "react";

interface BookSignupFormProps {
  manuscriptId: string;
  isDark?: boolean;
  accentColor?: string;
}

export function BookSignupForm({
  manuscriptId,
  isDark = false,
  accentColor = "#3b82f6",
}: BookSignupFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Honeypot field for spam protection
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check honeypot
    if (honeypotRef.current?.value) {
      // Bot detected - fake success
      setStatus("success");
      return;
    }

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/public/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manuscriptId,
          email,
          source: "landing_page",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        className={`rounded-lg p-6 text-center ${
          isDark ? "bg-slate-800" : "bg-green-50"
        }`}
      >
        <div
          className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
            isDark ? "bg-green-900/50" : "bg-green-100"
          }`}
        >
          <svg
            className="h-6 w-6 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3
          className={`text-lg font-semibold ${isDark ? "text-white" : "text-green-900"}`}
        >
          You&apos;re on the list!
        </h3>
        <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-green-700"}`}>
          We&apos;ll let you know when this book launches.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Honeypot field - hidden from real users */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          style={{
            position: "absolute",
            left: "-9999px",
            opacity: 0,
            height: 0,
            width: 0,
          }}
          aria-hidden="true"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          disabled={status === "loading"}
          className={`flex-1 rounded-lg border px-4 py-3 text-base outline-none transition-colors focus:ring-2 ${
            isDark
              ? "border-slate-600 bg-slate-800 text-white placeholder-slate-400 focus:border-transparent"
              : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-transparent"
          }`}
          style={{
            // @ts-expect-error CSS variable
            "--tw-ring-color": accentColor,
          }}
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg px-6 py-3 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {status === "loading" ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Joining...
            </span>
          ) : (
            "Get Notified"
          )}
        </button>
      </div>

      {status === "error" && errorMessage && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}

      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        We&apos;ll only email you when the book launches. No spam, ever.
      </p>
    </form>
  );
}

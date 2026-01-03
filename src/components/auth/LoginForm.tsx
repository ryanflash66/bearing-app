"use client";

import { useTransition, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  logAuditEvent,
  isAccountLocked,
  recordMfaFailure,
  resetMfaFailures,
  getRemainingMfaAttempts,
} from "@/lib/audit";

interface LoginFormProps {
  returnUrl?: string;
}

export default function LoginForm({ returnUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Check lockout status on mount and periodically
  useEffect(() => {
    const checkLockout = () => {
      const { locked, remainingSeconds } = isAccountLocked();
      setIsLocked(locked);
      setLockoutRemaining(remainingSeconds);
      setRemainingAttempts(getRemainingMfaAttempts());
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatLockoutTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

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

  const handleRetry = useCallback(() => {
    setError(null);
    setIsNetworkError(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsNetworkError(false);

    // Check if account is locked before proceeding
    if (needsMfa && isLocked) {
      setError(`Account locked due to too many failed attempts. Try again in ${formatLockoutTime(lockoutRemaining)}.`);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      try {
        if (needsMfa) {
          // Build challenge for MFA
          const { data: factors, error: factorsError } =
            await supabase.auth.mfa.listFactors();
          if (factorsError) {
            if (isNetworkOrServerError(factorsError)) {
              setIsNetworkError(true);
            }
            setError(factorsError.message);
            return;
          }

          const totpFactor = factors.totp.find((f) => f.status === "verified");
          if (!totpFactor) {
            setError("No verified MFA factor found");
            return;
          }

          const { data: challenge, error: challengeError } =
            await supabase.auth.mfa.challenge({
              factorId: totpFactor.id,
            });

          if (challengeError) {
            if (isNetworkOrServerError(challengeError)) {
              setIsNetworkError(true);
            }
            setError(challengeError.message);
            return;
          }

          logAuditEvent("mfa_challenge", { email });

          const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId: totpFactor.id,
            challengeId: challenge.id,
            code: mfaCode,
          });

          if (verifyError) {
            // Record MFA failure and check for lockout
            const nowLocked = recordMfaFailure(email);
            setRemainingAttempts(getRemainingMfaAttempts());

            if (nowLocked) {
              const { remainingSeconds } = isAccountLocked();
              setIsLocked(true);
              setLockoutRemaining(remainingSeconds);
              setError(
                `Account locked due to too many failed attempts. Try again in ${formatLockoutTime(remainingSeconds)}.`
              );
            } else {
              const remaining = getRemainingMfaAttempts();
              setError(
                `${verifyError.message}. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
              );
            }

            if (isNetworkOrServerError(verifyError)) {
              setIsNetworkError(true);
            }
          } else {
            // Success - reset MFA failures and log
            resetMfaFailures();
            logAuditEvent("mfa_success", { email });
            logAuditEvent("login_success", { email });
            router.push(returnUrl || "/dashboard");
            router.refresh();
          }

          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          logAuditEvent("login_failure", {
            email,
            metadata: { reason: error.message },
          });

          if (isNetworkOrServerError(error)) {
            setIsNetworkError(true);
          }
          setError(error.message);
          return;
        }

        // Check if MFA is required
        const { data: mfaData, error: mfaError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (mfaError) {
          if (isNetworkOrServerError(mfaError)) {
            setIsNetworkError(true);
          }
          setError(mfaError.message);
          return;
        }

        const { data: listFactors, error: listError } =
          await supabase.auth.mfa.listFactors();
        if (listError) {
          if (isNetworkOrServerError(listError)) {
            setIsNetworkError(true);
          }
          setError(listError.message);
          return;
        }

        const isMFAEnrolled = listFactors?.totp?.some(
          (f) => f.status === "verified"
        );
        const currentLevel = mfaData?.currentLevel;
        const nextLevel = mfaData?.nextLevel;

        if (isMFAEnrolled && nextLevel && currentLevel && nextLevel > currentLevel) {
          setNeedsMfa(true);
        } else {
          logAuditEvent("login_success", { email, userId: data.user?.id });
          router.push(returnUrl || "/dashboard");
          router.refresh();
        }
      } catch (err) {
        // Catch any unexpected errors (likely network issues)
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        setIsNetworkError(true);
        logAuditEvent("login_failure", {
          email,
          metadata: { reason: errorMessage, type: "unexpected_error" },
        });
      }
    });
  };

  // Retry button component
  const RetryButton = () => (
    <button
      type="button"
      onClick={handleRetry}
      className="mt-2 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Try again
    </button>
  );

  if (needsMfa) {
    return (
      <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto">
        <h3 className="text-lg font-medium">Two-Factor Authentication</h3>

        {isLocked ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">Account Temporarily Locked</p>
            <p className="text-red-700 text-sm mt-1">
              Too many failed MFA attempts. Please try again in{" "}
              <span className="font-mono font-bold">
                {formatLockoutTime(lockoutRemaining)}
              </span>
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Authentication Code
              </label>
              <input
                type="text"
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-slate-900"
                placeholder="123456"
                disabled={isPending}
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              {remainingAttempts < 5 && (
                <p className="text-amber-600 text-xs mt-1">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""}{" "}
                  remaining before lockout
                </p>
              )}
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
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Verifying..." : "Verify"}
            </button>
          </>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto">
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-slate-900"
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-slate-900"
          disabled={isPending}
        />
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
        {isPending ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}

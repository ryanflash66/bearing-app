"use client";

import { useTransition, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      
      if (needsMfa) {
        // Build challenge for MFA
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) {
             setError(factorsError.message);
             return;
        }
        
        const totpFactor = factors.totp.find(f => f.status === 'verified');
        if (!totpFactor) {
             setError("No verified MFA factor found");
             return;
        }

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId: totpFactor.id
        });

        if (challengeError) {
             setError(challengeError.message);
             return;
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId: totpFactor.id,
            challengeId: challenge.id,
            code: mfaCode
        });

        if (verifyError) {
            setError(verifyError.message);
        } else {
             // success
            router.push("/dashboard");
            router.refresh();
        }

        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }
      
      // Check if MFA is required
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (mfaError) {
          setError(mfaError.message);
          return;
      }

      const { data: listFactors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
          setError(listError.message);
          return;
      }

      const isMFAEnrolled = listFactors?.totp?.some(f => f.status === 'verified');
      const currentLevel = mfaData?.currentLevel;
      const nextLevel = mfaData?.nextLevel;

      if (isMFAEnrolled && nextLevel && currentLevel && nextLevel > currentLevel) {
          setNeedsMfa(true);
      } else {
          router.push("/dashboard");
          router.refresh();
      }
    });
  };

  if (needsMfa) {
      return (
        <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto">
             <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
             <div>
                <label className="block text-sm font-medium text-gray-700">Authentication Code</label>
                <input
                  type="text"
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                   className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                   placeholder="123456"
                   disabled={isPending}
                />
             </div>
             {error && <p className="text-red-500 text-sm">{error}</p>}
             <button
                type="submit"
                disabled={isPending}
                 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
             >
                {isPending ? "Verifying..." : "Verify"}
             </button>
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          disabled={isPending}
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
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

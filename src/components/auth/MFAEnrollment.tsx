"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { logAuditEvent } from "@/lib/audit";

export default function MFAEnrollment({ onEnrolled }: { onEnrolled?: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

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

  const setupMFA = async () => {
    setSetupError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user found");

      // Step 1: List existing factors
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      // Step 2: Clean up ANY existing TOTP factors that are not verified
      // If the user is here, they want to setup MFA, so partial attempts should be wiped
      const mfaData = factors as any;
      const totpFactors = (mfaData?.totp || []) as any[];
      const unverifiedFactors = totpFactors.filter(f => f.status === 'unverified');
      
      for (const factor of unverifiedFactors) {
         console.log("Cleaning up unverified factor:", factor.id);
         await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      // Step 3: Enroll new factor
      const friendlyName = `Bearing App (${user.email})`;
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName, 
        issuer: "Bearing App",
      });

      if (error) {
        setSetupError(error.message);
        return;
      }

      setFactorId(data.id);
      setSecret(data.totp.secret);
      setQrCodeData(data.totp.qr_code);
    } catch (err) {
      console.error("MFA Setup Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to setup MFA";
      setSetupError(errorMessage);
    }
  };

  useEffect(() => {
    setupMFA();
  }, []);

  const handleRetry = () => {
    setError(null);
    setIsNetworkError(false);
  };

  const handleSetupRetry = () => {
    setSetupError(null);
    setupMFA();
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setLoading(true);
    setError(null);
    setIsNetworkError(false);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      setLoading(false);

      if (error) {
        if (isNetworkOrServerError(error)) {
          setIsNetworkError(true);
        }
        setError(error.message);
      } else {
        logAuditEvent("mfa_enabled", {
          userId: user?.id,
          email: user?.email ?? undefined,
        });
        if (onEnrolled) onEnrolled();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setIsNetworkError(true);
      setLoading(false);
    }
  };

  const RetryButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Try again
    </button>
  );

  if (setupError) {
    return (
      <div className="space-y-4 max-w-sm mx-auto p-4 border rounded bg-white">
        <h3 className="text-lg font-bold">Enable Two-Factor Authentication</h3>
        <div className="text-red-500 text-sm">
          <p>{setupError}</p>
          <RetryButton onClick={handleSetupRetry} />
        </div>
      </div>
    );
  }

  if (!qrCodeData) {
    return (
      <div className="space-y-4 max-w-sm mx-auto p-4 border rounded bg-white">
        <h3 className="text-lg font-bold">Enable Two-Factor Authentication</h3>
        <p className="text-gray-600">Loading MFA setup...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-sm mx-auto p-4 border rounded bg-white">
      <h3 className="text-lg font-bold">Enable Two-Factor Authentication</h3>
      <p className="text-sm text-gray-600">
        Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.).
      </p>

      <div className="flex justify-center my-4">
        <img src={qrCodeData} alt="QR Code" className="w-48 h-48" />
      </div>
      
      <div className="bg-gray-50 p-2 rounded text-xs break-all font-mono text-center">
        {secret}
      </div>

      <form onSubmit={onVerify} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Enter Code</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className="w-full rounded border-gray-300 p-2 border text-slate-900"
          maxLength={6}
          pattern="[0-9]{6}"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        {error && (
          <div className="text-red-500 text-sm">
            <p>{error}</p>
            {isNetworkError && <RetryButton onClick={handleRetry} />}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Enable MFA"}
        </button>
      </form>
    </div>
  );
}

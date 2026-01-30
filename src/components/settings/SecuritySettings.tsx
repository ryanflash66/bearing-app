"use client";

import MFAEnrollment from "@/components/auth/MFAEnrollment";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function SecuritySettings() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);

  const supabase = createClient();

  async function checkMFA() {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        throw error;
      }

      if (factors) {
        const verifiedFactor = factors.totp.find((f) => f.status === "verified");
        setFactorId(verifiedFactor?.id || null);
      }
    } catch (err) {
      console.error("Error checking MFA status:", err);
      setError("Unable to load security settings. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkMFA();
  }, []);

  const handleDisableMFA = async () => {
    if (!factorId) return;
    
    setDisabling(true);
    setError(null);

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      
      setFactorId(null);
    } catch (err) {
      console.error("Error disabling MFA:", err);
      setError("Failed to disable 2FA. Please try again.");
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900">Security</h3>
          <p className="text-sm text-slate-500">Loading security settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-900">Two-Factor Authentication</h3>
        <p className="text-sm text-slate-500">
          Add an extra layer of security to your account by requiring a code from your authenticator app.
        </p>

        {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>

      <div className="px-6 pb-6 border-t border-slate-100 pt-6">
        {factorId ? (
          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
             <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </div>
                <div>
                   <h4 className="text-sm font-medium text-emerald-900">2FA is Enabled</h4>
                   <p className="text-sm text-emerald-700">Your account is secured with TOTP.</p>
                </div>
             </div>
             
             <button
                onClick={handleDisableMFA}
                disabled={disabling}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {disabling ? "Disabling..." : "Disable 2FA"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
             <MFAEnrollment onEnrolled={checkMFA} />
          </div>
        )}
      </div>
    </div>
  );
}

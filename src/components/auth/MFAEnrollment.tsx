"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import QRCode from "qrcode";

export default function MFAEnrollment({ onEnrolled }: { onEnrolled?: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function setupMFA() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (error) {
        setError(error.message);
        return;
      }

      setFactorId(data.id);
      setSecret(data.totp.secret);
      setQrCodeData(data.totp.qr_code);
    }

    setupMFA();
  }, []);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      if (onEnrolled) onEnrolled();
    }
  };

  if (!qrCodeData) {
    return <div>Loading MFA setup...</div>;
  }

  return (
    <div className="space-y-4 max-w-sm mx-auto p-4 border rounded bg-white">
      <h3 className="text-lg font-bold">Enable Two-Factor Authentication</h3>
      <p className="text-sm text-gray-600">
        Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.).
      </p>

      <div className="flex justify-center my-4">
        {/* We can use the svg directly from TOTP API usually, but if it returns a uri, render image */}
         <img src={qrCodeData} alt="QR Code" className="w-48 h-48" />
      </div>
      
      {/* Fallback secret display is good practice */}
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
          className="w-full rounded border-gray-300 p-2 border"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
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

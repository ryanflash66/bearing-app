"use client";

import { useSearchParams } from "next/navigation";

export default function VerifyEmailForm() {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow text-center">
      <h2 className="text-2xl font-bold mb-4">Check your email</h2>
      <p className="text-gray-600 mb-6">
        We've sent a verification link to your email address. Please click the link to verify your
        account.
      </p>
      <div className="text-sm text-gray-500">
        <p>Did not receive the email?</p>
        <button className="text-blue-600 hover:underline mt-2">Resend verification email</button>
      </div>
    </div>
  );
}

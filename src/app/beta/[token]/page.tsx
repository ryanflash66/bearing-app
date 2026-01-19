import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import BetaReaderClient from "./BetaReaderClient";
import { checkBetaRateLimit } from "@/lib/beta-rate-limit";

interface BetaReaderPageProps {
  params: Promise<{ token: string }>;
}

export default async function BetaReaderPage({ params }: BetaReaderPageProps) {
  const { token } = await params;
  const rateLimit = checkBetaRateLimit(token);

  if (!rateLimit.allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-md rounded-2xl bg-slate-900 p-6 text-center shadow-2xl">
          <h1 className="text-2xl font-bold">Rate limit exceeded</h1>
          <p className="mt-2 text-sm text-slate-400">
            Too many requests. Please wait a minute and try again.
          </p>
        </div>
      </div>
    );
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data: tokenRows, error: tokenError } = await supabase.rpc("verify_beta_token", { token });
  const tokenInfo = Array.isArray(tokenRows) ? tokenRows[0] : null;

  if (tokenError || !tokenInfo) {
    return notFound();
  }

  const betaClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { "x-beta-token": token } },
  });

  const { data: manuscript, error } = await betaClient
    .from("manuscripts")
    .select("id, title, content_text")
    .eq("id", tokenInfo.manuscript_id)
    .single();

  if (error || !manuscript) {
    return notFound();
  }

  return (
    <BetaReaderClient
      manuscript={manuscript}
      token={token}
      permissions={tokenInfo.permissions}
    />
  );
}


import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user is support/admin
  // We can rely on RLS `Support can update tickets`, but explicit check is good for 403.
  const { data: publicUser } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!publicUser || !["admin", "support"].includes(publicUser.role)) {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json();
  const { status } = json;
  
  if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  /* 
   * FIX C2: Use RPC-First pattern
   * Replaced direct table update with update_ticket_status RPC
   * Ensures centralized permission logic and updated_at behavior
   */
  const { error } = await supabase.rpc("update_ticket_status", {
    ticket_id: id,
    new_status: status
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}


import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * Valid ticket status values (from migration 20260105000004_refine_ticket_statuses.sql)
 */
const VALID_STATUSES = ["open", "pending_user", "pending_agent", "resolved"] as const;
type TicketStatus = typeof VALID_STATUSES[number];

/**
 * PATCH /api/support/tickets/[id]/status
 * RPC-First Pattern: Uses update_ticket_status RPC.
 * 
 * Status State Flow (Story 4.2):
 * - 'open' → Initial state
 * - 'pending_user' → After agent/admin replies
 * - 'pending_agent' → After user replies (including reopening resolved)
 * - 'resolved' → Ticket closed by agent/admin OR owner
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user role (updated to match app_role enum from Story 4.1)
  const { data: publicUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_id", user.id)
    .single();

  // Parse and validate request body
  let json;
  try {
    json = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { status } = json;
  
  // Validate that status is provided
  if (!status) {
    return NextResponse.json(
      { error: "Status field is required" },
      { status: 400 }
    );
  }
  
  // Validate status against current enum values
  if (!VALID_STATUSES.includes(status as TicketStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Valid values: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Role-based permission check per AC 4.2.3 and 4.2.4
  // - super_admin / support_agent: Can update to any status
  // - user (ticket owner): Can only mark as 'resolved' (self-close)
  const isSupport = publicUser?.role === "super_admin" || publicUser?.role === "support_agent";
  
  if (!isSupport && status !== "resolved") {
    // Non-support users can only self-resolve
    return NextResponse.json(
      { error: "Only support staff can set this status" },
      { status: 403 }
    );
  }

  /* 
   * RPC-First Pattern (FIX C2 from Epic 4 Hardening)
   * The RPC handles:
   * - Ownership validation (users can only resolve their own tickets)
   * - updated_at timestamp refresh
   */
  const { error } = await supabase.rpc("update_ticket_status", {
    ticket_id: id,
    new_status: status
  });

  if (error) {
    if (error.message.includes("Access denied")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (error.message.includes("Ticket not found")) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status });
}


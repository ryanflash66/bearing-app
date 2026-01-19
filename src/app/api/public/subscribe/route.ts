import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Simple in-memory rate limiting (Note: clears on server restart)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  manuscriptId: z.string().uuid("Invalid manuscript ID"),
  _hp: z.string().optional(), // Honeypot field
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "anonymous";
    const body = await req.json();
    const result = subscribeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, manuscriptId, _hp } = result.data;

    // 1. Honeypot check
    if (_hp) {
      const emailHash = crypto
        .createHash("sha256")
        .update(email.trim().toLowerCase())
        .digest("hex");
      console.warn("Honeypot triggered", {
        ip,
        emailHash,
        userId: user?.id ?? null,
      });
      return NextResponse.json({ success: true }); // Silent fail for bots
    }

    // 2. Rate limiting
    const now = Date.now();
    const userLimit = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
      userLimit.count = 0;
      userLimit.lastReset = now;
    }

    if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    userLimit.count++;
    rateLimitMap.set(ip, userLimit);

    // 3. Insert into DB
    const { error: dbError } = await supabase
      .from("book_signups")
      .insert({
        email,
        manuscript_id: manuscriptId,
        source: "landing_page",
      });

    if (dbError) {
      // Handle unique violation (23505)
      if (dbError.code === "23505") {
        return NextResponse.json(
          { error: "You are already subscribed to this book." },
          { status: 409 }
        );
      }
      
      // Handle RLS violation (which means manuscript not public or not found)
      if (dbError.code === "42501") {
         return NextResponse.json(
          { error: "This book is not accepting subscriptions." },
          { status: 403 }
        );
      }

      console.error("Subscription DB Error:", dbError);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    // 4. Send Email
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Bearing <onboarding@resend.dev>",
          to: email,
          subject: "You're on the list!",
          html: `
            <h1>Thanks for subscribing!</h1>
            <p>You'll be the first to know when this book launches.</p>
            <p>- The Bearing Team</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // We don't fail the request if email fails, as DB insert succeeded.
      }
    } else {
      console.warn("RESEND_API_KEY not set, skipping email.");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in subscribe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

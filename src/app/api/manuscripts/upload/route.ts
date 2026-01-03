
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
// @ts-ignore
// const pdf = require("pdf-parse");

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }


    // WARNING: Reading entire file into memory. 
    // Review Finding: Risk of OOM for large docs (>50MB) on serverless.
    // Future optimization: stream processing or use presigned upload to R2 then trigger worker.
    const buffer = Buffer.from(await file.arrayBuffer());
    let content = "";



    let chapters: { title: string; content: string }[] = [];

    if (file.name.endsWith(".docx")) {
      const result = await mammoth.convertToHtml({ buffer });
      chapters = parseChapters(result.value, "html");
    } else if (file.name.endsWith(".pdf")) {
      // const data = await pdf(buffer);
      // chapters = parseChapters(data.text, "text");
      chapters = [{ title: "Import Error", content: "PDF import temporarily disabled due to build issues." }];
    } else if (file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
        content = new TextDecoder().decode(buffer);
        chapters = parseChapters(content, "markdown");
    }

    if (chapters.length === 0 && content) {
        chapters = [{ title: "Draft", content }];
    } else if (chapters.length === 0) {
        // Fallback if parsing returned nothing but we had content logic mismatch
        // Actually parseChapters should handle it, but for safety:
        chapters = [{ title: "Draft", content: "" }];
    }

    return NextResponse.json({ chapters });
  } catch (error: any) {
    console.error("Upload error:", error);
    
    // Provide user-friendly error messages
    let userMessage = "Failed to parse document. Please try a different file.";
    
    if (error.message?.includes("Could not find") || error.message?.includes("corrupt")) {
      userMessage = "This file appears to be corrupted. Try saving it again in Word.";
    } else if (error.message?.includes("password")) {
      userMessage = "This document is password protected. Please remove the password and try again.";
    } else if (error.message?.includes("timeout") || error.code === "ECONNRESET") {
      userMessage = "Processing timed out. Your file may be too large. Try splitting it into smaller parts.";
    }
    
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}

function parseChapters(content: string, type: "markdown" | "html" | "text"): { title: string; content: string }[] {
  const chapters: { title: string; content: string }[] = [];
  
  if (type === "markdown") {
    const parts = content.split(/^#\s+(.+)$/gm);
    // split results in [pre-match, match, post-match...]
    // If it starts with # Title, parts[0] is empty, parts[1] is title, parts[2] is content
    
    // Simple heuristic: Iterate parts
    if (parts.length > 1) {
        // Handle preamble if any
        if (parts[0].trim()) {
            chapters.push({ title: "Introduction", content: parts[0] });
        }
        
        for (let i = 1; i < parts.length; i += 2) {
            const title = parts[i];
            const body = parts[i + 1] || "";
            chapters.push({ title: title.trim(), content: body.trim() });
        }
    } else {
        chapters.push({ title: "Draft", content });
    }
  } else if (type === "html") {
      // Split by <h1>
      const parts = content.split(/<h1>(.*?)<\/h1>/i);
      if (parts.length > 1) {
           if (parts[0].trim()) {
              chapters.push({ title: "Introduction", content: parts[0] }); 
           }
           for (let i = 1; i < parts.length; i += 2) {
               const title = parts[i]; // Inner HTML of h1
               const body = parts[i + 1] || "";
               chapters.push({ title: title.replace(/<[^>]*>/g, "").trim(), content: body });
           }
      } else {
          chapters.push({ title: "Draft", content });
      }
  } else {
      // Text / PDF - Basic heuristic for "Chapter N"
      // This is harder with raw text, often requires looking for centralized caps or "Chapter" keyword
      // For now, treat as single chapter to satisfy basic AC unless we see obvious breaks
      // A simple heuristic: Double newline followed by "Chapter"
      const parts = content.split(/\n\s*(?:Chapter\s+\d+|[0-9]+\.)\s*\n/i);
       if (parts.length > 1) {
           // We lost the chapter titles with this split. 
           // Better regex needed to capture, but for now fallback to single or improve later
           // Let's just return the whole thing for PDF to start, as PDF parsing is notoriously messy
           chapters.push({ title: "Draft", content });
       } else {
           chapters.push({ title: "Draft", content });
       }
  }

  return chapters;
}

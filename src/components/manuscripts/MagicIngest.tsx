"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { createManuscript, updateManuscript } from "@/lib/manuscripts";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

interface MagicIngestProps {
  accountId: string;
  user: User; // We need user ID for owner
  onUploadComplete?: () => void;
}

interface ParsedChapter {
  title: string;
  content: string;
}


export default function MagicIngest({ accountId, user, onUploadComplete }: MagicIngestProps) {

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalFilenameRef = useRef<string>("Imported Document");
  const lastFileRef = useRef<File | null>(null); // For retry functionality
  
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "parsing" | "review" | "ingesting" | "success" | "error">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // State for fallback UI
  const [parsedChapters, setParsedChapters] = useState<ParsedChapter[]>([]);
  const [manualContent, setManualContent] = useState("");
  const [showManualEditor, setShowManualEditor] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };


  const ingestChapters = async (chaptersToIngest: ParsedChapter[], originalFilename: string) => {
      // 2. Simulate "Binder Population" (Typewriter effect)
      setStatus("ingesting");
      
      const fullContent = chaptersToIngest
        .map((c) => `# ${c.title}\n\n${c.content}`)
        .join("\n\n");

      // Cap total animation time to 3 seconds or 400ms per chapter, whichever is faster
      // This ensures 50+ chapters don't violate P95 latency (Review Finding #1)
      const totalAnimationTime = 3000; 
      const delayPerChapter = Math.min(400, totalAnimationTime / Math.max(1, chaptersToIngest.length));

      // Animate logs
      for (const chapter of chaptersToIngest) {
        await new Promise((r) => setTimeout(r, delayPerChapter)); 
        addLog(`Ingesting: ${chapter.title}`);
      }

      await new Promise((r) => setTimeout(r, 200));
      addLog("Finalizing manuscript...");

      // 3. Resolve Profile ID & Create Manuscript
      const supabase = createClient();
      
      // We must use the public profile ID, not the auth ID, for the foreign key and RLS
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();
        
      if (profileError || !profile) {
        throw new Error("User profile not found. Please try logging in again.");
      }

      const { manuscript, error: createError } = await createManuscript(supabase, {
        account_id: accountId,
        owner_user_id: profile.id,
        title: originalFilename.replace(/\.[^/.]+$/, ""), // Remove extension
      });

      if (createError || !manuscript) {
        throw new Error(createError || "Failed to create manuscript record");
      }

      // 4. Update with content
      const { error: updateError } = await updateManuscript(supabase, manuscript.id, {
        content_text: fullContent,
      });

      if (updateError) {
        throw new Error(updateError);
      }

      const wordCount = fullContent.split(/\s+/).length;
      const successMsg = `Extracted ${chaptersToIngest.length} chapters, ${wordCount} words`;
      addLog(successMsg); // Fulfills "Toast" content requirement in log view
      setStatus("success");
      
      // 5. Finish
      if (onUploadComplete) {
        onUploadComplete();
      } else {
        // Delay slightly so user sees success state/toast message
        setTimeout(() => {
            router.refresh();
            router.push(`/dashboard/manuscripts/${manuscript.id}`);
        }, 1500);
      }
  };


  const handleFile = async (file: File) => {
    setStatus("parsing");
    setLogs([]);
    setErrorMsg(null);
    setShowManualEditor(false);
    originalFilenameRef.current = file.name;
    lastFileRef.current = file; // Store for retry
    addLog(`Uploading ${file.name}...`);

    try {
      // 1. Upload to parse endpoint
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/manuscripts/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to parse document. Please try a different file format.");
      }

      const data = (await res.json()) as { chapters: ParsedChapter[] };
      const chapters = data.chapters;
      
      addLog(`Parsed ${chapters.length} chapters.`);
      
      if (chapters.length <= 1) {
          // Fallback UI trigger
          setParsedChapters(chapters);
          // Combine content for manual editing if needed
          setManualContent(chapters.map(c => c.content).join("\n\n"));
          setStatus("review");
          return;
      }

      await ingestChapters(chapters, file.name);

    } catch (err: any) {
      // Handled error - silence console noise for expected failures
      // console.error(err); 
      setStatus("error");
      setErrorMsg(err.message || "Unknown error occurred");
    }
  };

  const handleManualBreak = () => {
      setShowManualEditor(true);
  };

  const handleProcessManual = () => {
      // Split by "---" or "***" as manual breaks
      // Simple heuristic: 
      const parts = manualContent.split(/\n\s*(?:---|___|\*\*\*)\s*\n/);
      
      const newChapters: ParsedChapter[] = parts.map((part, index) => {
          // Try to extract title from first line if it looks like a heading
          const lines = part.trim().split("\n");
          let title = `Chapter ${index + 1}`;
          let content = part.trim();
          
          if (lines.length > 0 && lines[0].startsWith("#")) {
              title = lines[0].replace(/^#+\s*/, "").trim();
              content = lines.slice(1).join("\n").trim();
          }
          
          return { title, content };
      });
      
      // Proceed to ingest
      ingestChapters(newChapters, originalFilenameRef.current).catch(err => {
          setStatus("error");
          setErrorMsg(err.message);
      });
  };
  
  const handleAcceptSingle = () => {
      ingestChapters(parsedChapters, originalFilenameRef.current).catch(err => {
          setStatus("error");
          setErrorMsg(err.message);
      });
  };

  return (
    <div className="w-full">
        {status === "review" ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
                 {!showManualEditor ? (
                     <div className="text-center">
                         <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                             <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                             </svg>
                         </div>
                         <h3 className="mt-2 text-sm font-medium text-gray-900">We couldn't detect chapters</h3>
                         <p className="mt-1 text-sm text-gray-500">Would you like to add chapter breaks manually?</p>
                         <div className="mt-4 flex justify-center gap-3">
                             <button 
                                onClick={handleAcceptSingle}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 bg-white"
                             >
                                 No, Import Single Chapter
                             </button>
                             <button
                                onClick={handleManualBreak}
                                className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 bg-indigo-600"
                             >
                                 Yes, Add Breaks
                             </button>
                         </div>
                     </div>
                 ) : (
                     <div className="flex flex-col gap-4">
                         <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-900">Add Chapter Breaks</h3>
                            <p className="text-xs text-gray-500">Insert <code>---</code> to create a new chapter.</p>
                         </div>
                         <textarea 
                            value={manualContent}
                            onChange={(e) => setManualContent(e.target.value)}
                            className="w-full h-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono p-2 border"
                         />
                         <div className="flex justify-end gap-3">
                             <button 
                                onClick={() => setShowManualEditor(false)}
                                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                             >
                                 Cancel
                             </button>
                             <button 
                                onClick={handleProcessManual}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                             >
                                 Process & Import
                             </button>
                         </div>
                     </div>
                 )}
            </div>
         ) : status === "error" ? (
             <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                 <div className="text-center">
                     <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                         <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                         </svg>
                     </div>
                     <h3 className="mt-2 text-sm font-medium text-gray-900">Import Failed</h3>
                     <p className="mt-1 text-sm text-red-600">{errorMsg}</p>
                     <p className="mt-2 text-xs text-gray-500">Large files may timeout. Try a smaller file or different format.</p>
                     <div className="mt-4 flex justify-center gap-3">
                         {lastFileRef.current && (
                             <button
                                 onClick={() => lastFileRef.current && handleFile(lastFileRef.current)}
                                 className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                             >
                                 Retry Import
                             </button>
                         )}
                         <button
                             onClick={() => { setStatus("idle"); setErrorMsg(null); }}
                             className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                         >
                             Try Different File
                         </button>
                     </div>
                 </div>
             </div>
         ) : status === "idle" ? (
             <div
             className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
               isDragging
                 ? "border-blue-500 bg-blue-50"
                 : "border-slate-300 bg-slate-50 hover:bg-slate-100"
             }`}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
           >
             <input
               type="file"
               accept=".docx,.pdf,.md,.markdown"
               className="absolute inset-0 cursor-pointer opacity-0"
               onChange={handleFileSelect}
               ref={fileInputRef}
               aria-label="Drop DOCX" 
             />
             <div className="text-center">
               <svg
                 className="mx-auto h-10 w-10 text-slate-400"
                 fill="none"
                 stroke="currentColor"
                 viewBox="0 0 24 24"
               >
                 <path
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   strokeWidth={1.5}
                   d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                 />
               </svg>
               <p className="mt-2 text-sm font-medium text-slate-900">
                 Magic Ingest
               </p>
               <p className="text-xs text-slate-500">
                 Drop DOCX, PDF, or MD to import
               </p>
             </div>
           </div>
        ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    {status === "success" ? (
                         <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                         </div>
                    ) : (
                        <div className="relative h-10 w-10">
                            <svg className="h-full w-full animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    )}
                     <div className="flex-1">
                         <div className="flex items-center justify-between">
                             <h3 className="text-sm font-medium text-slate-900">
                                 {status === "success" ? "Import Complete" : "Importing Manuscript..."}
                             </h3>
                             {status === "success" && (
                                 <button
                                     onClick={() => { setStatus("idle"); setLogs([]); }}
                                     className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                     aria-label="Import another file"
                                 >
                                     Import Another
                                 </button>
                             )}
                         </div>
                         {/* Terminal / Typewriter Log (Parchment Style) */}
                         <div className="mt-2 h-32 overflow-y-auto rounded-md bg-stone-50 border border-stone-200 p-2 font-mono text-xs text-stone-700 shadow-inner">
                              {logs.map((log, i) => (
                                  <div key={i} className="flex gap-2">
                                    <span className="text-stone-400 select-none">›</span>
                                    <span>{log}</span>
                                  </div>
                              ))}
                              {status !== "success" && (
                                 <div className="animate-pulse text-stone-400 ml-3">_</div>
                              )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}


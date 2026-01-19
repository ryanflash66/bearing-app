"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PublicBook } from "@/lib/public-book";
import { PublicAuthorProfile } from "@/lib/public-profile";

interface BookLandingPageProps {
  book: PublicBook;
  author: PublicAuthorProfile;
}

export default function BookLandingPage({ book, author }: BookLandingPageProps) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side honeypot check
    if (honeypot) {
      setStatus("success"); // Fake success for bots
      return;
    }

    setStatus("loading");
    setMessage("");
    
    try {
      const res = await fetch("/api/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, manuscriptId: book.id, _hp: honeypot }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      setMessage("You're on the list!");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to subscribe");
    }
  };

  const accentColor = book.theme_config?.accent_color || "#78716c";
  const isDark = book.theme_config?.theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? 'bg-stone-950 text-stone-50' : 'bg-stone-50 text-stone-900'} font-sans`}>
      {/* Hero Section */}
      <section className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'} border-b`}>
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className={`text-4xl md:text-6xl font-serif font-bold tracking-tight ${isDark ? 'text-white' : 'text-stone-900'}`}>
              {book.title}
            </h1>
            {book.subtitle && (
              <p className={`text-xl md:text-2xl ${isDark ? 'text-stone-300' : 'text-stone-600'} font-light`}>
                {book.subtitle}
              </p>
            )}
            
            <div className="pt-6">
               <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="email" className="sr-only">Email address</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={`px-4 py-3 rounded-md border ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-white border-stone-300'} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                      style={{ '--tw-ring-color': accentColor } as any}
                    />
                    {/* Honeypot field - hidden from users */}
                    <input
                      type="text"
                      name="_hp"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === "loading" || status === "success"}
                    className="w-full px-6 py-3 rounded-md font-medium transition-colors disabled:opacity-50 text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {status === "loading" ? "Joining..." : status === "success" ? "Joined!" : "Notify Me"}
                  </button>
                  {message && (
                    <p className={`text-sm ${status === "error" ? "text-red-500" : "text-green-500"}`}>
                      {message}
                    </p>
                  )}
               </form>
               <p className={`text-xs ${isDark ? 'text-stone-500' : 'text-stone-500'} mt-2`}>
                 Join the waitlist to get notified when this book launches.
               </p>
            </div>
          </div>

          <div className={`relative aspect-[2/3] w-full max-w-sm mx-auto shadow-2xl rounded-sm overflow-hidden ${isDark ? 'bg-stone-800' : 'bg-stone-200'}`}>
             {book.cover_image_url ? (
               <Image 
                 src={book.cover_image_url} 
                 alt={`${book.title} Cover`}
                 fill
                 className="object-cover"
                 priority
               />
             ) : (
               <div className={`flex items-center justify-center h-full ${isDark ? 'text-stone-600' : 'text-stone-400'}`}>
                 No Cover Image
               </div>
             )}
          </div>
        </div>
      </section>

      {/* Synopsis Section */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-serif font-bold mb-6">About the Book</h2>
        <div className={`prose ${isDark ? 'prose-invert prose-stone' : 'prose-stone'} prose-lg`}>
          <p className={`whitespace-pre-wrap leading-relaxed ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
            {book.synopsis || "No synopsis available yet."}
          </p>
        </div>
      </section>

      {/* Author Section */}
      <section className={`${isDark ? 'bg-stone-900 border-stone-800' : 'bg-stone-100 border-stone-200'} border-t py-16`}>
        <div className="max-w-3xl mx-auto px-4 text-center">
           <div className={`relative w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden shadow-md ${isDark ? 'bg-stone-800' : 'bg-white'}`}>
             {author.avatar_url ? (
               <Image
                 src={author.avatar_url}
                 alt={author.display_name || "Author"}
                 fill
                 className="object-cover"
               />
             ) : (
               <div className={`flex items-center justify-center h-full ${isDark ? 'bg-stone-800 text-stone-600' : 'bg-stone-300 text-stone-500'} text-2xl font-bold`}>
                 {(author.display_name || author.pen_name || "A").charAt(0).toUpperCase()}
               </div>
             )}
           </div>
           <h3 className="text-xl font-bold mb-2">{author.display_name || author.pen_name}</h3>
           <p className={`${isDark ? 'text-stone-400' : 'text-stone-600'} max-w-xl mx-auto`}>
             {author.bio || "Author"}
           </p>
        </div>
      </section>
    </div>
  );
}

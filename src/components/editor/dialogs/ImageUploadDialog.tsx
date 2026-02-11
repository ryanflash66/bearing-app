"use client";

import React, { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Upload, Wand2, Loader2, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string, alt: string, width?: number, height?: number) => void;
  manuscriptId: string;
  editorContext?: string; // Current paragraph/selection context from editor
}

export function ImageUploadDialog({ open, onOpenChange, onInsert, manuscriptId, editorContext }: ImageUploadDialogProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [altText, setAltText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [useContext, setUseContext] = useState(false); // AC 8.8.3: Generate from Context option
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Upload Logic ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!altText.trim()) {
        alert("Please enter alt text before uploading.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setIsUploading(true);
    try {
      // 1. Client-side Validation & Compression
      if (file.size > 20 * 1024 * 1024) { // Pre-check rough limit
          throw new Error("File too large. Max 5MB.");
      }

      const options = {
        maxSizeMB: 5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      let compressedFile = file;
      try {
        compressedFile = await imageCompression(file, options);
      } catch (err) {
        console.warn("Compression failed, trying original", err);
      }

      // 2. Get Dimensions
      const dimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = reject;
          img.src = URL.createObjectURL(compressedFile);
      });

      // 3. Upload
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('width', dimensions.width.toString());
      formData.append('height', dimensions.height.toString());
      formData.append('alt_text', altText);

      const res = await fetch(`/api/manuscripts/${manuscriptId}/attachments/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      // Use Proxy URL
      const proxyUrl = `/api/manuscripts/${manuscriptId}/images/${data.id}`;
      onInsert(proxyUrl, altText, dimensions.width, dimensions.height);
      onOpenChange(false);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- AI Generation Logic ---
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!altText.trim()) {
        // Auto-generate alt text from prompt if missing?
        // Story says: "Truncation: If prompt > 125 chars..." implies we use prompt as alt text often.
        // But UI should probably enforce it.
        // Let's enforce the dedicated Alt Text field for accessibility compliance.
        alert("Please enter alt text (describe the image).");
        return;
    }

    setIsUploading(true);
    try {
      // AC 8.8.3: Combine context with prompt if "Generate from Context" is checked
      let finalPrompt = prompt;
      if (useContext && editorContext) {
        // Sanitize context by stripping HTML (striptags is server-side, so we do basic client-side strip)
        const cleanContext = editorContext.replace(/<[^>]*>/g, '').trim();
        if (cleanContext) {
          finalPrompt = `Based on this context: "${cleanContext.slice(0, 500)}"\n\nGenerate an image of: ${prompt}`;
        }
      }

      const res = await fetch(`/api/manuscripts/${manuscriptId}/attachments/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: finalPrompt }),
      });

      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();
      const proxyUrl = `/api/manuscripts/${manuscriptId}/images/${data.id}`;
      // AI images are 1024x1024 (SDXL default usually)
      onInsert(proxyUrl, altText, 1024, 1024);
      onOpenChange(false);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Auto-fill alt text from truncated prompt if empty
  // AC 8.8.4: If prompt > 125 chars: take first 120 chars, back up to last space, append "..."
  // Hard truncate at 125 if no space found.
  const handlePromptBlur = () => {
      if (!altText && prompt) {
          let truncated = prompt;
          if (prompt.length > 125) {
            truncated = prompt.slice(0, 120);
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > 0) {
              truncated = truncated.slice(0, lastSpace) + "...";
            } else {
              // Hard truncate at 125 if no space found
              truncated = prompt.slice(0, 122) + "...";
            }
          }
          setAltText(truncated);
      }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 w-full max-w-md bg-white rounded-lg shadow-xl p-6 focus:outline-none">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-serif font-bold">Insert Image</Dialog.Title>
            <Dialog.Close className="text-stone-500 hover:text-stone-800">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="mb-4">
            <label htmlFor="alt-text-input" className="block text-sm font-medium text-stone-700 mb-1">
              Alt Text (Required for Accessibility)
            </label>
            <input
              id="alt-text-input"
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image..."
              className="w-full border-stone-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm"
            />
          </div>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex border-b border-stone-200 mb-4">
              <Tabs.Trigger
                value="upload"
                className={`flex-1 pb-2 text-sm font-medium text-center border-b-2 ${
                  activeTab === 'upload'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </Tabs.Trigger>
              <Tabs.Trigger
                value="ai"
                className={`flex-1 pb-2 text-sm font-medium text-center border-b-2 ${
                  activeTab === 'ai'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Wand2 className="w-4 h-4 inline mr-2" />
                Generate with AI
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="upload" className="space-y-4">
              <div 
                className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center hover:bg-stone-50 transition-colors cursor-pointer"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center text-stone-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-stone-500">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-sm">Click to select an image (max 5MB)</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading || !altText}
                />
              </div>
              {!altText && <p className="text-xs text-amber-600 text-center">Enter alt text to enable upload.</p>}
            </Tabs.Content>

            <Tabs.Content value="ai" className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onBlur={handlePromptBlur}
                  placeholder="A medieval castle on a hill, oil painting style..."
                  rows={3}
                  className="w-full border-stone-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>

              {/* AC 8.8.3: Generate from Context option */}
              {editorContext && (
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useContext}
                    onChange={(e) => setUseContext(e.target.checked)}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Generate from manuscript context</span>
                  <span className="text-xs text-stone-400">(uses surrounding text)</span>
                </label>
              )}
              
              <button
                onClick={handleGenerate}
                disabled={isUploading || !prompt || !altText}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </button>
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import DOMPurify from "dompurify";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useExport } from "./ExportContext";
import { PageSize } from "@/lib/export-types";

interface ExportPreviewProps {
  content: string; // HTML content
}

export default function ExportPreview({ content }: ExportPreviewProps) {
  const { settings } = useExport();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [overflowWarnings, setOverflowWarnings] = useState<string[]>([]);
  const safeContent = useMemo(() => DOMPurify.sanitize(content), [content]);

  // Re-render Paged.js when content or critical settings change
  useEffect(() => {
    // Only run Paged.js if in PDF mode
    if (settings.viewMode !== "pdf") return;
    if (!previewRef.current || !safeContent) return;

    let isMounted = true;

    const renderPreview = async () => {
      setIsRendering(true);
      setOverflowWarnings([]);
      // clear previous
      if (previewRef.current) {
        previewRef.current.innerHTML = "";
      }

      try {
        // Dynamic import to avoid SSR issues
        const { Previewer } = await import("pagedjs");
        
        if (!isMounted) return;

        const paged = new Previewer();
        
        // Inject CSS variables for settings
        const style = document.createElement("style");
        const pageWidth = getPageWidth(settings.pageSize);
        const pageHeight = getPageHeight(settings.pageSize);

        style.textContent = `
          :root {
            --pagedjs-font-size: ${settings.fontSize}pt;
            --pagedjs-line-height: ${settings.lineHeight};
            --pagedjs-font-family: ${settings.fontFace === "serif" ? "Merriweather, serif" : "Inter, sans-serif"};
            --pagedjs-width: ${pageWidth};
            --pagedjs-height: ${pageHeight};
          }
          @page {
            size: var(--pagedjs-width) var(--pagedjs-height);
            margin: 0.75in;
          }
          .pagedjs_page {
              background: white;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              margin-bottom: 2rem;
          }
          img, table {
              max-width: 100%;
              height: auto;
          }
        `;
        
        const sourceContainer = document.createElement("div");
        sourceContainer.innerHTML = safeContent;
        sourceContainer.appendChild(style);

        // We need to wait for PagedJS
        await paged.preview(sourceContainer.innerHTML, ["/print.css"], previewRef.current);
        
        // AC 3.3: Warning if images or tables exceed page margins
        if (isMounted && previewRef.current) {
            const warnings: string[] = [];
            const pageContentArea = previewRef.current.querySelectorAll(".pagedjs_page_content");
            
            pageContentArea.forEach((page, index) => {
                const elements = page.querySelectorAll("img, table");
                const pageWidthPx = page.clientWidth;
                
                elements.forEach(el => {
                    if (el.clientWidth > pageWidthPx) {
                        const type = el.tagName.toLowerCase();
                        warnings.push(`Page ${index + 1}: ${type.charAt(0).toUpperCase() + type.slice(1)} exceeds page width.`);
                    }
                });
            });
            setOverflowWarnings(warnings);
        }
        
      } catch (e) {
        console.error("PagedJS render error", e);
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    // Debounce rendering
    const timer = setTimeout(renderPreview, 500);
    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, [safeContent, settings]);

  if (settings.viewMode === "epub") {
      return (
         <div className="flex justify-center p-8 bg-slate-200 h-full overflow-auto">
             <div 
                className="bg-white h-[800px] w-[375px] overflow-y-auto border-[12px] border-slate-800 rounded-[3rem] shadow-xl relative"
             >
                {/* iPhone Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-6 w-32 bg-slate-800 rounded-b-xl z-10"></div>
                
                <div 
                    className="p-6 pt-12 h-full overflow-y-auto"
                    style={{
                        fontFamily: settings.fontFace === 'serif' ? 'Merriweather, serif' : 'Inter, sans-serif',
                        fontSize: `${settings.fontSize}pt`,
                        lineHeight: settings.lineHeight
                    }}
                >
                    <div dangerouslySetInnerHTML={{ __html: safeContent }} />
                </div>
             </div>
         </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 relative">
      {/* Overflow Warnings Overlay */}
      {overflowWarnings.length > 0 && (
          <div className="absolute top-4 right-4 z-20 max-w-xs animate-slide-in">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 shadow-lg rounded-r-lg">
                  <div className="flex items-start">
                      <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                      </div>
                      <div className="ml-3">
                          <p className="text-sm text-amber-700 font-medium">Layout Warning</p>
                          <div className="mt-1 text-xs text-amber-600 space-y-1">
                              {overflowWarnings.map((w, i) => <div key={i}>{w}</div>)}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
        <div 
            ref={previewRef} 
            data-testid="export-preview-container"
            className={`transition-opacity duration-200 ${isRendering ? "opacity-50" : "opacity-100"}`}
        />
      </div>
    </div>
  );
}

function getPageWidth(size: PageSize): string {
    switch(size) {
        case "6x9": return "6in";
        case "5x8": return "5in";
        case "a4": return "210mm";
        case "a5": return "148mm";
        default: return "6in";
    }
}

function getPageHeight(size: PageSize): string {
    switch(size) {
        case "6x9": return "9in";
        case "5x8": return "8in";
        case "a4": return "297mm";
        case "a5": return "210mm";
        default: return "9in";
    }
}

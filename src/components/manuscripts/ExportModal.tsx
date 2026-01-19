"use client";

import { useState } from "react";
import { ExportProvider, useExport } from "../export/ExportContext";
import ExportPreview from "../export/ExportPreview";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscriptId: string;
  title: string;
  content: string; // HTML
}

function ExportModalContent({ manuscriptId, title, content, onClose }: ExportModalProps) {
    const { settings, updateSettings, toggleLivePreview } = useExport();
    const [isExporting, setIsExporting] = useState(false);

    const handleDownload = async (format: 'pdf' | 'docx') => {
        setIsExporting(true);
        // Build URL with params
        const query = new URLSearchParams({
            fontSize: settings.fontSize.toString(),
            lineHeight: settings.lineHeight.toString(),
            pageSize: settings.pageSize,
            fontFace: settings.fontFace
        });
        
        try {
             const url = `/api/manuscripts/${manuscriptId}/export/${format}?${query.toString()}`;
             
             const response = await fetch(url);
             if (!response.ok) throw new Error("Export failed");
             
             // Get filename from header
             const contentDisposition = response.headers.get("Content-Disposition");
             let filename = `${title}.${format}`;
             if (contentDisposition) {
                 const match = contentDisposition.match(/filename="(.+)"/);
                 if (match) filename = match[1];
             }
             
             const blob = await response.blob();
             const downloadUrl = window.URL.createObjectURL(blob);
             const link = document.createElement("a");
             link.href = downloadUrl;
             link.download = filename;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             window.URL.revokeObjectURL(downloadUrl);
             
        } catch(e) {
            console.error("Download failed", e);
            alert("Failed to download file");
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4">
             <div className="w-full h-full md:w-[95vw] md:h-[90vh] max-w-6xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 md:px-6 py-3 md:py-4">
                    <h2 className="text-lg md:text-xl font-bold text-slate-900">Export Manuscript</h2>
                    <button 
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Responsive layout: stack on mobile, side-by-side on desktop */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Sidebar Controls - full width on mobile */}
                    <div className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-slate-50 p-4 md:p-6 flex flex-col gap-4 md:gap-6 overflow-y-auto max-h-[40vh] md:max-h-none">
                        {/* Settings */}
                        <div className="space-y-4">
                           <h3 className="font-semibold text-slate-900">Formatting</h3>
                           
                           {/* Font Face */}
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Font</label>
                               <select 
                                  value={settings.fontFace}
                                  onChange={e => updateSettings({ fontFace: e.target.value as any })}
                                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                               >
                                  <option value="serif">Serif (Merriweather)</option>
                                  <option value="sans">Sans (Inter)</option>
                               </select>
                           </div>

                           {/* Font Size */}
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Font Size: {settings.fontSize}pt</label>
                               <input 
                                  type="range" min="8" max="18" step="0.5"
                                  value={settings.fontSize}
                                  onChange={e => updateSettings({ fontSize: parseFloat(e.target.value) })}
                                  className="w-full accent-indigo-600"
                               />
                           </div>

                           {/* Line Height */}
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Line Height: {settings.lineHeight}</label>
                               <input 
                                  type="range" min="1" max="2.5" step="0.1"
                                  value={settings.lineHeight}
                                  onChange={e => updateSettings({ lineHeight: parseFloat(e.target.value) })}
                                  className="w-full accent-indigo-600"
                               />
                           </div>

                           {/* Page Size */}
                            <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Page Size</label>
                               <select 
                                  value={settings.pageSize}
                                  onChange={e => updateSettings({ pageSize: e.target.value as any })}
                                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                               >
                                  <option value="6x9">6" x 9" (Trade)</option>
                                  <option value="5x8">5" x 8"</option>
                                  <option value="a4">A4</option>
                                  <option value="a5">A5</option>
                               </select>
                           </div>
                        </div>

                        <hr className="border-slate-200" />

                        {/* Live Preview Toggle */}
                        <div className="flex items-center justify-between">
                            <label className="font-medium text-slate-900 cursor-pointer" onClick={toggleLivePreview}>Live Preview</label>
                            <button 
                                onClick={toggleLivePreview}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.isLivePreview ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isLivePreview ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* View Mode Toggle (PDF vs ePub) */}
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                            <button
                                onClick={() => updateSettings({ viewMode: 'pdf' })}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${settings.viewMode === 'pdf' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                PDF View
                            </button>
                            <button
                                onClick={() => updateSettings({ viewMode: 'epub' })}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${settings.viewMode === 'epub' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                ePub View
                            </button>
                        </div>

                        <div className="md:mt-auto space-y-3 pt-4 md:pt-6">
                            <div className="flex gap-2 md:flex-col md:gap-3">
                              <button
                                  onClick={() => handleDownload('pdf')}
                                  disabled={isExporting}
                                  className="flex-1 md:flex-none md:w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors min-h-[44px]"
                              >
                                  {isExporting ? (
                                      <>
                                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                          <span className="hidden sm:inline">Generating...</span>
                                          <span className="sm:hidden">...</span>
                                      </>
                                  ) : 'PDF'}
                              </button>
                               <button
                                  onClick={() => handleDownload('docx')}
                                  disabled={isExporting}
                                  className="flex-1 md:flex-none md:w-full flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors min-h-[44px]"
                              >
                                  DOCX
                              </button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Area - grows to fill remaining space */}
                    <div className="flex-1 bg-slate-100 overflow-hidden relative min-h-[30vh] md:min-h-0">
                        {settings.isLivePreview ? (
                            <ExportPreview content={content} />
                        ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-slate-400 p-4">
                                <div className="text-center">
                                    <svg className="mx-auto h-12 w-12 md:h-16 md:w-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <p className="text-lg md:text-xl font-medium text-slate-600">Preview Paused</p>
                                    <p className="text-xs md:text-sm mt-2">Enable Live Preview to see changes</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             </div>
        </div>
    )
}

export default function ExportModal(props: ExportModalProps) {
    if (!props.isOpen) return null;
    return (
        <ExportProvider>
            <ExportModalContent {...props} />
        </ExportProvider>
    )
}

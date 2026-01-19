"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

import { ExportSettings, defaultExportSettings, FontFace, PageSize } from "@/lib/export-types";

import { useCallback } from "react";



interface ExportContextType {

  settings: ExportSettings & { isLivePreview: boolean; viewMode: "pdf" | "epub" };

  updateSettings: (updates: Partial<ExportSettings & { isLivePreview: boolean; viewMode: "pdf" | "epub" }>) => void;

  toggleLivePreview: () => void;

}



const ExportContext = createContext<ExportContextType | undefined>(undefined);



export function ExportProvider({ children }: { children: ReactNode }) {

  const [settings, setSettings] = useState<ExportSettings & { isLivePreview: boolean; viewMode: "pdf" | "epub" }> ({

    ...defaultExportSettings,

    isLivePreview: false,

    viewMode: "pdf",

  });



  const updateSettings = useCallback((updates: Partial<ExportSettings & { isLivePreview: boolean; viewMode: "pdf" | "epub" }>) => {

    setSettings((prev) => ({ ...prev, ...updates }));

  }, []);



  const toggleLivePreview = useCallback(() => {

    setSettings((prev) => ({ ...prev, isLivePreview: !prev.isLivePreview }));

  }, []);



  return (

    <ExportContext.Provider value={{ settings, updateSettings, toggleLivePreview }}>

      {children}

    </ExportContext.Provider>

  );

}

export function useExport() {
  const context = useContext(ExportContext);
  if (context === undefined) {
    throw new Error("useExport must be used within an ExportProvider");
  }
  return context;
}

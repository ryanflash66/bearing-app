"use client";

import { useCallback } from "react";
import React, { createContext, useContext, useState, type ReactNode } from "react";

import { ExportSettings, defaultExportSettings } from "@/lib/export-types";

type ExportContextSettings = ExportSettings & {
  isLivePreview: boolean;
  viewMode: "pdf" | "epub";
};

interface ExportContextType {
  settings: ExportContextSettings;
  updateSettings: (updates: Partial<ExportContextSettings>) => void;
  toggleLivePreview: () => void;
}

const ExportContext = createContext<ExportContextType | undefined>(undefined);

export function ExportProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ExportContextSettings>({
    ...defaultExportSettings,
    isLivePreview: false,
    viewMode: "pdf",
  });

  const updateSettings = useCallback((updates: Partial<ExportContextSettings>) => {
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

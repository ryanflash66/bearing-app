export type FontFace = "serif" | "sans";
export type PageSize = "6x9" | "5x8" | "a4" | "a5";

export interface ExportSettings {
  fontFace: FontFace;
  fontSize: number; // pt
  lineHeight: number; // unitless multiplier
  pageSize: PageSize;
}

export const defaultExportSettings: ExportSettings = {
  fontFace: "serif",
  fontSize: 11,
  lineHeight: 1.5,
  pageSize: "6x9",
};

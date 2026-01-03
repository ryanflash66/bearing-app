import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { Manuscript, getManuscript } from "./manuscripts";
import { ManuscriptVersion, getVersion } from "./manuscriptVersions";
import { SupabaseClient } from "@supabase/supabase-js";
import { ConsistencyReport } from "./gemini";
import { tiptapToDocx } from "./tiptap-convert";

/**
 * Generate PDF buffer from Consistency Report
 * AC 3.2.5: A downloadable file is generated with the report contents
 */
export async function generateConsistencyReportPDF(
  report: ConsistencyReport
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72,
        },
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", (error) => {
        reject(error);
      });

      // Title
      doc.fontSize(20).font("Helvetica-Bold").text("Consistency Report", {
        align: "center",
      });
      doc.moveDown();

      // Summary
      if (report.summary) {
        doc.fontSize(12).font("Helvetica-Bold").text("Summary:", {
          underline: true,
        });
        doc.fontSize(12).font("Helvetica").text(report.summary);
        doc.moveDown();
      }

      // Stats
      const issues = report.issues;
      const stats = {
        character: issues.filter((i) => i.type === "character").length,
        plot: issues.filter((i) => i.type === "plot").length,
        timeline: issues.filter((i) => i.type === "timeline").length,
        tone: issues.filter((i) => i.type === "tone").length,
      };

      doc.fontSize(12).font("Helvetica-Oblique").text(
        `Found ${issues.length} issues: ${stats.character} Character, ${stats.plot} Plot, ${stats.timeline} Timeline, ${stats.tone} Tone`
      );
      doc.moveDown();
      doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
      doc.moveDown();

      // Issues by type
      const types = ["character", "plot", "timeline", "tone"] as const;

      types.forEach((type) => {
        const typeIssues = issues.filter((i) => i.type === type);
        if (typeIssues.length > 0) {
          doc
            .fontSize(16)
            .font("Helvetica-Bold")
            .text(type.charAt(0).toUpperCase() + type.slice(1) + " Issues");
          doc.moveDown(0.5);

          typeIssues.forEach((issue, index) => {
            // Severity badge-like text
            const severityColor =
              issue.severity === "high"
                ? "red"
                : issue.severity === "medium"
                ? "orange"
                : "blue";
            
            doc.fillColor(severityColor);
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .text(`[${issue.severity.toUpperCase()}]`, { continued: true });
            
            doc.fillColor("black");
            doc
              .fontSize(12)
              .font("Helvetica-Bold")
              .text(` Issue #${index + 1}`);

            doc.moveDown(0.5);

            // Explanation
            doc.fontSize(12).font("Helvetica").text(issue.explanation);
            doc.moveDown(0.5);

            // Quote
            doc
              .fontSize(10)
              .font("Helvetica-Oblique")
              .text(`"${issue.location.quote}"`, {
                indent: 20,
              });
            
            if (issue.location.chapter) {
              doc.fontSize(10).text(`(Chapter ${issue.location.chapter})`, {
                indent: 20,
              });
            }
            doc.moveDown(0.5);

            // Suggestion
            if (issue.suggestion) {
              doc.fillColor("green");
              doc.fontSize(10).font("Helvetica-Bold").text("Suggestion:", {
                indent: 20,
              });
              doc.fontSize(10).font("Helvetica").text(issue.suggestion, {
                indent: 20,
              });
              doc.fillColor("black");
            }

            doc.moveDown();
          });
          doc.moveDown();
        }
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export interface ExportOptions {
  format: "pdf" | "docx";
  versionId?: number; // Optional version number to export
}

/**
 * Get manuscript content for export (either current or specific version)
 */
export async function getManuscriptForExport(
  supabase: SupabaseClient,
  manuscriptId: string,
  versionId?: number
): Promise<{ title: string; content: string; content_json: any; error: string | null }> {
  try {
    if (versionId !== undefined) {
      // Export specific version
      const versionResult = await getVersion(supabase, manuscriptId, versionId);
      if (versionResult.error || !versionResult.version) {
        return {
          title: "",
          content: "",
          content_json: null,
          error: versionResult.error || "Version not found",
        };
      }
      return {
        title: versionResult.version.title,
        content: versionResult.version.content_text,
        content_json: versionResult.version.content_json,
        error: null,
      };
    } else {
      // Export current version
      const manuscriptResult = await getManuscript(supabase, manuscriptId);
      if (manuscriptResult.error || !manuscriptResult.manuscript) {
        return {
          title: "",
          content: "",
          content_json: null,
          error: manuscriptResult.error || "Manuscript not found",
        };
      }
      return {
        title: manuscriptResult.manuscript.title,
        content: manuscriptResult.manuscript.content_text,
        content_json: manuscriptResult.manuscript.content_json,
        error: null,
      };
    }
  } catch (err) {
    console.error("Error getting manuscript for export:", err);
    return {
      title: "",
      content: "",
      content_json: null,
      error: "Failed to get manuscript content",
    };
  }
}

/**
 * Generate PDF buffer from manuscript content
 * AC 2.4.1: PDF downloads with correct title and content
 */
export async function generatePDF(
  title: string,
  content: string,
  contentJson?: any
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72,
        },
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", (error) => {
        reject(error);
      });

      // Add title
      doc.fontSize(20).font("Helvetica-Bold").text(title, {
        align: "center",
        underline: true,
      });

      doc.moveDown(2);

      // Add content
      // Add content
      if (contentJson && contentJson.content) {
         // Rich Text PDF Generation
         const nodes = contentJson.content;
         for (const node of nodes) {
            if (node.type === 'heading') {
               const text = node.content?.map((c: any) => c.text).join('') || '';
               const fontSize = node.attrs?.level === 1 ? 18 : node.attrs?.level === 2 ? 16 : 14;
               doc.fontSize(fontSize).font("Helvetica-Bold").text(text);
               doc.moveDown(0.5);
            } else if (node.type === 'paragraph') {
               doc.fontSize(12).font("Helvetica");
               
               if (node.content) {
                 // Render mixed styles (bold/italic)
                 let lineY = doc.y;
                 let lineX = doc.x;
                 
                 // PDFKit text mixed styling is complex (continue: true).
                 // Simple approach: Render whole paragraph as plain text if complex, 
                 // OR iterate text runs. 
                 // PDFKit doesn't support "inline bold" easily without manual cursor management or 'continued: true'.
                 
                 for (let i = 0; i < node.content.length; i++) {
                    const span = node.content[i];
                    if (span.type === 'text') {
                       const isBold = span.marks?.some((m: any) => m.type === 'bold');
                       const isItalic = span.marks?.some((m: any) => m.type === 'italic');
                       
                       const fontName = isBold && isItalic ? "Helvetica-BoldOblique" 
                                      : isBold ? "Helvetica-Bold" 
                                      : isItalic ? "Helvetica-Oblique" 
                                      : "Helvetica";
                                      
                       doc.font(fontName).text(span.text, { continued: i < node.content.length - 1 });
                    }
                 }
                 doc.text("", { continued: false }); // Reset
                 doc.moveDown();
               } else {
                 doc.text(""); // Empty paragraph
                 doc.moveDown();
               }
            } else if (node.type === 'bulletList' || node.type === 'orderedList') {
                // Simple list support
                if (node.content) {
                   node.content.forEach((li: any) => {
                      li.content?.forEach((p: any) => {
                         const text = p.content?.map((c: any) => c.text).join('') || '';
                         doc.fontSize(12).font("Helvetica").text(`• ${text}`, { indent: 20 });
                      });
                   });
                   doc.moveDown();
                }
            }
         }
      } else {
        // Fallback Plain Text
        doc.fontSize(12).font("Helvetica").text(content, {
          align: "left",
          lineGap: 5,
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate DOCX buffer from manuscript content
 * AC 2.4.2: Text, bold, italics, and lists are preserved
 * Note: For now, we preserve basic text. Rich formatting can be enhanced later
 * by parsing content_json if needed.
 */
export async function generateDOCX(
  title: string,
  content: string,
  contentJson?: any
): Promise<Buffer> {
  try {
    // Split content into paragraphs (by double newlines or single newlines)
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((para) => para.trim())
      .filter((para) => para.length > 0);

    // Create document with title and content
    const doc = new Document({
      sections: [
        {
          children: [
            // Title as heading
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 400 },
            }),
            // Content
            ...(contentJson 
                ? tiptapToDocx(contentJson) 
                : paragraphs.map(para => new Paragraph({ children: [new TextRun({ text: para })], spacing: { after: 200 } }))
            ),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    throw new Error(`Failed to generate DOCX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Export manuscript to specified format
 * Handles both current version and specific version exports
 * AC 2.4.4: Selected version is used when versionId is provided
 */
export async function exportManuscript(
  supabase: SupabaseClient,
  manuscriptId: string,
  options: ExportOptions
): Promise<{ buffer: Buffer; filename: string; error: string | null }> {
  try {
    // Get manuscript content (current or specific version)
    const manuscriptData = await getManuscriptForExport(
      supabase,
      manuscriptId,
      options.versionId
    );

    if (manuscriptData.error) {
      return {
        buffer: Buffer.alloc(0),
        filename: "",
        error: manuscriptData.error,
      };
    }

    const { title, content, content_json } = manuscriptData;

    // Generate file based on format
    let buffer: Buffer;
    let extension: string;

    if (options.format === "pdf") {
      buffer = await generatePDF(title, content, content_json);
      extension = "pdf";
    } else {
      buffer = await generateDOCX(title, content, content_json);
      extension = "docx";
    }

    // Generate filename: title-version.pdf/docx
    const sanitizedTitle = title
      .replace(/[^a-z0-9]/gi, "-")
      .replace(/-+/g, "-") // Collapse multiple dashes
      .replace(/^-|-$/g, "") // Remove leading/trailing dashes
      .toLowerCase()
      .substring(0, 50);
    const versionSuffix =
      options.versionId !== undefined ? `-v${options.versionId}` : "";
    const filename = `${sanitizedTitle}${versionSuffix}.${extension}`;

    return {
      buffer,
      filename,
      error: null,
    };
  } catch (error) {
    console.error("Error exporting manuscript:", error);
    return {
      buffer: Buffer.alloc(0),
      filename: "",
      error: error instanceof Error ? error.message : "Failed to export manuscript",
    };
  }
}


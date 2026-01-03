import { Paragraph, TextRun, HeadingLevel } from "docx";

// Helper types for Tiptap structure
export interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, any>;
  marks?: { type: string; attrs?: Record<string, any> }[];
}

function parseTiptapToDocxChildren(nodes: TiptapNode[]): Paragraph[] {
  return nodes.map((node) => {
    switch (node.type) {
      case "heading":
        return new Paragraph({
          text: node.content?.map(c => c.text || "").join("") || "",
          heading: node.attrs?.level === 1 ? HeadingLevel.HEADING_1 : 
                   node.attrs?.level === 2 ? HeadingLevel.HEADING_2 : 
                   HeadingLevel.HEADING_3,
          spacing: { after: 200, before: 200 },
        });
      
      case "paragraph":
        const children = node.content?.map((child) => {
          if (child.type === "text") {
            return new TextRun({
              text: child.text || "",
              bold: child.marks?.some(m => m.type === "bold"),
              italics: child.marks?.some(m => m.type === "italic"),
              strike: child.marks?.some(m => m.type === "strike"),
            });
          }
          return new TextRun({ text: "" }); // Fallback
        }) || [];
        
        return new Paragraph({
          children: children,
          spacing: { after: 200 },
        });

      case "bulletList":
         // Docx handles lists differently (flat structure with numbering props), 
         // but nesting Paragraphs inside Paragraphs isn't how it works.
         // We might need to unwrap lists or return an array of paragraphs.
         // For simplicity in this recursive helper, we might skip complex nested lists 
         // or handle them by returning flat Paragraph[] arrays if I refactor the return type.
         // Let's stick to basic mapping for now and fallback to text for complex nodes.
         return new Paragraph({ text: "[List]" }); 
         
      default:
         return new Paragraph({ text: "" });
    }
  });
}

// Improved flatten parser for top level
export function tiptapToDocx(content: TiptapNode): (Paragraph)[] {
  if (!content.content) return [];
  
  const paragraphs: Paragraph[] = [];
  
  content.content.forEach(node => {
     if (node.type === "paragraph" || node.type === "heading") {
        paragraphs.push(...parseTiptapToDocxChildren([node]));
      } else if (node.type === "bulletList" || node.type === "orderedList") {
        // Handle lists by flattening items
        node.content?.forEach((listItem) => {
           // listItem has content: [paragraph]
           listItem.content?.forEach(p => {
              // p is usually a paragraph
              const runs: TextRun[] = [];
              
              // Internal text generation
              p.content?.forEach((child) => {
                 if (child.type === "text") {
                    runs.push(new TextRun({
                      text: child.text || "",
                      bold: child.marks?.some(m => m.type === "bold"),
                      italics: child.marks?.some(m => m.type === "italic"),
                      strike: child.marks?.some(m => m.type === "strike"),
                    }));
                 }
              });

               paragraphs.push(new Paragraph({
                 children: [new TextRun({ text: "• " }), ...runs], 
                 indent: { left: 720 }, // Indent 0.5 inch
               })); 
           });
        });
     }
  });
  
  return paragraphs;
}

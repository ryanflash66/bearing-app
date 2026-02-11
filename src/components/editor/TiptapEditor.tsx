"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import { TemporaryHighlight } from "@/lib/tiptap/temporaryHighlight";
import { ResizableImage } from "./extensions/ResizableImage";
import { ImageUploadDialog } from "./dialogs/ImageUploadDialog";

interface TiptapEditorProps {
  content: string | object;
  editable?: boolean;
  onUpdate?: (content: { json: any; html: string; text: string }) => void;
  onSelectionUpdate?: (editor: Editor) => void;
  onEditorReady?: (editor: Editor) => void;
  placeholder?: string;
  className?: string;
  manuscriptId: string;
}

export default function TiptapEditor({
  content,
  editable = true,
  onUpdate,
  onSelectionUpdate,
  onEditorReady,
  placeholder = "Start writing...",
  className = "",
  manuscriptId,
}: TiptapEditorProps) {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty before:content-[attr(data-placeholder)] before:float-left before:text-slate-400 before:pointer-events-none before:h-0",
      }),
      TemporaryHighlight,
      ResizableImage.configure({
        allowBase64: true,
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-slate max-w-none focus:outline-none min-h-[calc(100vh-300px)] ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.({
        json: editor.getJSON(),
        html: editor.getHTML(),
        text: editor.getText(),
      });
    },
    onSelectionUpdate: ({ editor }) => {
      onSelectionUpdate?.(editor);
    },
  });

  // Handle editable state changes
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  // Handle external content updates
  useEffect(() => {
    if (!editor || !content) return;

    const isString = typeof content === "string";
    const currentHTML = editor.getHTML();
    const currentText = editor.getText();
    
    if (isString) {
      if (content !== currentHTML && content !== currentText) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    } else {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (newJSON !== currentJSON) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const handleImageInsert = (url: string, alt: string, width?: number, height?: number) => {
    editor.chain().focus().setImage({ src: url, alt, title: alt }).run();
    // TODO: Apply width/height if needed via custom attributes or style (but CSP prefers classes)
    // The ResizableImage extension can be updated to accept width/height attributes if we want to render them.
    // For now, responsive CSS class handles max-width.
  };

  // AC 8.8.3: Get current paragraph context for "Generate from Context" option
  const getEditorContext = (): string => {
    if (!editor) return '';
    const { from } = editor.state.selection;
    // Get surrounding text (up to 500 chars before and after cursor)
    const doc = editor.state.doc;
    const start = Math.max(0, from - 500);
    const end = Math.min(doc.content.size, from + 500);
    return doc.textBetween(start, end, '\n');
  };

  return (
    <>
      {editable && (
        <div className="flex items-center gap-2 mb-2 p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
          <button
            onClick={() => setIsImageDialogOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
            title="Insert Image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </button>
          {/* Add other toolbar items here later */}
        </div>
      )}

      <EditorContent editor={editor} />
      
      <ImageUploadDialog
        open={isImageDialogOpen}
        onOpenChange={setIsImageDialogOpen}
        onInsert={handleImageInsert}
        manuscriptId={manuscriptId}
        editorContext={getEditorContext()}
      />
    </>
  );
}

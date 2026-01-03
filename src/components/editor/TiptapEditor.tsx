"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface TiptapEditorProps {
  content: string | object;
  editable?: boolean;
  onUpdate?: (content: { json: any; html: string; text: string }) => void;
  onSelectionUpdate?: (editor: Editor) => void;
  onEditorReady?: (editor: Editor) => void;
  placeholder?: string;
  className?: string;
}

export default function TiptapEditor({
  content,
  editable = true,
  onUpdate,
  onSelectionUpdate,
  onEditorReady,
  placeholder = "Start writing...",
  className = "",
}: TiptapEditorProps) {
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

  // Handle external content updates (like version restoration)
  useEffect(() => {
    if (!editor || !content) return;

    const isString = typeof content === "string";
    const currentHTML = editor.getHTML();
    const currentText = editor.getText();
    
    if (isString) {
      // Only update if the string content is different from both HTML and Text
      if (content !== currentHTML && content !== currentText) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    } else {
      // Handle JSON content if provided
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

  return <EditorContent editor={editor} />;
}

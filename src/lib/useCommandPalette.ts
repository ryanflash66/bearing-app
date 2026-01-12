"use client";

import { useState, useEffect, useCallback } from "react";
import { CommandItem } from "@/components/editor/CommandPalette";

interface UseCommandPaletteOptions {
  enabled?: boolean;
  onTransform?: (instruction: string, selectedText: string) => Promise<void>;
  onNavigate?: (chapterIndex: number) => void;
  selectedText?: string;
  chapters?: { title: string; index: number }[];
}

interface UseCommandPaletteReturn {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  commands: CommandItem[];
  isLoading: boolean;
  loadingMessage: string;
}

export function useCommandPalette({
  enabled = true,
  onTransform,
  onNavigate,
  selectedText = "",
  chapters = [],
}: UseCommandPaletteOptions): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }
    };

    // Use capture phase to intercept before other handlers
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [enabled]);

  // Create AI transformation command
  const createAICommand = useCallback(
    (
      id: string,
      label: string,
      description: string,
      instruction: string,
      icon: string
    ): CommandItem => ({
      id,
      label,
      description,
      icon,
      category: "ai",
      disabled: !selectedText || !onTransform,
      action: async () => {
        if (!selectedText || !onTransform) {
          return;
        }
        setIsLoading(true);
        setLoadingMessage(`${label}...`);
        try {
          await onTransform(instruction, selectedText);
        } finally {
          setIsLoading(false);
          setLoadingMessage("");
        }
      },
    }),
    [selectedText, onTransform]
  );

  // Build command list
  const commands: CommandItem[] = [
    // AI Transformation Commands
    createAICommand(
      "make-concise",
      "Make Concise",
      "Shorten the text while preserving meaning",
      "Make this text more concise. Remove unnecessary words and tighten the prose while keeping the same meaning.",
      "✂️"
    ),
    createAICommand(
      "expand",
      "Expand",
      "Add more detail and depth",
      "Expand this text with more detail and depth. Add descriptive elements and elaboration.",
      "📝"
    ),
    createAICommand(
      "change-tone-formal",
      "Formal Tone",
      "Make the writing more formal",
      "Rewrite this text in a more formal, professional tone.",
      "🎩"
    ),
    createAICommand(
      "change-tone-casual",
      "Casual Tone",
      "Make the writing more casual",
      "Rewrite this text in a more casual, conversational tone.",
      "💬"
    ),
    createAICommand(
      "change-tone-dark",
      "Dark Tone",
      "Add a darker, more dramatic mood",
      "Rewrite this text with a darker, more dramatic and ominous tone.",
      "🌑"
    ),
    createAICommand(
      "change-tone-light",
      "Light Tone",
      "Add a lighter, more uplifting mood",
      "Rewrite this text with a lighter, more hopeful and uplifting tone.",
      "☀️"
    ),
    createAICommand(
      "continue",
      "Continue Writing",
      "AI continues from where you left off",
      "Continue writing from where this text ends. Match the style and tone.",
      "➡️"
    ),
    createAICommand(
      "fix-grammar",
      "Fix Grammar",
      "Correct grammar and spelling",
      "Fix any grammar, spelling, and punctuation errors in this text while preserving the meaning.",
      "✓"
    ),
    createAICommand(
      "simplify",
      "Simplify",
      "Make easier to understand",
      "Simplify this text to make it easier to understand. Use simpler words and shorter sentences.",
      "📖"
    ),
    createAICommand(
      "show-dont-tell",
      "Show Don't Tell",
      "Convert telling to showing",
      "Rewrite this text to 'show' rather than 'tell'. Use action, dialogue, and sensory details instead of exposition.",
      "🎬"
    ),

    // Navigation Commands
    {
      id: "nav-next-chapter",
      label: "Next Chapter",
      description: "Jump to the next chapter",
      icon: "⏭️",
      category: "navigation",
      disabled: !onNavigate || chapters.length === 0,
      action: () => {
        // This would need current chapter context
        // For now, it's a placeholder
      },
    },
    {
      id: "nav-prev-chapter",
      label: "Previous Chapter",
      description: "Jump to the previous chapter",
      icon: "⏮️",
      category: "navigation",
      disabled: !onNavigate || chapters.length === 0,
      action: () => {
        // This would need current chapter context
      },
    },

    // Action Commands
    {
      id: "action-save-snapshot",
      label: "Save Snapshot",
      description: "Create a version snapshot",
      icon: "📸",
      category: "action",
      action: () => {
        // This would trigger version creation
        // Placeholder for now
      },
    },
    {
      id: "action-run-consistency",
      label: "Run Consistency Check",
      description: "Analyze manuscript for inconsistencies",
      icon: "🔍",
      category: "action",
      action: () => {
        // This would trigger consistency check
        // Placeholder for now
      },
    },
    {
      id: "action-export-pdf",
      label: "Export PDF",
      description: "Download manuscript as PDF",
      icon: "📄",
      category: "action",
      action: () => {
        // This would trigger PDF export
        // Placeholder for now
      },
    },
    {
      id: "action-export-docx",
      label: "Export DOCX",
      description: "Download manuscript as Word document",
      icon: "📝",
      category: "action",
      action: () => {
        // This would trigger DOCX export
        // Placeholder for now
      },
    },
  ];

  return {
    isOpen,
    setIsOpen,
    commands,
    isLoading,
    loadingMessage,
  };
}

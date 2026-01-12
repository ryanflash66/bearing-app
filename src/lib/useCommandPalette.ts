"use client";

import { useState, useEffect, useCallback } from "react";
import { CommandItem } from "@/components/editor/CommandPalette";

interface UseCommandPaletteOptions {
  enabled?: boolean;
  onTransform?: (instruction: string, selectedText: string) => Promise<void>;
  onNavigate?: (chapterIndex: number) => void;
  onClose?: () => void; // Called when palette closes to restore editor focus
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
  onClose,
  selectedText = "",
  chapters = [],
}: UseCommandPaletteOptions): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Wrapper to handle close with callback
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open && onClose) {
      // Small delay to ensure dialog animation completes
      setTimeout(() => onClose(), 50);
    }
  }, [onClose]);

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
          // Close palette after successful transformation
          handleOpenChange(false);
        } finally {
          setIsLoading(false);
          setLoadingMessage("");
        }
      },
    }),
    [selectedText, onTransform, handleOpenChange]
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

    // Note: Navigation commands (next/prev chapter) and action commands (export, snapshot)
    // are intentionally omitted - they require additional integration work.
    // Use "go to chapter N" or "find character X" for navigation instead.
  ];

  return {
    isOpen,
    setIsOpen: handleOpenChange,
    commands,
    isLoading,
    loadingMessage,
  };
}

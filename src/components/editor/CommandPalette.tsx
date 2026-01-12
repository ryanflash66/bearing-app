"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  category: "ai" | "navigation" | "action";
  action: () => void | Promise<void>;
  disabled?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandItem[];
  placeholder?: string;
  onNavigate?: (chapterIndex: number) => void;
  chapters?: { title: string; index: number }[];
  isLoading?: boolean;
  loadingMessage?: string;
}

export default function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = "Type a command or search...",
  onNavigate,
  chapters = [],
  isLoading = false,
  loadingMessage = "Processing...",
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [navigationConfirmation, setNavigationConfirmation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setNavigationConfirmation(null);
      // Small delay to ensure dialog is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Clear navigation confirmation after 2 seconds
  useEffect(() => {
    if (navigationConfirmation) {
      const timer = setTimeout(() => {
        setNavigationConfirmation(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [navigationConfirmation]);

  const handleSelect = useCallback(async (command: CommandItem) => {
    try {
      await command.action();
    } catch (error) {
      console.error("Command execution failed:", error);
    }
  }, []);

  // Parse navigation commands like "go to chapter 3"
  const parseNavigationCommand = useCallback((input: string): number | null => {
    const patterns = [
      /^go\s+to\s+chapter\s+(\d+)$/i,
      /^chapter\s+(\d+)$/i,
      /^goto\s+(\d+)$/i,
      /^nav\s+(\d+)$/i,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return null;
  }, []);

  // Handle navigation command
  const handleNavigation = useCallback((chapterNum: number) => {
    if (chapters.length === 0) {
      setNavigationConfirmation("No chapters available");
      return;
    }

    const targetIndex = chapterNum - 1; // Convert to 0-based
    if (targetIndex < 0 || targetIndex >= chapters.length) {
      setNavigationConfirmation(`Chapter ${chapterNum} not found (1-${chapters.length} available)`);
      return;
    }

    const chapter = chapters[targetIndex];
    onNavigate?.(chapter.index);
    setNavigationConfirmation(`Navigated to Chapter ${chapterNum}: ${chapter.title}`);
    setSearch("");
  }, [chapters, onNavigate]);

  // Check for navigation command on search change
  useEffect(() => {
    const chapterNum = parseNavigationCommand(search.trim());
    if (chapterNum !== null && onNavigate) {
      handleNavigation(chapterNum);
    }
  }, [search, parseNavigationCommand, handleNavigation, onNavigate]);

  // Group commands by category
  const aiCommands = commands.filter(c => c.category === "ai");
  const navigationCommands = commands.filter(c => c.category === "navigation");
  const actionCommands = commands.filter(c => c.category === "action");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="command-palette-overlay" />
        <Dialog.Content
          className="command-palette-content"
          aria-label="Command palette"
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <Command
            className="command-palette"
            shouldFilter={true}
            loop
          >
            <div className="command-palette-header">
              <Command.Input
                ref={inputRef}
                value={search}
                onValueChange={setSearch}
                placeholder={placeholder}
                className="command-palette-input"
                aria-label="Search commands"
              />
              {isLoading && (
                <div className="command-palette-loading">
                  <span className="command-palette-spinner" aria-hidden="true" />
                  <span className="sr-only">{loadingMessage}</span>
                </div>
              )}
            </div>

            {navigationConfirmation && (
              <div className="command-palette-confirmation" role="status" aria-live="polite">
                {navigationConfirmation}
              </div>
            )}

            <Command.List className="command-palette-list">
              <Command.Empty className="command-palette-empty">
                No commands found. Try "go to chapter 3" or search for an action.
              </Command.Empty>

              {aiCommands.length > 0 && (
                <Command.Group heading="AI Transformations" className="command-palette-group">
                  {aiCommands.map((command) => (
                    <Command.Item
                      key={command.id}
                      value={`${command.label} ${command.description || ""}`}
                      onSelect={() => handleSelect(command)}
                      disabled={command.disabled || isLoading}
                      className="command-palette-item"
                    >
                      {command.icon && (
                        <span className="command-palette-icon" aria-hidden="true">
                          {command.icon}
                        </span>
                      )}
                      <div className="command-palette-item-content">
                        <span className="command-palette-item-label">{command.label}</span>
                        {command.description && (
                          <span className="command-palette-item-description">
                            {command.description}
                          </span>
                        )}
                      </div>
                      {command.shortcut && (
                        <kbd className="command-palette-shortcut">{command.shortcut}</kbd>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {navigationCommands.length > 0 && (
                <Command.Group heading="Navigation" className="command-palette-group">
                  {navigationCommands.map((command) => (
                    <Command.Item
                      key={command.id}
                      value={`${command.label} ${command.description || ""}`}
                      onSelect={() => handleSelect(command)}
                      disabled={command.disabled}
                      className="command-palette-item"
                    >
                      {command.icon && (
                        <span className="command-palette-icon" aria-hidden="true">
                          {command.icon}
                        </span>
                      )}
                      <div className="command-palette-item-content">
                        <span className="command-palette-item-label">{command.label}</span>
                        {command.description && (
                          <span className="command-palette-item-description">
                            {command.description}
                          </span>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {actionCommands.length > 0 && (
                <Command.Group heading="Actions" className="command-palette-group">
                  {actionCommands.map((command) => (
                    <Command.Item
                      key={command.id}
                      value={`${command.label} ${command.description || ""}`}
                      onSelect={() => handleSelect(command)}
                      disabled={command.disabled}
                      className="command-palette-item"
                    >
                      {command.icon && (
                        <span className="command-palette-icon" aria-hidden="true">
                          {command.icon}
                        </span>
                      )}
                      <div className="command-palette-item-content">
                        <span className="command-palette-item-label">{command.label}</span>
                        {command.description && (
                          <span className="command-palette-item-description">
                            {command.description}
                          </span>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Dynamic chapter navigation based on search */}
              {chapters.length > 0 && search.toLowerCase().includes("chapter") && (
                <Command.Group heading="Chapters" className="command-palette-group">
                  {chapters.map((chapter, idx) => (
                    <Command.Item
                      key={`chapter-${idx}`}
                      value={`chapter ${idx + 1} ${chapter.title}`}
                      onSelect={() => {
                        onNavigate?.(chapter.index);
                        setNavigationConfirmation(`Navigated to Chapter ${idx + 1}: ${chapter.title}`);
                      }}
                      className="command-palette-item"
                    >
                      <span className="command-palette-icon" aria-hidden="true">
                        📖
                      </span>
                      <div className="command-palette-item-content">
                        <span className="command-palette-item-label">
                          Chapter {idx + 1}: {chapter.title}
                        </span>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>

            <div className="command-palette-footer">
              <span className="command-palette-hint">
                <kbd>↑↓</kbd> navigate
              </span>
              <span className="command-palette-hint">
                <kbd>Enter</kbd> select
              </span>
              <span className="command-palette-hint">
                <kbd>Esc</kbd> close
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>

      <style jsx global>{`
        .command-palette-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          animation: overlayShow 150ms ease-out;
        }

        .command-palette-content {
          position: fixed;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 560px;
          max-height: 70vh;
          z-index: 101;
          animation: contentShow 150ms ease-out;
        }

        .command-palette {
          background: #FDF7E9;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .command-palette-header {
          display: flex;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .command-palette-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 16px;
          font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1F2937;
        }

        .command-palette-input::placeholder {
          color: #6B7280;
        }

        .command-palette-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4F46E5;
          font-size: 14px;
        }

        .command-palette-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #4F46E5;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .command-palette-confirmation {
          padding: 8px 16px;
          background: #ECFDF5;
          color: #047857;
          font-size: 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .command-palette-list {
          max-height: 320px;
          overflow-y: auto;
          padding: 8px;
        }

        .command-palette-empty {
          padding: 24px 16px;
          text-align: center;
          color: #6B7280;
          font-size: 14px;
        }

        .command-palette-group {
          margin-bottom: 8px;
        }

        .command-palette-group [cmdk-group-heading] {
          padding: 8px 12px 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6B7280;
        }

        .command-palette-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.1s ease;
        }

        .command-palette-item[data-selected="true"] {
          background: rgba(79, 70, 229, 0.1);
        }

        .command-palette-item[data-disabled="true"] {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .command-palette-item:hover:not([data-disabled="true"]) {
          background: rgba(0, 0, 0, 0.05);
        }

        .command-palette-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          font-size: 16px;
          flex-shrink: 0;
        }

        .command-palette-item-content {
          flex: 1;
          min-width: 0;
        }

        .command-palette-item-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #1F2937;
        }

        .command-palette-item-description {
          display: block;
          font-size: 12px;
          color: #6B7280;
          margin-top: 2px;
        }

        .command-palette-shortcut {
          font-size: 11px;
          font-family: SF Mono, Monaco, Consolas, monospace;
          background: rgba(0, 0, 0, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          color: #6B7280;
        }

        .command-palette-footer {
          display: flex;
          gap: 16px;
          padding: 12px 16px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(0, 0, 0, 0.02);
        }

        .command-palette-hint {
          font-size: 12px;
          color: #6B7280;
        }

        .command-palette-hint kbd {
          font-family: SF Mono, Monaco, Consolas, monospace;
          font-size: 11px;
          background: rgba(0, 0, 0, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          margin-right: 4px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @keyframes overlayShow {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes contentShow {
          from {
            opacity: 0;
            transform: translateX(-50%) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Dialog.Root>
  );
}

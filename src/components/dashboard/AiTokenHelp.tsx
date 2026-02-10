"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Reusable AI token help component that displays an info icon
 * with a popover explaining what AI tokens are and how they work.
 *
 * Ensures consistent messaging across dashboard and admin views.
 */
export function AiTokenHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-label="What are AI tokens?"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-slate-900">What are AI tokens?</h4>
          <div className="text-sm text-slate-600 space-y-2">
            <p>Tokens are units of AI model usage. Your usage includes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Gemini consistency checks</li>
              <li>Llama AI suggestions</li>
            </ul>
            <p className="pt-2">
              Tokens reset each billing cycle and are automatically managed.
              The displayed value shows <strong>tokens used / monthly cap</strong>.
            </p>
            <p className="pt-2 text-xs text-slate-500">
              Note: <strong>k</strong> means thousands of tokens.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

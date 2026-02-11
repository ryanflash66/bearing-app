import { useState, useCallback } from 'react';

export interface UndoStackItem {
  issueId: string;
  originalText: string;
  fixedText: string;
  appliedAt: number;
}

const MAX_STACK_SIZE = 20;

export function useUndoStack() {
  const [stack, setStack] = useState<UndoStackItem[]>([]);

  const push = useCallback((item: UndoStackItem) => {
    setStack((prev) => {
      const newStack = [...prev, item];
      // FIFO eviction when full (remove oldest)
      if (newStack.length > MAX_STACK_SIZE) {
        return newStack.slice(1);
      }
      return newStack;
    });
  }, []);

  const pop = useCallback((issueId: string) => {
    setStack((prev) => prev.filter((item) => item.issueId !== issueId));
  }, []);

  const clear = useCallback(() => {
    setStack([]);
  }, []);

  const isExpired = useCallback((issueId: string): boolean => {
    const item = stack.find((i) => i.issueId === issueId);
    if (!item) return true;

    const now = Date.now();
    const elapsed = now - item.appliedAt;
    return elapsed > 60000; // 60 seconds
  }, [stack]);

  const getItem = useCallback((issueId: string): UndoStackItem | undefined => {
    return stack.find((i) => i.issueId === issueId);
  }, [stack]);

  return {
    stack,
    push,
    pop,
    clear,
    isExpired,
    getItem,
  };
}

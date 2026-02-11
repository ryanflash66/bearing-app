/**
 * Unit tests for useUndoStack hook
 * Story 8.7: Check consistency enhancement
 * AC 8.7.4 (Task 12.2, 12.4): Test undo stack FIFO eviction and expiry
 */

import { renderHook, act } from '@testing-library/react';
import { useUndoStack, UndoStackItem } from './useUndoStack';

describe('useUndoStack', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // AC 8.7.4 (Task 12.2): Test FIFO eviction at max size
  it('should evict oldest item when stack exceeds max size (20)', () => {
    const { result } = renderHook(() => useUndoStack());

    // Add 21 items (max is 20)
    act(() => {
      for (let i = 0; i < 21; i++) {
        result.current.push({
          issueId: `issue-${i}`,
          originalText: `original-${i}`,
          fixedText: `fixed-${i}`,
          appliedAt: Date.now(),
        });
      }
    });

    // Stack should have only 20 items
    expect(result.current.stack.length).toBe(20);

    // First item (issue-0) should be evicted
    const hasFirstItem = result.current.stack.some(item => item.issueId === 'issue-0');
    expect(hasFirstItem).toBe(false);

    // Last item (issue-20) should be present
    const hasLastItem = result.current.stack.some(item => item.issueId === 'issue-20');
    expect(hasLastItem).toBe(true);

    // Item issue-1 should now be the oldest
    expect(result.current.stack[0].issueId).toBe('issue-1');
  });

  it('should add items to the stack', () => {
    const { result } = renderHook(() => useUndoStack());

    const item: UndoStackItem = {
      issueId: 'test-1',
      originalText: 'original',
      fixedText: 'fixed',
      appliedAt: Date.now(),
    };

    act(() => {
      result.current.push(item);
    });

    expect(result.current.stack.length).toBe(1);
    expect(result.current.stack[0]).toEqual(item);
  });

  it('should remove items from the stack by ID', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({
        issueId: 'test-1',
        originalText: 'original-1',
        fixedText: 'fixed-1',
        appliedAt: Date.now(),
      });
      result.current.push({
        issueId: 'test-2',
        originalText: 'original-2',
        fixedText: 'fixed-2',
        appliedAt: Date.now(),
      });
    });

    expect(result.current.stack.length).toBe(2);

    act(() => {
      result.current.pop('test-1');
    });

    expect(result.current.stack.length).toBe(1);
    expect(result.current.stack[0].issueId).toBe('test-2');
  });

  it('should clear all items from the stack', () => {
    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({
        issueId: 'test-1',
        originalText: 'original-1',
        fixedText: 'fixed-1',
        appliedAt: Date.now(),
      });
      result.current.push({
        issueId: 'test-2',
        originalText: 'original-2',
        fixedText: 'fixed-2',
        appliedAt: Date.now(),
      });
    });

    expect(result.current.stack.length).toBe(2);

    act(() => {
      result.current.clear();
    });

    expect(result.current.stack.length).toBe(0);
  });

  // AC 8.7.4 (Task 12.4): Test undo button visibility expires after 60 seconds
  it('should return false for isExpired when item is recent (< 60s)', () => {
    const { result } = renderHook(() => useUndoStack());

    const now = Date.now();

    act(() => {
      result.current.push({
        issueId: 'test-1',
        originalText: 'original',
        fixedText: 'fixed',
        appliedAt: now,
      });
    });

    // Advance time by 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(result.current.isExpired('test-1')).toBe(false);
  });

  it('should return true for isExpired when item is older than 60s', () => {
    const { result } = renderHook(() => useUndoStack());

    const now = Date.now();

    act(() => {
      result.current.push({
        issueId: 'test-1',
        originalText: 'original',
        fixedText: 'fixed',
        appliedAt: now,
      });
    });

    // Advance time by 61 seconds
    act(() => {
      jest.advanceTimersByTime(61000);
    });

    expect(result.current.isExpired('test-1')).toBe(true);
  });

  it('should return true for isExpired when item does not exist', () => {
    const { result } = renderHook(() => useUndoStack());

    expect(result.current.isExpired('non-existent')).toBe(true);
  });

  it('should get item by ID', () => {
    const { result } = renderHook(() => useUndoStack());

    const item: UndoStackItem = {
      issueId: 'test-1',
      originalText: 'original',
      fixedText: 'fixed',
      appliedAt: Date.now(),
    };

    act(() => {
      result.current.push(item);
    });

    const retrieved = result.current.getItem('test-1');
    expect(retrieved).toEqual(item);
  });

  it('should return undefined for non-existent item', () => {
    const { result } = renderHook(() => useUndoStack());

    const retrieved = result.current.getItem('non-existent');
    expect(retrieved).toBeUndefined();
  });
});

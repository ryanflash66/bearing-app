"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { updateManuscript, generateContentHash } from "./manuscripts";
import { createVersionSnapshot } from "./manuscriptVersions";

// Types
export interface AutosaveState {
  status: "idle" | "saving" | "saved" | "error" | "offline" | "conflict";
  lastSavedAt: Date | null;
  error: string | null;
  pendingChanges: boolean;
  retryCount: number;
  retryingIn: number | null;       // Seconds until next retry (null if not waiting)
  maxRetriesExceeded: boolean;     // True when manual action is required
}

export interface AutosaveOptions {
  debounceMs?: number;        // Default 5000ms (5 seconds per AC 2.1.1)
  maxRetries?: number;        // Default 5 retries
  retryDelayMs?: number;      // Default 2000ms (base delay for exponential backoff)
  maxRetryDelay?: number;     // Default 30000ms (cap for exponential backoff)
  versionThreshold?: number;  // Default 5 autosaves before creating version snapshot
  initialTitle?: string;
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
  onConflict?: (serverState: any) => void;
}

interface QueuedSave {
  manuscriptId: string;
  content: {
    content_json: Record<string, unknown>;
    content_text: string;
  };
  expectedUpdatedAt: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// IndexedDB for offline persistence
const DB_NAME = "bearing_autosave";
const STORE_NAME = "pending_saves";
const DB_VERSION = 1;

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "manuscriptId" });
      }
    };
  });
}

async function savePendingToIndexedDB(save: QueuedSave): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(save);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getPendingFromIndexedDB(manuscriptId: string): Promise<QueuedSave | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(manuscriptId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function deletePendingFromIndexedDB(manuscriptId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(manuscriptId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getAllPendingFromIndexedDB(): Promise<QueuedSave[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Structured error logging for autosave failures (AC 8.2.4)
 * Logs actionable error info without PII or manuscript content
 */
function logSaveError(
  manuscriptId: string,
  errorType: "network" | "api" | "conflict" | "timeout" | "unknown",
  statusCode: number | null,
  retryCount: number,
  message: string
): void {
  const logEntry = {
    event: "autosave_error",
    manuscriptId,
    errorType,
    statusCode,
    retryCount,
    timestamp: new Date().toISOString(),
    message: message.substring(0, 200), // Truncate to prevent PII leakage
  };

  console.error("[Autosave]", JSON.stringify(logEntry));

  // Future: Send to server-side logging if analytics endpoint exists
}

/**
 * Classify error type from error message/response
 */
function classifyError(error: string): { type: "network" | "api" | "conflict" | "timeout" | "unknown"; statusCode: number | null } {
  const lowerError = error.toLowerCase();

  if (lowerError.includes("network") || lowerError.includes("fetch") || lowerError.includes("connection")) {
    return { type: "network", statusCode: null };
  }
  if (lowerError.includes("timeout")) {
    return { type: "timeout", statusCode: null };
  }
  if (lowerError.includes("conflict")) {
    return { type: "conflict", statusCode: 409 };
  }

  // Try to extract status code
  const statusMatch = error.match(/\b([45]\d{2})\b/);
  if (statusMatch) {
    return { type: "api", statusCode: parseInt(statusMatch[1], 10) };
  }

  return { type: "unknown", statusCode: null };
}

/**
 * useAutosave hook - implements autosave with offline support
 *
 * AC 2.1.1: Autosave at max 5-second interval without blocking UI
 * AC 2.1.2: Network drop recovery with no data loss
 * AC 2.1.3: Autosave begins immediately when editor loads
 * AC 8.2.1: Exponential backoff for retries
 */
export function useAutosave(
  manuscriptId: string,
  initialUpdatedAt: string,
  options: AutosaveOptions = {}
) {
  const {
    debounceMs = 5000,          // 5 seconds per AC 2.1.1
    maxRetries = 5,
    retryDelayMs = 2000,        // Base delay for exponential backoff
    maxRetryDelay = 30000,      // Cap at 30 seconds per AC 8.2.1
    versionThreshold = 5,       // Create version snapshot every 5 autosaves
    onSaveSuccess,
    onSaveError,
    onConflict,
  } = options;

  const [state, setState] = useState<AutosaveState>({
    status: "idle",
    lastSavedAt: null,
    error: null,
    pendingChanges: false,
    retryCount: 0,
    retryingIn: null,
    maxRetriesExceeded: false,
  });

  // Refs for latest values (avoid stale closures)
  const latestContentRef = useRef<{ json: Record<string, unknown>; text: string } | null>(null);
  const latestTitleRef = useRef<string>(options.initialTitle || "Untitled");
  const latestMetadataRef = useRef<Record<string, any> | undefined>(undefined);
  const expectedUpdatedAtRef = useRef<string>(initialUpdatedAt);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null); // For countdown display
  const isOnlineRef = useRef<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const autosaveCountRef = useRef<number>(0); // Track autosaves for version threshold (0 means first save of session)

  // Supabase client (browser)
  const supabaseRef = useRef(createClient());

  // Refs for callbacks to avoid unstable dependencies triggering infinite loops
  const onSaveSuccessRef = useRef(onSaveSuccess);
  const onSaveErrorRef = useRef(onSaveError);
  const onConflictRef = useRef(onConflict);

  // Keep refs in sync with latest props
  useEffect(() => {
    onSaveSuccessRef.current = onSaveSuccess;
    onSaveErrorRef.current = onSaveError;
    onConflictRef.current = onConflict;
  }, [onSaveSuccess, onSaveError, onConflict]);

  // Forward declaration/Ref for executeSave to allow recursion without stale closures
  const executeSaveRef = useRef<any>(null);

  // Execute the actual save
  const executeSave = useCallback(async (
    contentJson: Record<string, unknown>,
    contentText: string,
    expectedUpdatedAt: string,
    title?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    if (!isOnlineRef.current) {
      // Store in IndexedDB for later sync (AC 2.1.2)
      await savePendingToIndexedDB({
        manuscriptId,
        content: { content_json: contentJson, content_text: contentText },
        expectedUpdatedAt,
        timestamp: Date.now(),
        metadata,
      });
      setState((prev) => ({ ...prev, status: "offline", pendingChanges: true }));
      return false;
    }

    setState((prev) => ({ ...prev, status: "saving" }));

    // Generate content hash for deduplication
    const contentHash = await generateContentHash(contentText);

    // Build update input with optional title
    const updateInput: {
      content_json: Record<string, unknown>;
      content_text: string;
      content_hash: string;
      title?: string;
      metadata?: Record<string, any>;
    } = {
      content_json: contentJson,
      content_text: contentText,
      content_hash: contentHash,
    };
    if (title !== undefined) {
      updateInput.title = title;
    }
    if (metadata !== undefined) {
      updateInput.metadata = metadata;
    }

    const result = await updateManuscript(
      supabaseRef.current,
      manuscriptId,
      updateInput,
      expectedUpdatedAt
    );

    if (result.error) {
      if (result.conflictDetected) {
        // SILENT RESOLUTION: If content hash is identical, just sync timestamps and move on
        if (result.serverState?.content_hash === contentHash) {
            console.log("[Autosave] Conflict detected but content is identical. Synchronizing silently.");
            expectedUpdatedAtRef.current = result.serverState.updated_at!;
            
            // Clear from IndexedDB/LocalStorage since it's now synced
            await deletePendingFromIndexedDB(manuscriptId);
            localStorage.removeItem(`bearing_pending_${manuscriptId}`);

            setState({
                status: "saved",
                lastSavedAt: new Date(),
                error: null,
                pendingChanges: false,
                retryCount: 0,
                retryingIn: null,
                maxRetriesExceeded: false,
            });
            return true;
        }

        // Log conflict error
        logSaveError(manuscriptId, "conflict", 409, state.retryCount, result.error);
        setState((prev) => ({ ...prev, status: "conflict", error: result.error, retryingIn: null }));
        onConflictRef.current?.(result.serverState);
        return false;
      }

      // Log the save error with structured data (AC 8.2.4)
      const { type: errorType, statusCode } = classifyError(result.error);
      logSaveError(manuscriptId, errorType, statusCode, state.retryCount + 1, result.error);

      // Retry logic with exponential backoff (AC 8.2.1)
      const currentRetry = state.retryCount + 1;
      if (currentRetry <= maxRetries) {
        // Calculate exponential backoff delay: base * 2^(retry-1), capped at maxRetryDelay
        const delay = Math.min(
          retryDelayMs * Math.pow(2, currentRetry - 1),
          maxRetryDelay
        );
        const delaySeconds = Math.ceil(delay / 1000);

        setState((prev) => ({
          ...prev,
          status: "error",
          error: result.error,
          retryCount: currentRetry,
          retryingIn: delaySeconds,
          maxRetriesExceeded: false,
        }));

        // Store in IndexedDB as backup
        await savePendingToIndexedDB({
          manuscriptId,
          content: { content_json: contentJson, content_text: contentText },
          expectedUpdatedAt,
          timestamp: Date.now(),
          metadata,
        });

        // Clear any existing countdown interval
        if (retryCountdownRef.current) {
          clearInterval(retryCountdownRef.current);
        }

        // Start countdown display (AC 8.2.1 - show "Retrying in Xs...")
        let countdownSeconds = delaySeconds;
        retryCountdownRef.current = setInterval(() => {
          countdownSeconds -= 1;
          if (countdownSeconds > 0) {
            setState((prev) => ({ ...prev, retryingIn: countdownSeconds }));
          } else {
            if (retryCountdownRef.current) {
              clearInterval(retryCountdownRef.current);
              retryCountdownRef.current = null;
            }
          }
        }, 1000);

        // Schedule retry with exponential backoff
        retryTimerRef.current = setTimeout(() => {
          if (retryCountdownRef.current) {
            clearInterval(retryCountdownRef.current);
            retryCountdownRef.current = null;
          }
          executeSaveRef.current?.(contentJson, contentText, expectedUpdatedAt, title, metadata);
        }, delay);

        return false;
      }

      // Max retries exceeded (AC 8.2.2, 8.2.5)
      setState((prev) => ({
        ...prev,
        status: "error",
        error: `Save failed after ${maxRetries} retries: ${result.error}`,
        retryingIn: null,
        maxRetriesExceeded: true,
      }));
      onSaveErrorRef.current?.(result.error);
      return false;
    }

    // Success!
    const newUpdatedAt = result.manuscript!.updated_at;
    expectedUpdatedAtRef.current = newUpdatedAt;

    // Clear from IndexedDB
    await deletePendingFromIndexedDB(manuscriptId);

    // Increment autosave counter and create version snapshot on threshold
    // We create a snapshot on the FIRST save of a session (count=0) OR every X saves
    const currentCount = autosaveCountRef.current;
    if (currentCount === 0 || currentCount >= versionThreshold) {
      // Create version snapshot (non-blocking, don't fail autosave if this fails)
      createVersionSnapshot(
        supabaseRef.current,
        manuscriptId,
        contentJson,
        contentText,
        latestTitleRef.current
      ).catch((err) => {
        console.warn("Failed to create version snapshot:", err);
      });
      autosaveCountRef.current = 1; // Reset to 1 after first/threshold save
    } else {
      autosaveCountRef.current += 1;
    }

    // Clear countdown interval on success
    if (retryCountdownRef.current) {
      clearInterval(retryCountdownRef.current);
      retryCountdownRef.current = null;
    }

    setState({
      status: "saved",
      lastSavedAt: new Date(),
      error: null,
      pendingChanges: false,
      retryCount: 0,
      retryingIn: null,
      maxRetriesExceeded: false,
    });

    onSaveSuccessRef.current?.();
    return true;
  }, [manuscriptId, maxRetries, retryDelayMs, maxRetryDelay, versionThreshold, state.retryCount]);

  // Keep executeSaveRef in sync
  useEffect(() => {
    executeSaveRef.current = executeSave;
  }, [executeSave]);

  // Sync pending saves from IndexedDB or LocalStorage (called on mount and when coming online)
  const syncPendingSaves = useCallback(async () => {
    try {
      // 1. Check IndexedDB (Reliable backup)
      let pending = await getPendingFromIndexedDB(manuscriptId);
      
      // 2. Check LocalStorage (Fast backup for beforeunload)
      if (!pending) {
        const localBackup = localStorage.getItem(`bearing_pending_${manuscriptId}`);
        if (localBackup) {
          try {
            pending = JSON.parse(localBackup);
          } catch (e) {
            console.error("Failed to parse local backup:", e);
          }
        }
      }

      if (pending && isOnlineRef.current) {
        console.log("[Autosave] Syncing pending changes for", manuscriptId);
        // Attempt to save the pending content
        const success = await executeSave(
          pending.content.content_json, 
          pending.content.content_text, 
          pending.expectedUpdatedAt,
          undefined, // Title not persisted in pending save? It seems QueuedSave only has content.
          pending.metadata
        );
        
        if (success) {
          localStorage.removeItem(`bearing_pending_${manuscriptId}`);
        }
      }
    } catch (err) {
      console.error("Error syncing pending saves:", err);
    }
  }, [manuscriptId, executeSave]);

  // Debounced save trigger
  const queueSave = useCallback((
    contentJson: Record<string, unknown>,
    contentText: string,
    title?: string,
    metadata?: Record<string, any>
  ) => {
    // Update latest content
    latestContentRef.current = { json: contentJson, text: contentText };
    if (title !== undefined) {
      latestTitleRef.current = title;
    }
    if (metadata !== undefined) {
      latestMetadataRef.current = metadata;
    }
    setState((prev) => ({ ...prev, pendingChanges: true }));

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer (AC 2.1.1: ≤5 seconds)
    debounceTimerRef.current = setTimeout(() => {
      if (latestContentRef.current) {
        executeSave(
          latestContentRef.current.json,
          latestContentRef.current.text,
          expectedUpdatedAtRef.current,
          latestTitleRef.current,
          latestMetadataRef.current
        );
      }
    }, debounceMs);
  }, [debounceMs, executeSave]);

  // Force immediate save (bypass debounce)
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (latestContentRef.current) {
      return executeSave(
        latestContentRef.current.json,
        latestContentRef.current.text,
        expectedUpdatedAtRef.current,
        latestTitleRef.current,
        latestMetadataRef.current
      );
    }
    return true;
  }, [executeSave]);

  // --- Effects & Event Listeners ---

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // Sync pending saves when coming back online
      syncPendingSaves();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setState((prev) => ({ ...prev, status: "offline" }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingSaves]);

  // Check for pending saves on mount
  useEffect(() => {
    syncPendingSaves();
  }, [syncPendingSaves]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      if (retryCountdownRef.current) {
        clearInterval(retryCountdownRef.current);
      }
    };
  }, []);

  // Save before unload (AC 2.1.2: no data loss)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // If we have unsaved changes, always back them up to localStorage first (it's synchronous)
      if (state.pendingChanges && latestContentRef.current) {
        const saveData: QueuedSave = {
          manuscriptId,
          content: {
            content_json: latestContentRef.current.json,
            content_text: latestContentRef.current.text,
          },
          expectedUpdatedAt: expectedUpdatedAtRef.current,
          timestamp: Date.now(),
          metadata: latestMetadataRef.current,
        };

        try {
          localStorage.setItem(
            `bearing_pending_${manuscriptId}`,
            JSON.stringify(saveData)
          );
        } catch (e) {
          console.error("Failed to emergency save to localStorage:", e);
        }

        // ONLY show the browser warning if we are in a state where we CANNOT save to server
        // (like offline, conflict, or repeated errors).
        // If we are just 'idle' (waiting for debounce) but otherwise healthy, let them go - 
        // the syncPendingSaves will catch it on the next load.
        const needsWarning = state.status === "error" || state.status === "offline" || state.status === "conflict";
        
        if (needsWarning) {
          event.preventDefault();
          event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [manuscriptId, state.pendingChanges, state.status]);

  return {
    state,
    queueSave,
    saveNow,
    syncPendingSaves,
    resetTimestamp: (newTimestamp: string) => {
      expectedUpdatedAtRef.current = newTimestamp;
    }
  };
}

export default useAutosave;


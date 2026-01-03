/**
 * Audit logging utility for auth events
 * Logs events for security monitoring and compliance
 */

export type AuditEventType =
  | 'signup'
  | 'signup_failure'
  | 'email_verified'
  | 'login_success'
  | 'login_failure'
  | 'mfa_enabled'
  | 'mfa_challenge'
  | 'mfa_success'
  | 'mfa_failure'
  | 'mfa_lockout'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'logout';

export interface AuditEvent {
  type: AuditEventType;
  userId?: string;
  email?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 * In production, this should write to a Supabase table or external logging service
 * For now, we log to console in a structured format that can be easily parsed
 */
export function logAuditEvent(
  type: AuditEventType,
  options: {
    userId?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  const event: AuditEvent = {
    type,
    userId: options.userId,
    email: options.email,
    metadata: options.metadata,
    timestamp: new Date().toISOString(),
    // Note: IP and userAgent should be captured on the server side
  };

  // Structured logging for easy parsing
  console.log(JSON.stringify({
    level: 'audit',
    ...event,
  }));

  // In production, you would:
  // 1. Send to a Supabase audit_logs table
  // 2. Or send to an external logging service (e.g., Datadog, Logtail)
}

/**
 * MFA lockout management
 * Tracks failed MFA attempts and enforces lockout after 5 failures
 */
const MFA_LOCKOUT_KEY = 'mfa_lockout_state';
const MAX_MFA_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface MfaLockoutState {
  failedAttempts: number;
  firstFailureAt: number;
  lockedUntil: number | null;
}

function getMfaLockoutState(): MfaLockoutState {
  if (typeof window === 'undefined') {
    return { failedAttempts: 0, firstFailureAt: 0, lockedUntil: null };
  }
  
  try {
    const stored = localStorage.getItem(MFA_LOCKOUT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  
  return { failedAttempts: 0, firstFailureAt: 0, lockedUntil: null };
}

function setMfaLockoutState(state: MfaLockoutState): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(MFA_LOCKOUT_KEY, JSON.stringify(state));
}

/**
 * Check if the account is currently locked out due to MFA failures
 */
export function isAccountLocked(): { locked: boolean; remainingSeconds: number } {
  const state = getMfaLockoutState();
  
  if (state.lockedUntil) {
    const now = Date.now();
    if (now < state.lockedUntil) {
      const remainingMs = state.lockedUntil - now;
      return {
        locked: true,
        remainingSeconds: Math.ceil(remainingMs / 1000),
      };
    }
    // Lockout has expired, reset state
    setMfaLockoutState({ failedAttempts: 0, firstFailureAt: 0, lockedUntil: null });
  }
  
  return { locked: false, remainingSeconds: 0 };
}

/**
 * Record an MFA failure and potentially trigger lockout
 * Returns true if the account is now locked
 */
export function recordMfaFailure(email?: string): boolean {
  const state = getMfaLockoutState();
  const now = Date.now();
  
  // If there was a previous failure window that has expired, reset
  // (using 15 min window for failure tracking as well)
  if (state.firstFailureAt && now - state.firstFailureAt > LOCKOUT_DURATION_MS) {
    state.failedAttempts = 0;
    state.firstFailureAt = 0;
  }
  
  // Record this failure
  if (state.failedAttempts === 0) {
    state.firstFailureAt = now;
  }
  state.failedAttempts += 1;
  
  // Log the MFA failure
  logAuditEvent('mfa_failure', {
    email,
    metadata: { attemptNumber: state.failedAttempts },
  });
  
  // Check if we need to lock
  if (state.failedAttempts >= MAX_MFA_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_DURATION_MS;
    setMfaLockoutState(state);
    
    // Log the lockout event
    logAuditEvent('mfa_lockout', {
      email,
      metadata: {
        failedAttempts: state.failedAttempts,
        lockedUntil: new Date(state.lockedUntil).toISOString(),
      },
    });
    
    return true;
  }
  
  setMfaLockoutState(state);
  return false;
}

/**
 * Reset MFA failure tracking on successful authentication
 */
export function resetMfaFailures(): void {
  setMfaLockoutState({ failedAttempts: 0, firstFailureAt: 0, lockedUntil: null });
}

/**
 * Get remaining MFA attempts before lockout
 */
export function getRemainingMfaAttempts(): number {
  const state = getMfaLockoutState();
  const now = Date.now();
  
  // If the failure window has expired, return max attempts
  if (state.firstFailureAt && now - state.firstFailureAt > LOCKOUT_DURATION_MS) {
    return MAX_MFA_ATTEMPTS;
  }
  
  return Math.max(0, MAX_MFA_ATTEMPTS - state.failedAttempts);
}


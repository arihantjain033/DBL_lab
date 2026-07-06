/**
 * scratchSession.ts
 * -----------------
 * Manages the one-time client-side scratch session lifecycle.
 *
 * State machine:
 *   NEW  →  REGISTERED  →  SCRATCH_READY  →  COMPLETED
 *
 * COMPLETED is a terminal state. Once reached, every protected
 * route redirects to /session-expired.
 *
 * Storage: sessionStorage (auto-cleared on tab close / refresh).
 * The COMPLETED state is additionally written to localStorage so
 * that re-opening the same URL in a new tab also shows the expired
 * page (keyed by phone number for per-user precision).
 */

export type ScratchSessionState =
  | 'NEW'
  | 'REGISTERED'
  | 'SCRATCH_READY'
  | 'COMPLETED';

const SESSION_KEY = 'dbl_session_state';
const COMPLETED_PREFIX = 'dbl_completed_'; // + phone number

// ─── Internal helpers ───────────────────────────────────────────────────────

function getState(): ScratchSessionState {
  return (sessionStorage.getItem(SESSION_KEY) as ScratchSessionState) ?? 'NEW';
}

function setState(s: ScratchSessionState) {
  sessionStorage.setItem(SESSION_KEY, s);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Advance to REGISTERED. Call immediately after successful registration API. */
export function markRegistered() {
  setState('REGISTERED');
}

/** Advance to SCRATCH_READY. Call when navigating to /scratch after registration. */
export function markScratchReady() {
  setState('SCRATCH_READY');
}

/**
 * Advance to COMPLETED.
 * Also persists to localStorage keyed by phone so re-opens in the same
 * browser remember the session was finished.
 */
export function markCompleted(phone?: string) {
  setState('COMPLETED');
  if (phone) {
    try {
      localStorage.setItem(`${COMPLETED_PREFIX}${phone}`, '1');
    } catch {
      // localStorage may be unavailable in some browsers — silently ignore
    }
  }
}

/** Wipe the entire session (use sparingly — only on explicit "start over"). */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Returns the current raw state string. */
export function currentState(): ScratchSessionState {
  return getState();
}

/**
 * Returns true when the session has already been completed.
 * Also checks localStorage so that a completed phone cannot sneak through
 * in a new tab within the same browser session.
 */
export function isCompleted(phone?: string): boolean {
  if (getState() === 'COMPLETED') return true;
  if (phone) {
    try {
      return localStorage.getItem(`${COMPLETED_PREFIX}${phone}`) === '1';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Returns true when the user has at least reached REGISTERED state.
 * Used to guard /scratch from direct URL access.
 */
export function isAtLeastRegistered(): boolean {
  const s = getState();
  return s === 'REGISTERED' || s === 'SCRATCH_READY' || s === 'COMPLETED';
}

/**
 * Returns true when the user has at least reached SCRATCH_READY state.
 * Used to guard the prize reveal from being accessed without scratching.
 */
export function isAtLeastScratchReady(): boolean {
  const s = getState();
  return s === 'SCRATCH_READY' || s === 'COMPLETED';
}

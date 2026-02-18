/**
 * Auth context primitives — context object, types, and reducer.
 *
 * Kept in a plain `.ts` file (no JSX) so that:
 * - `AuthContext.tsx` can export only the `AuthProvider` component.
 * - `hooks/useAuth.ts` can import `AuthContext` without triggering the
 *   `react-refresh/only-export-components` lint rule.
 *
 * @module
 */

import { createContext } from "react";

// ---------------------------------------------------------------------------
// User type
// ---------------------------------------------------------------------------

/**
 * Authenticated user returned by `GET /api/v1/auth/me`.
 *
 * Mirrors the backend `UserResponse` Pydantic schema in
 * `app/schemas/auth.py`.
 *
 * TODO: Replace with the generated `UserResponse` from `@/lib/api/types.gen`
 * once `task generate:client` has been run with the auth routes live:
 *   import type { UserResponse as User } from "@/lib/api/types.gen";
 */
export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Shape of the auth state held in the reducer. */
export interface AuthState {
  /** The authenticated user, or `null` when unauthenticated. */
  user: User | null;
  /**
   * `true` while the initial session check (`GET /auth/me`) is in-flight.
   * Components should show a loading skeleton instead of a redirect during
   * this window to avoid a flash of the login page on refresh.
   */
  isLoading: boolean;
  /** Non-null when the last login attempt failed. Cleared on next login call. */
  error: string | null;
}

/** Initial reducer state — starts loading so the session check runs on mount. */
export const initialAuthState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Actions that can be dispatched to the auth reducer. */
export type AuthAction =
  | { type: "SESSION_LOADING" }
  | { type: "SESSION_RESOLVED"; user: User | null }
  | { type: "LOGIN_SUCCESS"; user: User }
  | { type: "LOGIN_FAILURE"; error: string }
  | { type: "LOGOUT" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Pure reducer for auth state transitions.
 *
 * @param state  - Current auth state.
 * @param action - Dispatched action.
 * @returns Updated auth state.
 */
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SESSION_LOADING":
      return { ...state, isLoading: true, error: null };

    case "SESSION_RESOLVED":
      return { ...state, isLoading: false, user: action.user, error: null };

    case "LOGIN_SUCCESS":
      return { user: action.user, isLoading: false, error: null };

    case "LOGIN_FAILURE":
      return { ...state, isLoading: false, error: action.error };

    case "LOGOUT":
      return { user: null, isLoading: false, error: null };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

/** Public interface exposed via {@link AuthContext}. */
export interface AuthContextValue extends AuthState {
  /** `true` when `user` is non-null. Convenience alias for `user !== null`. */
  isAuthenticated: boolean;
  /**
   * Authenticate with email + password.
   *
   * On success the backend sets the `access_token` httpOnly cookie and this
   * function updates the context with the resolved user. On failure the
   * `error` field is populated.
   *
   * @param email    - User email address.
   * @param password - Plain-text password (transmitted over HTTPS only).
   * @returns `true` on success, `false` on failure.
   */
  login: (email: string, password: string) => Promise<boolean>;
  /**
   * End the current session.
   *
   * Calls `POST /auth/logout` to clear the httpOnly cookie server-side, then
   * resets local auth state. Safe to call even when unauthenticated.
   */
  logout: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context object
// ---------------------------------------------------------------------------

/**
 * React context that holds the current auth state and actions.
 *
 * Do **not** consume this directly — use {@link useAuthContext} from
 * `@/hooks/useAuth` instead.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

AuthContext.displayName = "AuthContext";

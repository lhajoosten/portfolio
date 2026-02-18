/**
 * Authentication provider for the Portfolio application.
 *
 * Provides global auth state (current user, loading flag) and actions
 * (login, logout) to the entire React tree via {@link AuthProvider}.
 *
 * ## Strategy
 *
 * Auth is **cookie-based**: the backend sets an httpOnly `access_token`
 * cookie on `POST /auth/login`. The browser attaches it automatically on
 * every subsequent same-origin request — no token management in JavaScript.
 *
 * On mount, `AuthProvider` calls `GET /auth/me` to determine whether a
 * valid session cookie already exists (e.g. after a page refresh). If the
 * request succeeds the user is considered authenticated; if it returns 401
 * the user is unauthenticated.
 *
 * ## Usage
 *
 * ```tsx
 * // Wrap the app (done in main.tsx):
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 *
 * // Consume in any component:
 * import { useAuthContext } from "@/hooks/useAuth";
 * const { user, isAuthenticated, login, logout } = useAuthContext()
 * ```
 *
 * @module
 */

import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react";

import { getErrorMessage } from "@/lib/errors";

import {
  AuthContext,
  authReducer,
  initialAuthState,
  type AuthContextValue,
  type User,
} from "./authContext";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Mount this once at the top of the React tree (in `main.tsx`).
 *
 * On mount it silently calls `GET /api/v1/auth/me` to restore a session
 * from an existing httpOnly cookie. Once the check resolves (success or 401)
 * `isLoading` becomes `false` and child components render.
 *
 * @example
 * ```tsx
 * // main.tsx
 * createRoot(document.getElementById("root")!).render(
 *   <StrictMode>
 *     <QueryClientProvider client={queryClient}>
 *       <AuthProvider>
 *         <RouterProvider router={router} />
 *       </AuthProvider>
 *     </QueryClientProvider>
 *   </StrictMode>
 * )
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // ── Session restore on mount ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      dispatch({ type: "SESSION_LOADING" });
      try {
        const res = await fetch("/api/v1/auth/me", {
          credentials: "include",
        });

        if (cancelled) return;

        if (res.ok) {
          const user = (await res.json()) as User;
          dispatch({ type: "SESSION_RESOLVED", user });
        } else {
          // 401 / 403 — no valid session cookie
          dispatch({ type: "SESSION_RESOLVED", user: null });
        }
      } catch {
        if (!cancelled) {
          // Network error — treat as unauthenticated, don't block the UI
          dispatch({ type: "SESSION_RESOLVED", user: null });
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: "SESSION_LOADING" });
    try {
      const loginRes = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const body = (await loginRes.json().catch(() => ({}))) as {
          detail?: string;
        };
        dispatch({
          type: "LOGIN_FAILURE",
          error: body.detail ?? "Login failed — please check your credentials.",
        });
        return false;
      }

      // Cookie is now set by the browser. Fetch the full user profile.
      const meRes = await fetch("/api/v1/auth/me", { credentials: "include" });
      if (!meRes.ok) {
        dispatch({ type: "LOGIN_FAILURE", error: "Session could not be confirmed after login." });
        return false;
      }

      const user = (await meRes.json()) as User;
      dispatch({ type: "LOGIN_SUCCESS", user });
      return true;
    } catch (err) {
      dispatch({ type: "LOGIN_FAILURE", error: getErrorMessage(err) });
      return false;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Swallow network errors — we still clear local state so the user
      // isn't stuck in an authenticated-looking UI.
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  // ── Context value (memoised to prevent unnecessary re-renders) ───────────

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.user !== null,
      login,
      logout,
    }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

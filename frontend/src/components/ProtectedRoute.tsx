/**
 * Route guard that redirects unauthenticated visitors to `/login`.
 *
 * Wraps any route component that requires an active session. During the
 * initial session check (the `GET /auth/me` call fired by {@link AuthProvider}
 * on mount) a neutral loading skeleton is rendered instead of the protected
 * content — this prevents a flash-redirect to `/login` on page refresh when
 * the user actually has a valid session cookie.
 *
 * ## Usage with TanStack Router
 *
 * ```tsx
 * // In a route file:
 * export const Route = createFileRoute("/admin")({
 *   component: () => (
 *     <ProtectedRoute>
 *       <AdminPage />
 *     </ProtectedRoute>
 *   ),
 * })
 *
 * // Superuser-only:
 * export const Route = createFileRoute("/admin/projects")({
 *   component: () => (
 *     <ProtectedRoute requireSuperuser>
 *       <AdminProjectsPage />
 *     </ProtectedRoute>
 *   ),
 * })
 * ```
 *
 * @module
 */

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useAuthContext } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProtectedRouteProps {
  /** The protected content to render when the user is authorised. */
  children: ReactNode;
  /**
   * When `true`, the route additionally requires `user.is_superuser === true`.
   * A regular authenticated user is redirected to `/` (not `/login`).
   * Defaults to `false`.
   */
  requireSuperuser?: boolean;
  /**
   * Path to redirect unauthenticated visitors to.
   * Defaults to `"/login"`.
   */
  redirectTo?: string;
  /**
   * Path to redirect authenticated non-superusers to when `requireSuperuser`
   * is `true`. Defaults to `"/"`.
   */
  forbiddenRedirectTo?: string;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

/**
 * Neutral full-page skeleton shown while the session check is in-flight.
 * Prevents a visible flash-redirect to `/login` on refresh for authenticated
 * users.
 */
function SessionCheckSkeleton() {
  return (
    <div
      aria-label="Checking session…"
      role="status"
      className="flex min-h-[60vh] items-center justify-center"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
        <p className="font-mono text-xs text-zinc-500">Checking session…</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------

/**
 * Guards a route behind authentication (and optionally superuser) checks.
 *
 * Rendering behaviour:
 *
 * | Auth state | `requireSuperuser` | Renders |
 * |---|---|---|
 * | `isLoading = true` | any | {@link SessionCheckSkeleton} |
 * | unauthenticated | any | redirect → `redirectTo` (`/login`) |
 * | authenticated, not superuser | `true` | redirect → `forbiddenRedirectTo` (`/`) |
 * | authenticated, superuser | `true` | `children` |
 * | authenticated | `false` | `children` |
 *
 * @param props - See {@link ProtectedRouteProps}.
 *
 * @example
 * ```tsx
 * // Any authenticated user:
 * <ProtectedRoute>
 *   <ProfilePage />
 * </ProtectedRoute>
 *
 * // Superuser only:
 * <ProtectedRoute requireSuperuser>
 *   <AdminDashboard />
 * </ProtectedRoute>
 *
 * // Custom redirect:
 * <ProtectedRoute redirectTo="/auth/signin">
 *   <SettingsPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requireSuperuser = false,
  redirectTo = "/login",
  forbiddenRedirectTo = "/",
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while the session check is still in-flight — wait for
    // isLoading to settle so we don't flash-redirect on page refresh.
    if (isLoading) return;

    if (!isAuthenticated) {
      void navigate({ to: redirectTo, replace: true });
      return;
    }

    if (requireSuperuser && !user?.is_superuser) {
      void navigate({ to: forbiddenRedirectTo, replace: true });
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    requireSuperuser,
    redirectTo,
    forbiddenRedirectTo,
    navigate,
  ]);

  // ── Render decision ──────────────────────────────────────────────────────

  // Session check still in-flight — show skeleton to avoid flash-redirect
  if (isLoading) {
    return <SessionCheckSkeleton />;
  }

  // Not authenticated — useEffect will navigate; render nothing meanwhile
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated but lacks superuser privilege — useEffect will navigate
  if (requireSuperuser && !user?.is_superuser) {
    return null;
  }

  // All checks passed — render the protected content
  return <>{children}</>;
}

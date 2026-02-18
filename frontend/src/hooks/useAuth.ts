/**
 * `useAuthContext` hook — consumes the {@link AuthContext} created by
 * {@link AuthProvider}.
 *
 * Kept in its own file so that the `react-refresh/only-export-components`
 * rule is satisfied: hook files export a single non-component value, and
 * component files export only components.
 *
 * @module
 */

import { useContext } from "react";

import { AuthContext, type AuthContextValue } from "@/contexts/authContext";

/**
 * Consume the auth context.
 *
 * Must be called from a component that is a descendant of {@link AuthProvider}.
 *
 * @returns The current {@link AuthContextValue}.
 * @throws {Error} When called outside of an `AuthProvider` tree.
 *
 * @example
 * ```tsx
 * function NavBar() {
 *   const { user, isAuthenticated, logout } = useAuthContext()
 *
 *   if (!isAuthenticated) return <Link to="/login">Sign in</Link>
 *
 *   return (
 *     <div>
 *       <span>{user.email}</span>
 *       <button onClick={() => void logout()}>Sign out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuthContext must be used inside <AuthProvider>.");
  }
  return ctx;
}

/**
 * `LoadingState` and `ErrorState` — shared inline feedback primitives.
 *
 * Deduplicates the ad-hoc loading and error paragraphs that were copy-pasted
 * into every route component.  Both components are intentionally minimal —
 * they are designed to be dropped inside a {@link PageContainer} as an early
 * return, not as full-page overlays.
 *
 * For full-page error handling (render errors, unhandled rejections) use
 * {@link ErrorBoundary} + {@link DefaultErrorFallback} instead.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// LoadingState
// ---------------------------------------------------------------------------

export interface LoadingStateProps {
  /**
   * Message to display while content is loading.
   * Defaults to `"Loading…"`.
   */
  message?: string;
}

/**
 * Inline loading placeholder.
 *
 * Renders a single mono-font paragraph in the muted colour.  Intended as an
 * early-return inside a route component while its query is still pending.
 *
 * @example
 * ```tsx
 * function ProjectsPage() {
 *   const { data: projects = [], isLoading, error } = useProjects();
 *
 *   if (isLoading) {
 *     return (
 *       <PageContainer>
 *         <LoadingState message="Loading projects…" />
 *       </PageContainer>
 *     );
 *   }
 *   // ...
 * }
 * ```
 */
export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return (
    <p
      aria-live="polite"
      aria-busy="true"
      style={{
        color: "var(--muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        margin: 0,
      }}
    >
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// ErrorState
// ---------------------------------------------------------------------------

export interface ErrorStateProps {
  /**
   * Human-readable error message shown to the user.
   * Defaults to `"Something went wrong."`.
   */
  message?: string;
}

/**
 * Inline error placeholder.
 *
 * Renders a single mono-font paragraph in the danger colour.  Intended as an
 * early-return inside a route component when its query has failed.
 *
 * @example
 * ```tsx
 * function ProjectsPage() {
 *   const { data: projects = [], isLoading, error } = useProjects();
 *
 *   if (error) {
 *     return (
 *       <PageContainer>
 *         <ErrorState message="Failed to load projects." />
 *       </PageContainer>
 *     );
 *   }
 *   // ...
 * }
 * ```
 */
export function ErrorState({ message = "Something went wrong." }: ErrorStateProps) {
  return (
    <p
      role="alert"
      style={{
        color: "var(--danger)",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        margin: 0,
      }}
    >
      {message}
    </p>
  );
}

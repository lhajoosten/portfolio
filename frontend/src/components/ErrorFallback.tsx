/**
 * Default error fallback UI rendered by {@link ErrorBoundary} when no custom
 * `fallback` prop is provided.
 *
 * Kept in its own file so that `ErrorBoundary.tsx` exports only a single
 * class component and satisfies the `react-refresh/only-export-components`
 * lint rule.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-page error card shown when an unhandled render error is caught.
 *
 * Displays a brief user-facing message and, in development, an expandable
 * `<details>` block with the raw error message and stack trace.
 *
 * @param error - The caught `Error` instance.
 * @param reset - Callback that clears the error boundary state so the tree
 *                is re-rendered from scratch.
 */
export function DefaultErrorFallback({ error, reset }: DefaultErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-6 py-24 text-center"
    >
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-800 bg-red-950/50">
        <svg
          className="h-8 w-8 text-red-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-zinc-100">Something went wrong</h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          An unexpected error occurred while rendering this page.
        </p>
      </div>

      {/* Error details — dev only */}
      {import.meta.env.DEV && (
        <details className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-left">
          <summary className="cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-200">
            Error details (dev only)
          </summary>
          <pre className="mt-3 overflow-x-auto text-xs whitespace-pre-wrap text-red-400">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

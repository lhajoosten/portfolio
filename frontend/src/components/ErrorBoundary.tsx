/**
 * React class-based error boundary.
 *
 * Catches render-time errors thrown by any descendant component and renders
 * a fallback UI instead of an empty/crashed page.
 *
 * `DefaultErrorFallback` lives in `./ErrorFallback` so that this file exports
 * only a single class component and satisfies the
 * `react-refresh/only-export-components` lint rule.
 *
 * @module
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

import { DefaultErrorFallback } from "./ErrorFallback";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  /** Content to render when no error has occurred. */
  children: ReactNode;
  /**
   * Optional custom fallback UI. Receives the error and a reset callback.
   * Defaults to {@link DefaultErrorFallback}.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Called whenever an error is caught — useful for error reporting services. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * React class-based error boundary.
 *
 * Catches render-time errors thrown by any descendant component and renders
 * a fallback UI instead of an empty/crashed page.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyFeature />
 * </ErrorBoundary>
 *
 * // With custom fallback:
 * <ErrorBoundary fallback={(err, reset) => <MyFallback error={err} onReset={reset} />}>
 *   <MyFeature />
 * </ErrorBoundary>
 * ```
 *
 * Note: Error boundaries do NOT catch errors in:
 * - Event handlers (use try/catch or `useApiError` instead)
 * - Async code (e.g. `setTimeout`, `fetch`)
 * - Server-side rendering
 * - Errors thrown inside the error boundary itself
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);

    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
    }
  }

  reset(): void {
    this.setState({ error: null });
  }

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error !== null) {
      if (fallback) {
        return fallback(error, this.reset);
      }
      return <DefaultErrorFallback error={error} reset={this.reset} />;
    }

    return children;
  }
}

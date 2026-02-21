/**
 * `PageContainer` — standard page layout wrapper.
 *
 * Eliminates the duplicated `maxWidth / margin / padding` pattern that was
 * copy-pasted into every route component.  All public-facing pages must wrap
 * their content in this component instead of repeating the layout inline.
 *
 * @module
 */

import type { CSSProperties, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageContainerProps {
  /** Page content. */
  children: ReactNode;
  /**
   * When `true`, constrains the max-width to `720px` (article / prose width).
   * When `false` (default), uses the standard `1280px` wide layout.
   */
  narrow?: boolean;
  /**
   * Optional style overrides applied to the outer wrapper `<div>`.
   * Use sparingly — prefer the `narrow` prop for width changes.
   */
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIDE_MAX = "1280px";
const NARROW_MAX = "720px";

const BASE_PADDING = "64px 48px 120px";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Centred max-width container for page-level content.
 *
 * Provides consistent horizontal padding and top/bottom spacing so every
 * page has the same breathing room without repeating the values.
 *
 * @example
 * ```tsx
 * // Standard wide layout (projects, blog list, certifications):
 * function ProjectsPage() {
 *   return (
 *     <PageContainer>
 *       <PageHeader eyebrow="Work" title="Projects" />
 *       ...
 *     </PageContainer>
 *   );
 * }
 *
 * // Narrow article layout (blog post, project detail body):
 * function PostDetailPage() {
 *   return (
 *     <PageContainer narrow>
 *       <article className="prose-portfolio">...</article>
 *     </PageContainer>
 *   );
 * }
 *
 * // Override padding for a loading/error state:
 * <PageContainer style={{ paddingBottom: "64px" }}>
 *   <LoadingState />
 * </PageContainer>
 * ```
 */
export function PageContainer({ children, narrow = false, style }: PageContainerProps) {
  return (
    <div
      style={{
        maxWidth: narrow ? NARROW_MAX : WIDE_MAX,
        margin: "0 auto",
        padding: BASE_PADDING,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * `SidebarCard` — labelled sidebar card primitive.
 *
 * Renders a surface card with a monospaced header bar and a content area.
 * Deduplicates the sidebar card pattern that was previously re-implemented
 * independently in `about.tsx` and `projects/$slug.lazy.tsx`.
 *
 * @module
 */

import type { CSSProperties, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SidebarCardProps {
  /** Label shown in the header bar (rendered uppercase in mono font). */
  title: string;
  /** Card body content — any React nodes. */
  children: ReactNode;
  /**
   * Optional extra styles applied to the content area `<div>`.
   * Use this to override the default flex-wrap chip layout when the card
   * body needs a different arrangement (e.g. a vertical link list).
   */
  contentStyle?: CSSProperties;
  /** Optional extra bottom margin override. Defaults to `"16px"`. */
  marginBottom?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Labelled card used in sidebars on the About and Project detail pages.
 *
 * The header bar always uses the mono font at 11 px uppercase to match the
 * design system. The content area uses a flex-wrap layout by default, which
 * suits chip/tag grids. Pass `contentStyle` to override when needed.
 *
 * @example
 * ```tsx
 * // Chip grid (default layout):
 * <SidebarCard title="Tech Stack">
 *   <TagPill label="Python" variant="lime" size="md" />
 *   <TagPill label="FastAPI" variant="blue" size="md" />
 * </SidebarCard>
 *
 * // Vertical link list (custom content layout):
 * <SidebarCard title="Links" contentStyle={{ flexDirection: "column", gap: "10px" }}>
 *   <a href="https://github.com/...">GitHub</a>
 * </SidebarCard>
 * ```
 */
export function SidebarCard({
  title,
  children,
  contentStyle,
  marginBottom = "16px",
}: SidebarCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        marginBottom,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {title}
      </div>

      {/* Content area */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

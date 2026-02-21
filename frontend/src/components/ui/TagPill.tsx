/**
 * `TagPill` — primitive tag/badge chip component.
 *
 * The single shared implementation of coloured tag pills used across the
 * Projects, Blog, Certifications, and About pages.  All routes must import
 * this component instead of defining their own inline tag spans.
 *
 * Variant colours are driven by {@link TAG_STYLES} from `@/lib/tags` so the
 * colour system has one source of truth.
 *
 * @module
 */

import type { CSSProperties } from "react";

import { TAG_STYLES, type TagVariant } from "@/lib/tags";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TagPillProps {
  /** The text label to display inside the pill. */
  label: string;
  /** Visual colour variant — see {@link TagVariant}. */
  variant: TagVariant;
  /**
   * Size of the pill.
   * - `"sm"` — 10 px font, used in card thumbnails and list grids.
   * - `"md"` — 11 px font, used in sidebar chip lists and detail pages.
   * Defaults to `"sm"`.
   */
  size?: "sm" | "md";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE_STYLES: Record<"sm" | "md", CSSProperties> = {
  sm: {
    fontSize: "10px",
    padding: "3px 8px",
    borderRadius: "3px",
    letterSpacing: "0.06em",
  },
  md: {
    fontSize: "11px",
    padding: "5px 12px",
    borderRadius: "4px",
    letterSpacing: "0.04em",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Inline coloured tag chip.
 *
 * @example
 * ```tsx
 * <TagPill label="RAG" variant="lime" />
 * <TagPill label="FastAPI" variant="blue" size="md" />
 * <TagPill label="Featured" variant="lime" />
 * ```
 */
export function TagPill({ label, variant, size = "sm" }: TagPillProps) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...SIZE_STYLES[size],
        ...TAG_STYLES[variant],
      }}
    >
      {label}
    </span>
  );
}

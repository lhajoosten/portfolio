/**
 * `PageHeader` — standard section header for list pages.
 *
 * Eliminates the duplicated eyebrow + h1 + side-description layout that was
 * copy-pasted into the Projects, Blog, and Certifications pages.
 *
 * Layout:
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │  EYEBROW (mono, uppercase, accent)                  │
 * │  Title (display font, 52px)          Description    │
 * └─────────────────────────────────────────────────────┘
 * ```
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageHeaderProps {
  /**
   * Short label rendered above the title in the mono font (e.g. "Work",
   * "Writing", "Credentials").  Displayed in uppercase accent colour.
   */
  eyebrow: string;
  /**
   * Primary page title rendered with the display font at 52 px.
   */
  title: string;
  /**
   * Optional short descriptive text shown to the right of the title.
   * Keep under ~40 words so it fits the fixed 320 px column.
   */
  description?: string;
  /**
   * Bottom margin applied to the header wrapper.
   * Defaults to `"56px"` which matches the original page designs.
   */
  marginBottom?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Consistent two-column page header for list / index pages.
 *
 * Left column: eyebrow label + large display title.
 * Right column: optional short description paragraph (max-width 320 px).
 *
 * @example
 * ```tsx
 * // Projects page
 * <PageHeader
 *   eyebrow="Work"
 *   title="Projects"
 *   description="Production systems, research experiments, and open-source tools."
 * />
 *
 * // Blog page
 * <PageHeader
 *   eyebrow="Writing"
 *   title="The Blog"
 *   description="Thoughts on AI / LLM engineering and building things that matter."
 * />
 *
 * // No description (About page header):
 * <PageHeader eyebrow="Background" title="About Me" />
 * ```
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  marginBottom = "56px",
}: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom,
      }}
    >
      {/* Left — eyebrow + title */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: "12px",
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "52px",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right — description */}
      {description && (
        <p
          style={{
            maxWidth: "320px",
            color: "var(--muted)",
            fontSize: "15px",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

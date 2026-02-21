/**
 * `components/ui` — design system primitives barrel export.
 *
 * All shared UI primitives live in this directory and are re-exported here
 * so that consuming files can import from the single path `@/components/ui`
 * instead of reaching into individual files.
 *
 * ## What belongs here
 *
 * Primitive, reusable, **domain-agnostic** components that appear in more
 * than one route or feature.  Examples: layout wrappers, typography helpers,
 * feedback states, tag chips, card shells.
 *
 * ## What does NOT belong here
 *
 * Domain-specific components (e.g. `ProjectCard`, `CertCard`) live in
 * `src/components/` next to the feature they belong to, NOT in this directory.
 *
 * @module
 */

// Layout
export { PageContainer } from "./PageContainer";
export type { PageContainerProps } from "./PageContainer";

export { PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";

export { SidebarCard } from "./SidebarCard";
export type { SidebarCardProps } from "./SidebarCard";

// Feedback
export { LoadingState, ErrorState } from "./LoadingState";
export type { LoadingStateProps, ErrorStateProps } from "./LoadingState";

// Tags
export { TagPill } from "./TagPill";
export type { TagPillProps } from "./TagPill";

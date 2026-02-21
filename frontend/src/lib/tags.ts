/**
 * Shared tag/pill variant utilities.
 *
 * Single source of truth for the tag colour system used across Projects,
 * Blog, Certifications, and the About page.  All components that render
 * coloured tag chips must import from here instead of defining their own
 * local style maps.
 *
 * @module
 */

import type { CSSProperties } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The four visual variants available for tag pills.
 *
 * | Variant | Meaning                     | Colour          |
 * |---------|-----------------------------|-----------------|
 * | lime    | AI / LLM related tags       | accent green    |
 * | blue    | Core tech stack tags        | indigo / violet |
 * | red     | Other / misc tags           | muted red       |
 * | gray    | Neutral / structural tags   | muted gray      |
 */
export type TagVariant = "lime" | "blue" | "red" | "gray";

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

/**
 * CSS style objects for each {@link TagVariant}.
 *
 * Applied to the span element of a tag pill.  Each entry sets `background`,
 * `color`, and `border` so callers only need to spread the map entry.
 */
export const TAG_STYLES: Record<TagVariant, CSSProperties> = {
  lime: {
    background: "rgba(200,255,71,0.1)",
    color: "var(--accent)",
    border: "1px solid rgba(200,255,71,0.2)",
  },
  blue: {
    background: "rgba(61,90,254,0.15)",
    color: "#818cf8",
    border: "1px solid rgba(61,90,254,0.25)",
  },
  red: {
    background: "rgba(255,77,77,0.1)",
    color: "#ff8080",
    border: "1px solid rgba(255,77,77,0.2)",
  },
  gray: {
    background: "rgba(255,255,255,0.04)",
    color: "var(--muted)",
    border: "1px solid var(--border)",
  },
};

// ---------------------------------------------------------------------------
// Tag classification
// ---------------------------------------------------------------------------

/**
 * Tags that map to the **lime** (AI/LLM) variant.
 *
 * Keep this list lower-case — {@link getTagVariant} normalises the input.
 */
const AI_TAGS = [
  "ai",
  "llm",
  "rag",
  "openai",
  "langchain",
  "langgraph",
  "mcp",
  "gpt",
  "embeddings",
  "agents",
] as const satisfies readonly string[];

/**
 * Tags that map to the **blue** (tech stack) variant.
 *
 * Keep this list lower-case — {@link getTagVariant} normalises the input.
 */
const TECH_TAGS = [
  "fastapi",
  "python",
  "react",
  "typescript",
  "postgres",
  "pgvector",
  "docker",
  "vite",
  "tanstack",
  "sqlalchemy",
  "alembic",
] as const satisfies readonly string[];

// ---------------------------------------------------------------------------
// getTagVariant
// ---------------------------------------------------------------------------

/**
 * Derive a {@link TagVariant} from a tag string.
 *
 * Classification rules (checked in order):
 * 1. Tag is in the AI/LLM list → `"lime"`
 * 2. Tag is in the tech stack list → `"blue"`
 * 3. Everything else → `"gray"`
 *
 * The comparison is **case-insensitive** — `"FastAPI"` and `"fastapi"` both
 * resolve to `"blue"`.
 *
 * @param tag - The raw tag string (any case).
 * @returns The variant to use when rendering the tag pill.
 *
 * @example
 * getTagVariant("RAG")        // → "lime"
 * getTagVariant("FastAPI")    // → "blue"
 * getTagVariant("Finance")    // → "gray"
 */
export function getTagVariant(tag: string): TagVariant {
  const lower = tag.toLowerCase();
  if ((AI_TAGS as readonly string[]).includes(lower)) return "lime";
  if ((TECH_TAGS as readonly string[]).includes(lower)) return "blue";
  return "gray";
}

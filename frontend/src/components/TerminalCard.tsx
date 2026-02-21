/**
 * `TerminalCard` — decorative fake terminal / code editor widget.
 *
 * Renders a mock Python snippet with syntax highlighting to illustrate the
 * technology stack on the home page hero section.  Extracted from
 * `routes/index.tsx` so that the home page component stays focused on layout
 * and the terminal data lives in one dedicated file.
 *
 * @module
 */

import { TagPill } from "@/components/ui/TagPill";
import type { TagVariant } from "@/lib/tags";

// ---------------------------------------------------------------------------
// Token types for syntax highlighting
// ---------------------------------------------------------------------------

type TokenType = "kw" | "str" | "fn" | "cm" | "num" | "plain";

interface CodeToken {
  type: TokenType;
  text: string;
}

interface CodeLine {
  tokens: CodeToken[];
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const CODE_LINES: CodeLine[] = [
  { tokens: [{ type: "cm", text: "# ── Stack ──────────────────────────────" }] },
  {
    tokens: [
      { type: "kw", text: "stack" },
      { type: "plain", text: " = {" },
    ],
  },
  {
    tokens: [
      { type: "plain", text: '  "' },
      { type: "str", text: "backend" },
      { type: "plain", text: '": [' },
      { type: "str", text: '"FastAPI"' },
      { type: "plain", text: ", " },
      { type: "str", text: '"Python 3.12"' },
      { type: "plain", text: "]," },
    ],
  },
  {
    tokens: [
      { type: "plain", text: '  "' },
      { type: "str", text: "ai" },
      { type: "plain", text: '": [' },
      { type: "str", text: '"LangChain"' },
      { type: "plain", text: ", " },
      { type: "str", text: '"LangGraph"' },
      { type: "plain", text: ", " },
      { type: "str", text: '"Claude"' },
      { type: "plain", text: "]," },
    ],
  },
  {
    tokens: [
      { type: "plain", text: '  "' },
      { type: "str", text: "data" },
      { type: "plain", text: '": [' },
      { type: "str", text: '"pgvector"' },
      { type: "plain", text: ", " },
      { type: "str", text: '"RAG"' },
      { type: "plain", text: ", " },
      { type: "str", text: '"MCP"' },
      { type: "plain", text: "]," },
    ],
  },
  {
    tokens: [
      { type: "plain", text: '  "' },
      { type: "str", text: "frontend" },
      { type: "plain", text: '": [' },
      { type: "str", text: '"React 19"' },
      { type: "plain", text: ", " },
      { type: "str", text: '"TypeScript"' },
      { type: "plain", text: "]," },
    ],
  },
  { tokens: [{ type: "plain", text: "}" }] },
  { tokens: [{ type: "plain", text: " " }] },
  { tokens: [{ type: "cm", text: "# ── Current focus ──────────────────────" }] },
  {
    tokens: [
      { type: "kw", text: "async def" },
      { type: "plain", text: " " },
      { type: "fn", text: "ship" },
      { type: "plain", text: "():" },
    ],
  },
  {
    tokens: [
      { type: "plain", text: "  " },
      { type: "kw", text: "await" },
      { type: "plain", text: " " },
      { type: "fn", text: "build_rag_pipeline" },
      { type: "plain", text: "()" },
    ],
  },
  {
    tokens: [
      { type: "plain", text: "  " },
      { type: "kw", text: "await" },
      { type: "plain", text: " " },
      { type: "fn", text: "orchestrate_agents" },
      { type: "plain", text: "(" },
    ],
  },
  {
    tokens: [
      { type: "plain", text: "    framework=" },
      { type: "str", text: '"LangGraph"' },
      { type: "plain", text: "," },
    ],
  },
  {
    tokens: [
      { type: "plain", text: "    model=" },
      { type: "str", text: '"claude-sonnet-4-5"' },
      { type: "plain", text: "," },
    ],
  },
  {
    tokens: [
      { type: "plain", text: "    tools=" },
      { type: "num", text: "∞" },
      { type: "plain", text: "," },
    ],
  },
  { tokens: [{ type: "plain", text: "  )" }] },
];

const TOKEN_COLORS: Record<TokenType, string> = {
  kw: "#a78bfa",
  str: "var(--accent)",
  fn: "#60a5fa",
  cm: "#3d3d44",
  num: "#f97316",
  plain: "var(--muted)",
};

const CHIPS: Array<{ label: string; variant: TagVariant }> = [
  { label: "FastAPI", variant: "blue" },
  { label: "LangChain", variant: "lime" },
  { label: "LangGraph", variant: "lime" },
  { label: "React 19", variant: "blue" },
  { label: "pgvector", variant: "blue" },
  { label: "Claude", variant: "lime" },
  { label: "Python 3.12", variant: "gray" },
  { label: "MCP", variant: "gray" },
];

// ---------------------------------------------------------------------------
// Title bar dots
// ---------------------------------------------------------------------------

const DOTS: Array<{ color: string }> = [
  { color: "#ff5f57" },
  { color: "#febc2e" },
  { color: "#28c840" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Decorative mock terminal card showing a snippet of the tech stack.
 *
 * Used exclusively in the home page hero section.  Contains no dynamic
 * data — all content is static and intentionally stylised, not a real
 * REPL or live code runner.
 *
 * @example
 * ```tsx
 * // Inside the hero section of the home page:
 * <TerminalCard />
 * ```
 */
export function TerminalCard() {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Title bar ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        {DOTS.map(({ color }) => (
          <div
            key={color}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
            }}
          />
        ))}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--muted)",
            marginLeft: "auto",
            marginRight: "auto",
            letterSpacing: "0.06em",
          }}
        >
          profile.py
        </span>
      </div>

      {/* ── Code body ───────────────────────────────────────── */}
      <div style={{ padding: "28px" }}>
        {CODE_LINES.map((line, lineIndex) => (
          <div
            key={lineIndex}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              lineHeight: 2,
            }}
          >
            {line.tokens.map((token, tokenIndex) => (
              <span key={tokenIndex} style={{ color: TOKEN_COLORS[token.type] }}>
                {token.text}
              </span>
            ))}
          </div>
        ))}

        {/* ── Skill chips ─────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "24px",
          }}
        >
          {CHIPS.map(({ label, variant }) => (
            <TagPill key={label} label={label} variant={variant} size="md" />
          ))}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { PageContainer, PageHeader, SidebarCard, TagPill } from "@/components/ui";
import type { TagVariant } from "@/lib/tags";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const STACK_CHIPS: Array<{ label: string; variant: TagVariant }> = [
  { label: "Python 3.12", variant: "lime" },
  { label: "FastAPI", variant: "lime" },
  { label: "React 19", variant: "blue" },
  { label: "TypeScript", variant: "blue" },
  { label: "PostgreSQL", variant: "gray" },
  { label: "pgvector", variant: "gray" },
  { label: "OpenAI", variant: "gray" },
  { label: "Docker", variant: "gray" },
];

const SOCIAL_LINKS = [
  { href: "https://github.com/lhajoosten", label: "GitHub", icon: "📦" },
  { href: "https://linkedin.com/in/lhajoosten", label: "LinkedIn", icon: "💼" },
  { href: "mailto:luc@hajoosten.nl", label: "Email", icon: "✉️" },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AboutPage() {
  return (
    <PageContainer>
      {/* Header */}
      <div style={{ marginBottom: "64px" }}>
        <PageHeader eyebrow="Background" title="About Me" marginBottom="20px" />
        <p
          style={{
            fontSize: "18px",
            color: "var(--muted)",
            maxWidth: "600px",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Full-stack software engineer specialising in AI-powered product development.
        </p>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: "80px",
          alignItems: "start",
        }}
      >
        {/* Bio */}
        <div className="prose-portfolio">
          <h2>What I do</h2>
          <p>
            I work at the intersection of modern web development and LLM engineering — building
            tools that bring intelligent automation to accountancy and BI teams. My day-to-day
            involves designing and shipping RAG pipelines, agent workflows, and streaming APIs that
            non-technical users can actually interact with.
          </p>
          <p>
            This portfolio itself is the proof of work: it&apos;s built with the same production
            patterns — async FastAPI, pgvector embeddings, SSE streaming, type-safe React — that I
            apply professionally.
          </p>
          <h2>Background</h2>
          <p>
            Based in the Netherlands. I started in traditional full-stack development and shifted
            focus to AI/LLM engineering over the past two years as GPT-4-class models became
            production-viable. I&apos;m particularly interested in the retrieval and grounding
            problem — making LLMs reliably useful on private domain knowledge.
          </p>
          <h2>Currently</h2>
          <p>
            Building LLM-driven automation platforms in the accountancy space. Open to interesting
            opportunities where I can combine deep backend work with frontier AI capabilities.
          </p>
        </div>

        {/* Sidebar */}
        <div>
          {/* Stack card */}
          <SidebarCard title="Core Stack">
            {STACK_CHIPS.map(({ label, variant }) => (
              <TagPill key={label} label={label} variant={variant} size="md" />
            ))}
          </SidebarCard>

          {/* Links card */}
          <SidebarCard title="Find Me" contentStyle={{ flexDirection: "column", gap: "10px" }}>
            {SOCIAL_LINKS.map(({ href, label, icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="link-muted"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                <span>{icon}</span>
                {label}
              </a>
            ))}
          </SidebarCard>

          {/* Location card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "20px" }}>📍</span>
            <div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "2px",
                }}
              >
                Netherlands
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--muted)",
                  letterSpacing: "0.04em",
                }}
              >
                Open to remote · EU timezone
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

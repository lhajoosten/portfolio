import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "64px 48px 120px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "64px" }}>
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
          Background
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "52px",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: "20px",
          }}
        >
          About Me
        </h1>
        <p
          style={{
            fontSize: "18px",
            color: "var(--muted)",
            maxWidth: "600px",
            lineHeight: 1.7,
          }}
        >
          Full-stack software engineer specialising in AI-powered product development.
        </p>
      </div>

      {/* Two-column content */}
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
            {(
              [
                { label: "Python 3.12", variant: "lime" },
                { label: "FastAPI", variant: "lime" },
                { label: "React 19", variant: "blue" },
                { label: "TypeScript", variant: "blue" },
                { label: "PostgreSQL", variant: "gray" },
                { label: "pgvector", variant: "gray" },
                { label: "OpenAI", variant: "gray" },
                { label: "Docker", variant: "gray" },
              ] as const
            ).map(({ label, variant }) => (
              <Chip key={label} label={label} variant={variant} />
            ))}
          </SidebarCard>

          {/* Links card */}
          <SidebarCard title="Find Me">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(
                [
                  {
                    href: "https://github.com/lhajoosten",
                    label: "GitHub",
                    icon: "📦",
                  },
                  {
                    href: "https://linkedin.com/in/lhajoosten",
                    label: "LinkedIn",
                    icon: "💼",
                  },
                  {
                    href: "mailto:luc@hajoosten.nl",
                    label: "Email",
                    icon: "✉️",
                  },
                ] as const
              ).map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "14px",
                    color: "var(--muted)",
                    textDecoration: "none",
                    fontWeight: 500,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)")
                  }
                >
                  <span>{icon}</span>
                  {label}
                </a>
              ))}
            </div>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const chipStyles: Record<"lime" | "blue" | "gray", React.CSSProperties> = {
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
  gray: {
    background: "rgba(255,255,255,0.04)",
    color: "var(--muted)",
    border: "1px solid var(--border)",
  },
};

function Chip({ label, variant }: { label: string; variant: "lime" | "blue" | "gray" }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        padding: "5px 12px",
        borderRadius: "4px",
        letterSpacing: "0.04em",
        ...chipStyles[variant],
      }}
    >
      {label}
    </span>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        marginBottom: "16px",
      }}
    >
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
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

import type React from "react";

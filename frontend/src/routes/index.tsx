import { createFileRoute, Link } from "@tanstack/react-router";

import { TerminalCard } from "@/components/TerminalCard";
import { TagPill } from "@/components/ui/TagPill";
import { getFeaturedProjectsApiV1ProjectsFeaturedGetOptions } from "@/lib/api/@tanstack/react-query.gen";
import { useFeaturedProjects } from "@/hooks/useProjects";
import { getTagVariant } from "@/lib/tags";
import type { ProjectResponse } from "@/lib/api/types.gen";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.prefetchQuery(getFeaturedProjectsApiV1ProjectsFeaturedGetOptions()),
  component: HomePage,
});

const STATS = [
  { value: "5+", label: "Projects shipped" },
  { value: "0", label: "Certifications" },
  { value: "2y+", label: "Software Engineering" },
  { value: "~6mo", label: "AI / LLM focus" },
] as const;

function HomePage() {
  const { data: featured = [] } = useFeaturedProjects();

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "calc(100vh - var(--nav-h))",
          display: "grid",
          gridTemplateColumns: "1fr 480px",
          gap: 0,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 48px",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Left — copy */}
        <div style={{ paddingRight: "80px" }}>
          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "28px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "24px",
                height: "1px",
                background: "var(--accent)",
              }}
            />
            Full Stack Engineer · AI Agent Builder · Crowe Foederer
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(52px, 6vw, 80px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: "24px",
            }}
          >
            Engineering intelligent
            <br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>AI-powered systems</em>
          </h1>

          {/* Sub-heading */}
          <p
            style={{
              fontSize: "18px",
              color: "var(--muted)",
              maxWidth: "480px",
              lineHeight: 1.7,
              marginBottom: "40px",
            }}
          >
            Full-stack engineer at{" "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>Crowe Foederer</span> building
            LLM automation platforms for accountancy and BI. Creator of{" "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>CodeGraph</span> — autonomous AI
            coding agents powered by LangGraph and Claude.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Link
              to="/projects"
              className="btn-cta"
              style={{
                padding: "14px 28px",
                fontSize: "14px",
                borderRadius: "var(--r-sm)",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              View Projects →
            </Link>
            <Link
              to="/blog"
              style={{
                padding: "14px 28px",
                background: "transparent",
                color: "var(--text)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: "14px",
                border: "1px solid var(--border2)",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                letterSpacing: "0.02em",
                textDecoration: "none",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--text)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border2)")
              }
            >
              Read the Blog
            </Link>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginTop: "56px",
              paddingTop: "40px",
              borderTop: "1px solid var(--border)",
            }}
          >
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "36px",
                    fontWeight: 400,
                    color: "var(--accent)",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — terminal card */}
        <TerminalCard />

        {/* Scroll hint */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          <div
            className="animate-scroll-down"
            style={{
              width: "1px",
              height: "48px",
              background: "linear-gradient(to bottom, var(--accent), transparent)",
            }}
          />
          Scroll
        </div>
      </section>

      {/* ── FEATURED PROJECTS ────────────────────────────────── */}
      {featured.length > 0 && (
        <section
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "80px 48px 120px",
          }}
        >
          {/* Section header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: "40px",
            }}
          >
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
                Selected Work
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "36px",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  margin: 0,
                }}
              >
                Featured Projects
              </h2>
            </div>
            <Link
              to="/projects"
              className="link-accent"
              style={{ fontFamily: "var(--font-mono)", fontSize: "12px", letterSpacing: "0.04em" }}
            >
              View all →
            </Link>
          </div>

          {/* Cards grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "24px",
            }}
          >
            {featured.map((project) => (
              <FeaturedProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// FeaturedProjectCard
// ---------------------------------------------------------------------------

function FeaturedProjectCard({ project }: { project: ProjectResponse }) {
  return (
    <Link to="/projects/$slug" params={{ slug: project.slug }} style={{ textDecoration: "none" }}>
      <div className="card" style={{ overflow: "hidden" }}>
        {/* Thumb */}
        <div
          style={{
            height: "180px",
            background: "linear-gradient(135deg, var(--surface2), #1a1a2e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(200,255,71,0.3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 30% 50%, rgba(200,255,71,0.06), transparent 60%)",
            }}
          />
          {project.slug}
        </div>

        {/* Info */}
        <div style={{ padding: "24px" }}>
          {/* Tags */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            {(project.tags ?? []).slice(0, 3).map((tag) => (
              <TagPill key={tag} label={tag} variant={getTagVariant(tag)} />
            ))}
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              marginBottom: "8px",
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            {project.title}
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: "20px",
            }}
          >
            {project.description}
          </p>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "16px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--muted)",
              }}
            >
              {new Date(project.created_at).getFullYear()}
            </span>
            <span className="link-accent" style={{ fontSize: "13px", fontWeight: 600 }}>
              View project →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

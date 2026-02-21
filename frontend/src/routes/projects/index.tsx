import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useProjects } from "@/hooks/useProjects";
import type { ProjectResponse } from "@/lib/api/types.gen";

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_FILTER = "All";

function getTagVariant(tag: string): "lime" | "blue" | "red" {
  const lower = tag.toLowerCase();
  if (["ai", "llm", "rag", "openai", "langchain", "langgraph", "mcp"].includes(lower))
    return "lime";
  if (["fastapi", "python", "react", "typescript", "postgres", "pgvector"].includes(lower))
    return "blue";
  return "red";
}

const tagStyles: Record<"lime" | "blue" | "red", React.CSSProperties> = {
  lime: {
    background: "rgba(200,255,71,0.1)",
    color: "var(--accent)",
  },
  blue: {
    background: "rgba(61,90,254,0.15)",
    color: "#818cf8",
  },
  red: {
    background: "rgba(255,77,77,0.1)",
    color: "#ff8080",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function ProjectsPage() {
  const { data: projects = [], isLoading, error } = useProjects();
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

  // Collect unique tags for filter pills
  const allTags = [
    ALL_FILTER,
    ...Array.from(new Set(projects.flatMap((p) => p.tags ?? []))).sort(),
  ];

  const filtered =
    activeFilter === ALL_FILTER
      ? projects
      : projects.filter((p) => (p.tags ?? []).includes(activeFilter));

  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "64px 48px",
        }}
      >
        <p style={{ color: "var(--muted)" }}>Loading projects…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "64px 48px",
        }}
      >
        <p style={{ color: "var(--danger)" }}>Failed to load projects.</p>
      </div>
    );
  }

  const [featured, regular] = (() => {
    const f = filtered.filter((p) => p.featured);
    const r = filtered.filter((p) => !p.featured);
    return [f, r];
  })();

  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "64px 48px 120px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "56px",
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
            Work
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "52px",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            Projects
          </h1>
        </div>
        <p
          style={{
            maxWidth: "320px",
            color: "var(--muted)",
            fontSize: "15px",
            lineHeight: 1.7,
          }}
        >
          Production systems, research experiments, and open-source tools at the intersection of AI
          and finance.
        </p>
      </div>

      {/* Filter pills */}
      {allTags.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "40px",
          }}
        >
          {allTags.map((tag) => {
            if (!tag) return null;
            const isActive = tag === activeFilter;
            return (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  padding: "7px 16px",
                  border: isActive ? "1px solid transparent" : "1px solid var(--border2)",
                  borderRadius: "40px",
                  background: isActive ? "var(--accent)" : "transparent",
                  color: isActive ? "#000" : "var(--muted)",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                  }
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <p
          style={{
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          No projects match that filter.
        </p>
      )}

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
        }}
      >
        {/* Featured cards (span 2) */}
        {featured.map((project) => (
          <FeaturedCard key={project.id} project={project} />
        ))}

        {/* Regular cards */}
        {regular.map((project) => (
          <RegularCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured Card
// ---------------------------------------------------------------------------

function FeaturedCard({ project }: { project: ProjectResponse }) {
  return (
    <Link
      to="/projects/$slug"
      params={{ slug: project.slug }}
      style={{ textDecoration: "none", gridColumn: "span 2" }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          transition: "border-color 0.2s, transform 0.2s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border2)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Thumb */}
        <div
          style={{
            minHeight: "220px",
            background: "linear-gradient(135deg, var(--surface2), #1a1a2e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(200,255,71,0.3)",
            letterSpacing: "0.1em",
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "28px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                gap: "6px",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <TagPill label="Featured" variant="lime" />
              {(project.tags ?? []).slice(0, 2).map((tag) => (
                <TagPill key={tag} label={tag} variant={getTagVariant(tag)} />
              ))}
            </div>
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
            {(project.tech_stack ?? []).length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "20px",
                }}
              >
                {(project.tech_stack ?? []).slice(0, 4).map((tech) => (
                  <span
                    key={tech}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ProjectFooter project={project} />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Regular Card
// ---------------------------------------------------------------------------

function RegularCard({ project }: { project: ProjectResponse }) {
  return (
    <Link to="/projects/$slug" params={{ slug: project.slug }} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          transition: "border-color 0.2s, transform 0.2s",
          cursor: "pointer",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border2)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Thumb */}
        <div
          style={{
            height: "200px",
            background: "linear-gradient(135deg, var(--surface2), #1a1a2e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "rgba(200,255,71,0.25)",
            letterSpacing: "0.1em",
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
                "radial-gradient(circle at 30% 50%, rgba(200,255,71,0.04), transparent 60%)",
            }}
          />
          {project.slug}
        </div>

        {/* Info */}
        <div
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
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
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: "20px",
              flex: 1,
            }}
          >
            {project.description}
          </p>
          <ProjectFooter project={project} />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function TagPill({ label, variant }: { label: string; variant: "lime" | "blue" | "red" }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        padding: "3px 8px",
        borderRadius: "3px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        ...tagStyles[variant],
      }}
    >
      {label}
    </span>
  );
}

function ProjectFooter({ project }: { project: ProjectResponse }) {
  return (
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
      <span
        style={{
          fontSize: "13px",
          color: "var(--accent)",
          fontWeight: 600,
        }}
      >
        View project →
      </span>
    </div>
  );
}

import type React from "react";

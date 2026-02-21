import { createLazyFileRoute, Link } from "@tanstack/react-router";

import { useProject } from "@/hooks/useProjects";

export const Route = createLazyFileRoute("/projects/$slug")({
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { slug } = Route.useParams();
  const { data: project, isLoading, error } = useProject(slug);

  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "64px 48px",
        }}
      >
        <p style={{ color: "var(--muted)" }}>Loading project…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "64px 48px",
        }}
      >
        <p style={{ color: "var(--danger)", marginBottom: "16px" }}>Project not found.</p>
        <Link
          to="/projects"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            color: "var(--muted)",
            textDecoration: "none",
          }}
        >
          ← Back to projects
        </Link>
      </div>
    );
  }

  const tagVariants: Record<string, { bg: string; color: string }> = {
    lime: {
      bg: "rgba(200,255,71,0.1)",
      color: "var(--accent)",
    },
    blue: {
      bg: "rgba(61,90,254,0.15)",
      color: "#818cf8",
    },
    gray: {
      bg: "rgba(255,255,255,0.04)",
      color: "var(--muted)",
    },
  };

  function getTagVariant(tag: string): "lime" | "blue" | "gray" {
    const lower = tag.toLowerCase();
    if (["ai", "llm", "rag", "openai", "langchain", "langgraph", "mcp"].includes(lower))
      return "lime";
    if (["fastapi", "python", "react", "typescript", "postgres", "pgvector"].includes(lower))
      return "blue";
    return "gray";
  }

  return (
    <>
      {/* ── DETAIL HERO ───────────────────────────────────────── */}
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "64px 48px 48px",
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: "80px",
          alignItems: "start",
        }}
      >
        {/* Left — main info */}
        <div>
          {/* Breadcrumb */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--muted)",
              marginBottom: "28px",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <Link
              to="/projects"
              style={{ color: "var(--muted)", textDecoration: "none" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)")
              }
            >
              Projects
            </Link>
            <span>›</span>
            <span style={{ color: "var(--accent)" }}>{project.title}</span>
          </div>

          {/* Tags */}
          {(project.tags ?? []).length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              {project.featured && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    padding: "3px 8px",
                    borderRadius: "3px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: "rgba(200,255,71,0.1)",
                    color: "var(--accent)",
                  }}
                >
                  Featured
                </span>
              )}
              {(project.tags ?? []).map((tag) => {
                const v = getTagVariant(tag);
                return (
                  <span
                    key={tag}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      padding: "3px 8px",
                      borderRadius: "3px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      background: tagVariants[v].bg,
                      color: tagVariants[v].color,
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 4vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: "20px",
            }}
          >
            {project.title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: "18px",
              color: "var(--muted)",
              lineHeight: 1.7,
              marginBottom: "32px",
            }}
          >
            {project.description}
          </p>

          {/* Meta strip */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              padding: "20px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              flexWrap: "wrap",
            }}
          >
            <MetaItem label="Year" value={String(new Date(project.created_at).getFullYear())} />
            <MetaDivider />
            <MetaItem
              label="Status"
              value={project.published ? "Published" : "Draft"}
              highlight={project.published}
            />
            {project.live_url && (
              <>
                <MetaDivider />
                <MetaItem label="Live" value="Available" highlight />
              </>
            )}
          </div>
        </div>

        {/* Right — sticky sidebar */}
        <div style={{ position: "sticky", top: "80px" }}>
          {/* Tech stack card */}
          {(project.tech_stack ?? []).length > 0 && (
            <SidebarCard title="Tech Stack">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(project.tech_stack ?? []).map((tech) => {
                  const v = getTagVariant(tech);
                  return (
                    <span
                      key={tech}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        padding: "5px 12px",
                        borderRadius: "4px",
                        letterSpacing: "0.04em",
                        background: tagVariants[v].bg,
                        color: tagVariants[v].color,
                        border:
                          v === "lime"
                            ? "1px solid rgba(200,255,71,0.2)"
                            : v === "blue"
                              ? "1px solid rgba(61,90,254,0.25)"
                              : "1px solid var(--border)",
                      }}
                    >
                      {tech}
                    </span>
                  );
                })}
              </div>
            </SidebarCard>
          )}

          {/* Links card */}
          {(project.live_url || project.repo_url) && (
            <SidebarCard title="Links">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {project.live_url && (
                  <a
                    href={project.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px",
                      color: "var(--text)",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text)")
                    }
                  >
                    <span>🔗</span> Live Demo
                  </a>
                )}
                {project.repo_url && (
                  <a
                    href={project.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px",
                      color: "var(--muted)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)")
                    }
                  >
                    <span>📦</span> GitHub Repo
                  </a>
                )}
              </div>
            </SidebarCard>
          )}
        </div>
      </div>

      {/* ── CONTENT BODY ──────────────────────────────────────── */}
      {project.content && (
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "0 48px 80px",
          }}
        >
          <div className="prose-portfolio">{project.content}</div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function MetaItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: highlight ? "#4ade80" : "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetaDivider() {
  return (
    <div
      style={{
        width: "1px",
        background: "var(--border)",
        margin: "0 4px",
        alignSelf: "stretch",
      }}
    />
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
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

import type React from "react";

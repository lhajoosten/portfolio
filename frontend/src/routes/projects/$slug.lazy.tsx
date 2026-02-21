import { createLazyFileRoute, Link } from "@tanstack/react-router";

import { SidebarCard, TagPill } from "@/components/ui";
import { useProject } from "@/hooks/useProjects";
import { getTagVariant } from "@/lib/tags";
import type { ProjectResponse } from "@/lib/api/types.gen";

export const Route = createLazyFileRoute("/projects/$slug")({
  component: ProjectDetailPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function ProjectDetailPage() {
  const { slug } = Route.useParams();
  const { data: project, isLoading, error } = useProject(slug);

  if (isLoading) {
    return (
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "64px 48px" }}>
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
          Loading project…
        </p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "64px 48px" }}>
        <p
          role="alert"
          style={{
            color: "var(--danger)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          Project not found.
        </p>
        <Link
          to="/projects"
          className="link-muted"
          style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
        >
          ← Back to projects
        </Link>
      </div>
    );
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
              className="link-muted"
              style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
            >
              Projects
            </Link>
            <span>›</span>
            <span style={{ color: "var(--accent)" }}>{project.title}</span>
          </div>

          {/* Tags */}
          {(project.tags ?? []).length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
              {project.featured && <TagPill label="Featured" variant="lime" />}
              {(project.tags ?? []).map((tag) => (
                <TagPill key={tag} label={tag} variant={getTagVariant(tag)} />
              ))}
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
          <MetaStrip project={project} />
        </div>

        {/* Right — sticky sidebar */}
        <div style={{ position: "sticky", top: "80px" }}>
          {(project.tech_stack ?? []).length > 0 && (
            <SidebarCard title="Tech Stack">
              {(project.tech_stack ?? []).map((tech) => (
                <TagPill key={tech} label={tech} variant={getTagVariant(tech)} size="md" />
              ))}
            </SidebarCard>
          )}

          {(project.live_url ?? project.repo_url) && (
            <SidebarCard title="Links" contentStyle={{ flexDirection: "column", gap: "10px" }}>
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
                    transition: "color 0.15s",
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
                  className="link-muted"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span>📦</span> GitHub Repo
                </a>
              )}
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
// MetaStrip
// ---------------------------------------------------------------------------

function MetaStrip({ project }: { project: ProjectResponse }) {
  return (
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
  );
}

// ---------------------------------------------------------------------------
// MetaItem / MetaDivider
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

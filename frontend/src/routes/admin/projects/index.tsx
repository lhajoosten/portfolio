/**
 * Admin Projects list — `/admin/projects`
 *
 * Enhanced list page with:
 * - Stats row: Total, Published, Drafts counts
 * - Search/filter input
 * - Table: Title, Status, Slug, Year, Actions (Edit / View / Delete)
 * - "Export CSV" + "+ New Project" actions
 *
 * Rendered inside the AdminLayout from `../route.tsx`, which applies the
 * superuser guard and sticky sidebar.
 *
 * @module
 */

import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { useDeleteProject, useProjects } from "@/hooks/useProjects";
import type { ProjectResponse } from "@/lib/api/types.gen";

export const Route = createFileRoute("/admin/projects/")({
  component: AdminProjectsPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AdminProjectsPage() {
  const { data: projects = [], isLoading, error } = useProjects(false);
  const [search, setSearch] = useState("");

  const published = projects.filter((p) => p.published);
  const drafts = projects.filter((p) => !p.published);

  const filtered = search.trim()
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : projects;

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "8px",
            }}
          >
            Content
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "32px",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Projects
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              padding: "8px 16px",
              background: "transparent",
              color: "var(--muted)",
              border: "1px solid var(--border2)",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.color = "var(--text)";
              el.style.borderColor = "var(--text)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.color = "var(--muted)";
              el.style.borderColor = "var(--border2)";
            }}
          >
            Export CSV
          </button>

          <Link
            to="/admin/projects/$projectSlug"
            params={{ projectSlug: "new" }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.06em",
              padding: "9px 20px",
              background: "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.85")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
          >
            + New Project
          </Link>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      {!isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          <StatChip
            label="Total Projects"
            value={projects.length}
            delta={projects.length > 0 ? `All time` : undefined}
          />
          <StatChip
            label="Published"
            value={published.length}
            delta={published.length > 0 ? "Live on site" : undefined}
            accent="lime"
          />
          <StatChip
            label="Drafts"
            value={drafts.length}
            delta={drafts.length > 0 ? "Pending review" : undefined}
            accent="warn"
          />
          <StatChip label="Embeddings" value={0} delta="pgvector indexed" accent="purple" />
        </div>
      )}

      {/* ── States ──────────────────────────────────────────────── */}
      {isLoading && (
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          Loading projects…
        </div>
      )}

      {error && (
        <p
          role="alert"
          style={{ color: "var(--danger)", fontFamily: "var(--font-mono)", fontSize: "13px" }}
        >
          Failed to load projects.
        </p>
      )}

      {/* ── Table card ──────────────────────────────────────────── */}
      {!isLoading && !error && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface2)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              All Projects{" "}
              <span
                style={{
                  display: "inline-block",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  marginLeft: "4px",
                }}
              >
                {filtered.length}
              </span>
            </span>

            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "6px 12px",
                minWidth: "200px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1 }}>🔍</span>
              <input
                type="search"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  width: "100%",
                }}
              />
            </div>
          </div>

          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 180px 60px 100px",
              padding: "10px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {["Title", "Status", "Slug", "Year", "Actions"].map((h) => (
              <div
                key={h}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div
              style={{
                padding: "56px 20px",
                textAlign: "center",
                color: "var(--muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              }}
            >
              {search
                ? `No projects matching "${search}"`
                : "No projects yet — create your first one"}
            </div>
          )}

          {/* Rows */}
          {filtered.map((project, i) => (
            <ProjectRow key={project.id} project={project} isLast={i === filtered.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatChip
// ---------------------------------------------------------------------------

function StatChip({
  label,
  value,
  delta,
  accent,
}: {
  label: string;
  value: number;
  delta?: string;
  accent?: "lime" | "warn" | "purple";
}) {
  const accentColors = {
    lime: { bg: "rgba(200,255,71,0.06)", color: "var(--accent)", border: "rgba(200,255,71,0.12)" },
    warn: { bg: "rgba(255,176,32,0.06)", color: "var(--warn)", border: "rgba(255,176,32,0.12)" },
    purple: {
      bg: "rgba(167,139,250,0.06)",
      color: "#a78bfa",
      border: "rgba(167,139,250,0.12)",
    },
  };
  const colors = accent
    ? accentColors[accent]
    : { bg: "var(--surface2)", color: "var(--muted)", border: "var(--border)" };

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "var(--r-md)",
        padding: "14px 18px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "30px",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: accent ? colors.color : "var(--text)",
          marginBottom: "4px",
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--muted)",
            letterSpacing: "0.02em",
          }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectRow
// ---------------------------------------------------------------------------

function ProjectRow({ project, isLast }: { project: ProjectResponse; isLast: boolean }) {
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();

  function handleDelete() {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    deleteProject({ path: { slug: project.slug } });
  }

  const year = new Date(project.created_at).getFullYear();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 90px 180px 60px 100px",
        padding: "14px 20px",
        alignItems: "center",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)")
      }
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
    >
      {/* Title */}
      <div>
        <div
          style={{ fontSize: "14px", fontWeight: 500, color: "var(--text)", marginBottom: "2px" }}
        >
          {project.title}
        </div>
        {(project.tags ?? []).length > 0 && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--muted)",
            }}
          >
            {(project.tags ?? []).slice(0, 3).join(" · ")}
            {(project.tags ?? []).length > 3 && (
              <span style={{ color: "var(--border2)" }}> +{(project.tags ?? []).length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            padding: "3px 8px",
            borderRadius: "3px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: project.published ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)",
            color: project.published ? "#4ade80" : "var(--muted)",
            border: project.published
              ? "1px solid rgba(74,222,128,0.2)"
              : "1px solid var(--border)",
          }}
        >
          {project.published ? "Published" : "Draft"}
        </span>
      </div>

      {/* Slug */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        /{project.slug}
      </div>

      {/* Year */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--muted)",
        }}
      >
        {year}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <Link
          to="/admin/projects/$projectSlug"
          params={{ projectSlug: project.slug }}
          title="Edit"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border)",
            cursor: "pointer",
            fontSize: "13px",
            color: "var(--muted)",
            textDecoration: "none",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "rgba(255,255,255,0.06)";
            el.style.borderColor = "var(--border2)";
            el.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "transparent";
            el.style.borderColor = "var(--border)";
            el.style.color = "var(--muted)";
          }}
        >
          ✏️
        </Link>

        <Link
          to="/projects/$slug"
          params={{ slug: project.slug }}
          target="_blank"
          rel="noopener noreferrer"
          title="View on site"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border)",
            cursor: "pointer",
            fontSize: "13px",
            color: "var(--muted)",
            textDecoration: "none",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "rgba(255,255,255,0.06)";
            el.style.borderColor = "var(--border2)";
            el.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "transparent";
            el.style.borderColor = "var(--border)";
            el.style.color = "var(--muted)";
          }}
        >
          👁
        </Link>

        <button
          type="button"
          title="Delete"
          disabled={isDeleting}
          onClick={handleDelete}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border)",
            cursor: isDeleting ? "not-allowed" : "pointer",
            fontSize: "13px",
            color: "var(--muted)",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
            opacity: isDeleting ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isDeleting) {
              const el = e.currentTarget;
              el.style.background = "rgba(255,77,77,0.08)";
              el.style.borderColor = "rgba(255,77,77,0.3)";
              el.style.color = "var(--danger)";
            }
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.background = "transparent";
            el.style.borderColor = "var(--border)";
            el.style.color = "var(--muted)";
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

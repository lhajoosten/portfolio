import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ErrorState, LoadingState, PageContainer, PageHeader, TagPill } from "@/components/ui";
import { useProjects } from "@/hooks/useProjects";
import { getProjectsApiV1ProjectsGetOptions } from "@/lib/api/@tanstack/react-query.gen";
import type { ProjectResponse } from "@/lib/api/types.gen";
import { getTagVariant } from "@/lib/tags";

// ---------------------------------------------------------------------------
// Route — with prefetch loader
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/projects/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.prefetchQuery(
      getProjectsApiV1ProjectsGetOptions({ query: { published_only: true } }),
    ),
  component: ProjectsPage,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_FILTER = "All";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function ProjectsPage() {
  const { data: projects = [], isLoading, error } = useProjects();
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

  if (isLoading) {
    return (
      <PageContainer style={{ paddingBottom: "64px" }}>
        <LoadingState message="Loading projects…" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer style={{ paddingBottom: "64px" }}>
        <ErrorState message="Failed to load projects." />
      </PageContainer>
    );
  }

  // Collect unique tags for filter pills
  const allTags = [
    ALL_FILTER,
    ...Array.from(new Set(projects.flatMap((p) => p.tags ?? []))).sort(),
  ];

  const filtered =
    activeFilter === ALL_FILTER
      ? projects
      : projects.filter((p) => (p.tags ?? []).includes(activeFilter));

  const featured = filtered.filter((p) => p.featured);
  const regular = filtered.filter((p) => !p.featured);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Work"
        title="Projects"
        description="Production systems, research experiments, and open-source tools at the intersection of AI and finance."
      />

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
        {featured.map((project) => (
          <FeaturedCard key={project.id} project={project} />
        ))}
        {regular.map((project) => (
          <RegularCard key={project.id} project={project} />
        ))}
      </div>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Featured Card (spans 2 columns)
// ---------------------------------------------------------------------------

function FeaturedCard({ project }: { project: ProjectResponse }) {
  return (
    <Link
      to="/projects/$slug"
      params={{ slug: project.slug }}
      style={{ textDecoration: "none", gridColumn: "span 2" }}
    >
      <div
        className="card"
        style={{
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 280px",
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
            {/* Tags */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
              <TagPill label="Featured" variant="lime" />
              {(project.tags ?? []).slice(0, 2).map((tag) => (
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

            {/* Tech stack */}
            {(project.tech_stack ?? []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
                {(project.tech_stack ?? []).slice(0, 4).map((tech) => (
                  <TagPill key={tech} label={tech} variant={getTagVariant(tech)} />
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
// Regular Card (1 column)
// ---------------------------------------------------------------------------

function RegularCard({ project }: { project: ProjectResponse }) {
  return (
    <Link to="/projects/$slug" params={{ slug: project.slug }} style={{ textDecoration: "none" }}>
      <div
        className="card"
        style={{
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
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
          {/* Tags */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
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
      <span className="link-accent" style={{ fontSize: "13px", fontWeight: 600 }}>
        View project →
      </span>
    </div>
  );
}

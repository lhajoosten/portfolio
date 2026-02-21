/**
 * Admin dashboard — `/admin` index page.
 *
 * Overview screen showing quick stats for each content domain and shortcuts
 * to the main CMS sections. Rendered inside the `AdminLayout` from
 * `route.tsx`, which already wraps it in `<ProtectedRoute requireSuperuser>`.
 *
 * @module
 */

import { createFileRoute, Link } from "@tanstack/react-router";

import { useCertifications } from "@/hooks/useCertifications";
import { usePosts } from "@/hooks/usePosts";
import { useProjects } from "@/hooks/useProjects";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  count: number | undefined;
  isLoading: boolean;
  href: string;
  icon: string;
  description: string;
  accentColor?: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function AdminDashboard() {
  const { data: projects, isLoading: projectsLoading } = useProjects(false);
  const { data: posts, isLoading: postsLoading } = usePosts(false);
  const { data: certs, isLoading: certsLoading } = useCertifications(false);

  const publishedProjects = projects?.filter((p) => p.published).length ?? 0;
  const draftProjects = (projects?.length ?? 0) - publishedProjects;

  const publishedPosts = posts?.filter((p) => p.published).length ?? 0;
  const draftPosts = (posts?.length ?? 0) - publishedPosts;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "40px" }}>
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
          Overview
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "36px",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--muted)",
            marginTop: "8px",
            lineHeight: 1.6,
          }}
        >
          Manage your portfolio content from here.
        </p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "48px",
        }}
      >
        <StatCard
          label="Projects"
          count={projects?.length}
          isLoading={projectsLoading}
          href="/admin/projects"
          icon="📁"
          description={`${publishedProjects} published · ${draftProjects} draft`}
          accentColor="rgba(200,255,71,0.15)"
        />
        <StatCard
          label="Blog Posts"
          count={posts?.length}
          isLoading={postsLoading}
          href="/admin/posts"
          icon="✍️"
          description={`${publishedPosts} published · ${draftPosts} draft`}
          accentColor="rgba(61,90,254,0.15)"
        />
        <StatCard
          label="Certifications"
          count={certs?.length}
          isLoading={certsLoading}
          href="/admin/certifications"
          icon="🎓"
          description={`${certs?.filter((c) => c.featured).length ?? 0} featured`}
          accentColor="rgba(249,115,22,0.12)"
        />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "16px",
          }}
        >
          Quick Actions
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <QuickAction href="/admin/projects" label="New Project" icon="+" />
          <QuickAction href="/admin/posts" label="New Post" icon="+" />
          <QuickAction href="/admin/certifications" label="New Certification" icon="+" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  count,
  isLoading,
  href,
  icon,
  description,
  accentColor = "rgba(255,255,255,0.04)",
}: StatCardProps) {
  return (
    <Link to={href} style={{ textDecoration: "none" }}>
      <div
        className="card"
        style={{ padding: "24px" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border2)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Icon + label row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: accentColor,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            {label}
          </span>
        </div>

        {/* Count */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "48px",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            marginBottom: "8px",
          }}
        >
          {isLoading ? (
            <span
              style={{
                display: "inline-block",
                width: "48px",
                height: "44px",
                borderRadius: "6px",
                background: "var(--surface2)",
                opacity: 0.6,
              }}
            />
          ) : (
            (count ?? 0)
          )}
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--muted)",
            letterSpacing: "0.02em",
          }}
        >
          {isLoading ? "Loading…" : description}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// QuickAction
// ---------------------------------------------------------------------------

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      to={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        letterSpacing: "0.04em",
        padding: "8px 16px",
        border: "1px solid var(--border2)",
        borderRadius: "6px",
        color: "var(--muted)",
        textDecoration: "none",
        transition: "border-color 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)";
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border2)";
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
      }}
    >
      <span
        style={{
          fontSize: "14px",
          fontWeight: 700,
          lineHeight: 1,
          color: "inherit",
        }}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

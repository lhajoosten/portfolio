/**
 * Admin Blog Posts list — `/admin/posts`
 *
 * List page with:
 * - Stats row: Total, Published, Drafts, Featured counts
 * - Search/filter input
 * - Table: Title, Status, Slug, Reading Time, Actions (Edit / Delete)
 * - "+ New Post" action
 *
 * Rendered inside the AdminLayout from `../route.tsx`, which applies the
 * superuser guard and sticky sidebar.
 *
 * @module
 */

import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { useDeletePost, usePosts } from "@/hooks/usePosts";
import type { PostResponse } from "@/lib/api/types.gen";

export const Route = createFileRoute("/admin/posts/")({
  component: AdminPostsPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AdminPostsPage() {
  const { data: posts = [], isLoading, error } = usePosts(false);
  const [search, setSearch] = useState("");

  const published = posts.filter((p) => p.published);
  const drafts = posts.filter((p) => !p.published);

  const filtered = search.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.slug.toLowerCase().includes(search.toLowerCase()) ||
          p.excerpt.toLowerCase().includes(search.toLowerCase()),
      )
    : posts;

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
            Blog Posts
          </h1>
        </div>

        <Link
          to="/admin/posts/$postSlug"
          params={{ postSlug: "new" }}
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
          + New Post
        </Link>
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
            label="Total Posts"
            value={posts.length}
            delta={posts.length > 0 ? "All time" : undefined}
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
          <StatChip label="Indexed" value={0} delta="pgvector indexed" accent="purple" />
        </div>
      )}

      {/* ── Loading / error states ───────────────────────────────── */}
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
          Loading posts…
        </div>
      )}

      {error && (
        <p
          role="alert"
          style={{ color: "var(--danger)", fontFamily: "var(--font-mono)", fontSize: "13px" }}
        >
          Failed to load posts.
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
              All Posts{" "}
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
                minWidth: "220px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1 }}>🔍</span>
              <input
                type="search"
                placeholder="Search posts…"
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
              gridTemplateColumns: "1fr 90px 180px 80px 100px",
              padding: "10px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {["Title", "Status", "Slug", "Read", "Actions"].map((h) => (
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
              {search ? `No posts matching "${search}"` : "No posts yet — write your first one"}
            </div>
          )}

          {/* Rows */}
          {filtered.map((post, i) => (
            <PostRow key={post.id} post={post} isLast={i === filtered.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatChip
// ---------------------------------------------------------------------------

interface StatChipProps {
  label: string;
  value: number;
  delta?: string;
  accent?: "lime" | "warn" | "purple";
}

function StatChip({ label, value, delta, accent }: StatChipProps) {
  const accentColors = {
    lime: { bg: "rgba(200,255,71,0.06)", color: "var(--accent)", border: "rgba(200,255,71,0.15)" },
    warn: { bg: "rgba(251,191,36,0.06)", color: "#fbbf24", border: "rgba(251,191,36,0.15)" },
    purple: {
      bg: "rgba(167,139,250,0.06)",
      color: "#a78bfa",
      border: "rgba(167,139,250,0.15)",
    },
  };
  const colors = accent
    ? accentColors[accent]
    : { bg: "var(--surface2)", color: "var(--text)", border: "var(--border)" };

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "var(--r-lg)",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.color,
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "32px",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "var(--text)",
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
// PostRow
// ---------------------------------------------------------------------------

interface PostRowProps {
  post: PostResponse;
  isLast: boolean;
}

function PostRow({ post, isLast }: PostRowProps) {
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

  function handleDelete() {
    if (window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      deletePost({ path: { slug: post.slug } });
    }
  }

  const readLabel = post.reading_time_minutes ? `${post.reading_time_minutes} min` : "—";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 90px 180px 80px 100px",
        padding: "14px 20px",
        alignItems: "center",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.015)")
      }
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
    >
      {/* Title + excerpt */}
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text)",
            marginBottom: "2px",
            fontFamily: "var(--font-body)",
          }}
        >
          {post.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "340px",
          }}
        >
          {post.excerpt}
        </div>
      </div>

      {/* Status chip */}
      <div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            padding: "3px 8px",
            borderRadius: "4px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: post.published ? "rgba(200,255,71,0.1)" : "rgba(255,255,255,0.06)",
            color: post.published ? "var(--accent)" : "var(--muted)",
            border: post.published ? "1px solid rgba(200,255,71,0.2)" : "1px solid var(--border)",
          }}
        >
          {post.published ? "Live" : "Draft"}
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
        {post.slug}
      </div>

      {/* Reading time */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--muted)",
        }}
      >
        {readLabel}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        {/* Edit */}
        <Link
          to="/admin/posts/$postSlug"
          params={{ postSlug: post.slug }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border2)",
            cursor: "pointer",
            fontSize: "13px",
            color: "var(--muted)",
            textDecoration: "none",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = "var(--accent)";
            el.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = "var(--border2)";
            el.style.color = "var(--muted)";
          }}
        >
          ✏️
        </Link>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid var(--border2)",
            cursor: isDeleting ? "not-allowed" : "pointer",
            fontSize: "13px",
            color: "var(--muted)",
            transition: "border-color 0.15s, color 0.15s",
            opacity: isDeleting ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isDeleting) {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "var(--danger)";
              el.style.color = "var(--danger)";
            }
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = "var(--border2)";
            el.style.color = "var(--muted)";
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

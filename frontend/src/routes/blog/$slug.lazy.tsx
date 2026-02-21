import { createLazyFileRoute, Link } from "@tanstack/react-router";

import { TagPill } from "@/components/ui/TagPill";
import { usePost } from "@/hooks/usePosts";

export const Route = createLazyFileRoute("/blog/$slug")({
  component: PostDetailPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function PostDetailPage() {
  const { slug } = Route.useParams();
  const { data: post, isLoading, error } = usePost(slug);

  if (isLoading) {
    return (
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 48px" }}>
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
          Loading post…
        </p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 48px" }}>
        <p
          role="alert"
          style={{
            color: "var(--danger)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          Post not found.
        </p>
        <Link
          to="/blog"
          className="link-muted"
          style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
        >
          ← Back to blog
        </Link>
      </div>
    );
  }

  const tags = post.tags ?? [];

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "64px 48px 120px",
      }}
    >
      {/* Back link */}
      <Link
        to="/blog"
        className="link-muted"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          letterSpacing: "0.04em",
          marginBottom: "40px",
        }}
      >
        ← Blog
      </Link>

      {/* Tags */}
      {tags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "20px",
          }}
        >
          {tags.map((tag) => (
            <TagPill key={tag} label={tag} variant="lime" />
          ))}
        </div>
      )}

      {/* Title */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(32px, 5vw, 52px)",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          marginBottom: "20px",
          color: "var(--text)",
        }}
      >
        {post.title}
      </h1>

      {/* Excerpt */}
      <p
        style={{
          fontSize: "18px",
          color: "var(--muted)",
          lineHeight: 1.7,
          marginBottom: "32px",
        }}
      >
        {post.excerpt}
      </p>

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          paddingBottom: "32px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "48px",
          flexWrap: "wrap",
        }}
      >
        {/* Author avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), #60a5fa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "#000",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            L
          </div>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
            Luc Hajoosten
          </span>
        </div>

        <span style={{ color: "var(--border2)" }}>·</span>

        <time
          dateTime={post.created_at}
          style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)" }}
        >
          {new Date(post.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>

        {post.reading_time_minutes != null && (
          <>
            <span style={{ color: "var(--border2)" }}>·</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--muted)",
              }}
            >
              {post.reading_time_minutes} min read
            </span>
          </>
        )}
      </div>

      {/* Cover image */}
      {post.cover_image_url && (
        <img
          src={post.cover_image_url}
          alt={post.title}
          style={{
            width: "100%",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--border)",
            objectFit: "cover",
            marginBottom: "48px",
          }}
        />
      )}

      {/* Body */}
      {post.body ? (
        <div className="prose-portfolio">{post.body}</div>
      ) : (
        <p
          style={{
            fontStyle: "italic",
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          No content published yet.
        </p>
      )}

      {/* Footer nav */}
      <div
        style={{
          marginTop: "80px",
          paddingTop: "32px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <Link
          to="/blog"
          className="link-muted"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            letterSpacing: "0.04em",
          }}
        >
          ← All posts
        </Link>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

import { usePosts } from "@/hooks/usePosts";
import type { PostResponse } from "@/lib/api/types.gen";

export const Route = createFileRoute("/blog/")({
  component: BlogPage,
});

function BlogPage() {
  const { data: posts = [], isLoading, error } = usePosts();

  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "64px 48px",
        }}
      >
        <p style={{ color: "var(--muted)" }}>Loading posts…</p>
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
        <p style={{ color: "var(--danger)" }}>Failed to load posts.</p>
      </div>
    );
  }

  const [featured, rest] = (() => {
    const f = posts[0];
    const r = posts.slice(1);
    return [f, r] as [PostResponse | undefined, PostResponse[]];
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
            Writing
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "52px",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            The Blog
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
          Thoughts on AI / LLM engineering, production patterns, and building things that matter.
        </p>
      </div>

      {/* Empty state */}
      {posts.length === 0 && (
        <p
          style={{
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          No posts yet — check back soon.
        </p>
      )}

      {/* Grid */}
      {posts.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          {/* Featured card — spans full width */}
          {featured && <FeaturedCard post={featured} />}

          {/* Regular cards */}
          {rest.map((post) => (
            <RegularCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured Card
// ---------------------------------------------------------------------------

function FeaturedCard({ post }: { post: PostResponse }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      style={{ textDecoration: "none", gridColumn: "span 2" }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          cursor: "pointer",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border2)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")
        }
      >
        {/* Thumb */}
        <div
          style={{
            minHeight: "260px",
            background: "linear-gradient(135deg, var(--surface2), #0f172a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "48px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 50%, rgba(61,90,254,0.12), transparent 70%)",
            }}
          />
          🧠
        </div>

        {/* Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "32px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--muted)",
                marginBottom: "16px",
              }}
            >
              {(post.tags ?? []).slice(0, 1).map((tag) => (
                <span
                  key={tag}
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
                  {tag}
                </span>
              ))}
              {post.reading_time_minutes != null && (
                <span>{post.reading_time_minutes} min read</span>
              )}
            </div>

            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                marginBottom: "12px",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--text)",
              }}
            >
              {post.title}
            </h2>

            <p
              style={{
                fontSize: "14px",
                color: "var(--muted)",
                lineHeight: 1.6,
                marginBottom: "24px",
              }}
            >
              {post.excerpt}
            </p>
          </div>

          <PostAuthor post={post} />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Regular Card
// ---------------------------------------------------------------------------

function RegularCard({ post }: { post: PostResponse }) {
  const thumbEmojis: Record<string, string> = {
    ai: "🤖",
    llm: "🧠",
    rag: "🔍",
    fastapi: "⚡",
    python: "🐍",
    react: "⚛️",
    agents: "🤖",
  };

  const firstTag = (post.tags ?? [])[0]?.toLowerCase() ?? "";
  const emoji = thumbEmojis[firstTag] ?? "✍️";

  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          cursor: "pointer",
          transition: "border-color 0.2s",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border2)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)")
        }
      >
        {/* Thumb */}
        <div
          style={{
            height: "180px",
            background: "linear-gradient(135deg, var(--surface2), #0f172a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 50%, rgba(61,90,254,0.08), transparent 70%)",
            }}
          />
          {emoji}
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
              alignItems: "center",
              gap: "12px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--muted)",
              marginBottom: "12px",
            }}
          >
            {(post.tags ?? []).slice(0, 1).map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  padding: "3px 8px",
                  borderRadius: "3px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: "rgba(61,90,254,0.15)",
                  color: "#818cf8",
                }}
              >
                {tag}
              </span>
            ))}
            {post.reading_time_minutes != null && <span>{post.reading_time_minutes} min read</span>}
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              marginBottom: "10px",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            {post.title}
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: "20px",
              flex: 1,
            }}
          >
            {post.excerpt}
          </p>

          <PostAuthor post={post} />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function PostAuthor({ post }: { post: PostResponse }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent), #60a5fa)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "#000",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        L
      </div>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>Luc</div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {new Date(post.created_at).toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>
    </div>
  );
}

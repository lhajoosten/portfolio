import { createFileRoute, Link } from "@tanstack/react-router";

import { ErrorState, LoadingState, PageContainer, PageHeader, TagPill } from "@/components/ui";
import { usePosts } from "@/hooks/usePosts";
import { getPostsApiV1PostsGetOptions } from "@/lib/api/@tanstack/react-query.gen";
import type { PostResponse } from "@/lib/api/types.gen";

// ---------------------------------------------------------------------------
// Route — with prefetch loader
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/blog/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.prefetchQuery(getPostsApiV1PostsGetOptions({ query: { published_only: true } })),
  component: BlogPage,
});

// ---------------------------------------------------------------------------
// Emoji map for post thumbnails
// ---------------------------------------------------------------------------

const THUMB_EMOJIS: Record<string, string> = {
  ai: "🤖",
  llm: "🧠",
  rag: "🔍",
  fastapi: "⚡",
  python: "🐍",
  react: "⚛️",
  agents: "🤖",
};

function getPostEmoji(tags: string[]): string {
  const firstTag = tags[0]?.toLowerCase() ?? "";
  return THUMB_EMOJIS[firstTag] ?? "✍️";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function BlogPage() {
  const { data: posts = [], isLoading, error } = usePosts();

  if (isLoading) {
    return (
      <PageContainer style={{ paddingBottom: "64px" }}>
        <LoadingState message="Loading posts…" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer style={{ paddingBottom: "64px" }}>
        <ErrorState message="Failed to load posts." />
      </PageContainer>
    );
  }

  const [featured, rest] =
    posts.length > 0
      ? [posts[0] as PostResponse, posts.slice(1)]
      : [undefined, [] as PostResponse[]];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Writing"
        title="The Blog"
        description="Thoughts on AI / LLM engineering, production patterns, and building things that matter."
      />

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
          {featured && <FeaturedCard post={featured} />}
          {rest.map((post) => (
            <RegularCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Featured Card (spans 2 columns)
// ---------------------------------------------------------------------------

function FeaturedCard({ post }: { post: PostResponse }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      style={{ textDecoration: "none", gridColumn: "span 2" }}
    >
      <div
        className="card"
        style={{
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
        }}
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
            {/* Tags + read time */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              {(post.tags ?? []).slice(0, 1).map((tag) => (
                <TagPill key={tag} label={tag} variant="lime" />
              ))}
              {post.reading_time_minutes != null && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--muted)",
                  }}
                >
                  {post.reading_time_minutes} min read
                </span>
              )}
            </div>

            {/* Title */}
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

            {/* Excerpt */}
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
// Regular Card (1 column)
// ---------------------------------------------------------------------------

function RegularCard({ post }: { post: PostResponse }) {
  const emoji = getPostEmoji(post.tags ?? []);

  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} style={{ textDecoration: "none" }}>
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
          {/* Tags + read time */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            {(post.tags ?? []).slice(0, 1).map((tag) => (
              <TagPill key={tag} label={tag} variant="blue" />
            ))}
            {post.reading_time_minutes != null && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--muted)",
                }}
              >
                {post.reading_time_minutes} min read
              </span>
            )}
          </div>

          {/* Title */}
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

          {/* Excerpt */}
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
// PostAuthor — shared between featured and regular cards
// ---------------------------------------------------------------------------

function PostAuthor({ post }: { post: PostResponse }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {/* Avatar */}
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

      {/* Name + date */}
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

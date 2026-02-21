import { createFileRoute, Link } from "@tanstack/react-router";

import { useFeaturedProjects } from "@/hooks/useProjects";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: featured = [] } = useFeaturedProjects();

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "calc(100vh - var(--nav-h))",
          display: "grid",
          gridTemplateColumns: "1fr 480px",
          gap: 0,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 48px",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Left */}
        <div style={{ paddingRight: "80px" }}>
          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: "28px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "24px",
                height: "1px",
                background: "var(--accent)",
              }}
            />
            Full Stack Engineer · AI / LLM Specialist
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(52px, 6vw, 80px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: "24px",
            }}
          >
            Building the future of
            <br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>accountancy with AI</em>
          </h1>

          {/* Sub */}
          <p
            style={{
              fontSize: "18px",
              color: "var(--muted)",
              maxWidth: "480px",
              lineHeight: 1.7,
              marginBottom: "40px",
            }}
          >
            I design and ship LLM-powered platforms that bring intelligent automation to financial
            teams — from RAG pipelines to agent workflows to production-grade APIs.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Link
              to="/projects"
              style={{
                padding: "14px 28px",
                background: "var(--accent)",
                color: "#000",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: "14px",
                border: "none",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                letterSpacing: "0.02em",
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.85")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
            >
              View Projects →
            </Link>
            <Link
              to="/blog"
              style={{
                padding: "14px 28px",
                background: "transparent",
                color: "var(--text)",
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: "14px",
                border: "1px solid var(--border2)",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                letterSpacing: "0.02em",
                textDecoration: "none",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--text)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border2)")
              }
            >
              Read the Blog
            </Link>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginTop: "56px",
              paddingTop: "40px",
              borderTop: "1px solid var(--border)",
            }}
          >
            {(
              [
                { n: "12+", l: "Projects shipped" },
                { n: "5", l: "Certifications" },
                { n: "2y", l: "AI / LLM focus" },
              ] as const
            ).map(({ n, l }) => (
              <div key={l}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "36px",
                    fontWeight: 400,
                    color: "var(--accent)",
                    lineHeight: 1,
                  }}
                >
                  {n}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — terminal card */}
        <TerminalCard />

        {/* Scroll hint */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: "1px",
              height: "48px",
              background: "linear-gradient(to bottom, var(--accent), transparent)",
              animation: "scroll-down 2s ease-in-out infinite",
            }}
          />
          Scroll
        </div>
      </section>

      {/* ── FEATURED PROJECTS ────────────────────────────────── */}
      {featured.length > 0 && (
        <section
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "80px 48px 120px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: "40px",
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
                Selected Work
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "36px",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                }}
              >
                Featured Projects
              </h2>
            </div>
            <Link
              to="/projects"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--accent)",
                textDecoration: "none",
                letterSpacing: "0.04em",
              }}
            >
              View all →
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "24px",
            }}
          >
            {featured.map((project) => (
              <Link
                key={project.id}
                to="/projects/$slug"
                params={{ slug: project.slug }}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)",
                    overflow: "hidden",
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
                      height: "180px",
                      background: "linear-gradient(135deg, var(--surface2), #1a1a2e)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "rgba(200,255,71,0.3)",
                      letterSpacing: "0.08em",
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
                  <div style={{ padding: "24px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {(project.tags ?? []).slice(0, 3).map((tag) => (
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
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ── Terminal card component ─────────────────────────────────── */
function TerminalCard() {
  const codeLines: Array<{ tokens: Array<{ type: string; text: string }> }> = [
    { tokens: [{ type: "cm", text: "# ── Stack ──────────────────" }] },
    {
      tokens: [
        { type: "kw", text: "stack" },
        { type: "plain", text: " = {" },
      ],
    },
    {
      tokens: [
        { type: "plain", text: '  "' },
        { type: "str", text: "backend" },
        { type: "plain", text: '": [' },
        { type: "str", text: '"FastAPI"' },
        { type: "plain", text: ", " },
        { type: "str", text: '"Python 3.12"' },
        { type: "plain", text: "]," },
      ],
    },
    {
      tokens: [
        { type: "plain", text: '  "' },
        { type: "str", text: "ai" },
        { type: "plain", text: '": [' },
        { type: "str", text: '"OpenAI"' },
        { type: "plain", text: ", " },
        { type: "str", text: '"pgvector"' },
        { type: "plain", text: "]," },
      ],
    },
    {
      tokens: [
        { type: "plain", text: '  "' },
        { type: "str", text: "frontend" },
        { type: "plain", text: '": [' },
        { type: "str", text: '"React 19"' },
        { type: "plain", text: ", " },
        { type: "str", text: '"TypeScript"' },
        { type: "plain", text: "]," },
      ],
    },
    { tokens: [{ type: "plain", text: "}" }] },
    { tokens: [{ type: "plain", text: " " }] },
    { tokens: [{ type: "cm", text: "# ── Current focus ──────────" }] },
    {
      tokens: [
        { type: "kw", text: "async def" },
        { type: "plain", text: " " },
        { type: "fn", text: "ship" },
        { type: "plain", text: "():" },
      ],
    },
    {
      tokens: [
        { type: "plain", text: "  " },
        { type: "kw", text: "await" },
        { type: "plain", text: " " },
        { type: "fn", text: "build_rag_pipeline" },
        { type: "plain", text: "()" },
      ],
    },
    {
      tokens: [
        { type: "plain", text: "  " },
        { type: "kw", text: "await" },
        { type: "plain", text: " " },
        { type: "fn", text: "deploy_agents" },
        { type: "plain", text: "(" },
      ],
    },
    {
      tokens: [
        { type: "plain", text: "    model=" },
        { type: "str", text: '"gpt-4o"' },
        { type: "plain", text: ", tools=" },
        { type: "num", text: "∞" },
      ],
    },
    { tokens: [{ type: "plain", text: "  )" }] },
  ];

  const tokenColors: Record<string, string> = {
    kw: "#a78bfa",
    str: "var(--accent)",
    fn: "#60a5fa",
    cm: "#3d3d44",
    num: "#f97316",
    plain: "var(--muted)",
  };

  const chips = [
    { label: "FastAPI", variant: "lime" },
    { label: "LangChain", variant: "lime" },
    { label: "React 19", variant: "blue" },
    { label: "pgvector", variant: "blue" },
    { label: "OpenAI", variant: "gray" },
    { label: "Python 3.12", variant: "gray" },
  ];

  const chipStyles: Record<string, React.CSSProperties> = {
    lime: {
      background: "rgba(200,255,71,0.1)",
      color: "var(--accent)",
      border: "1px solid rgba(200,255,71,0.2)",
    },
    blue: {
      background: "rgba(61,90,254,0.15)",
      color: "#818cf8",
      border: "1px solid rgba(61,90,254,0.25)",
    },
    gray: {
      background: "rgba(255,255,255,0.04)",
      color: "var(--muted)",
      border: "1px solid var(--border)",
    },
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#ff5f57",
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#febc2e",
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#28c840",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--muted)",
            marginLeft: "auto",
            marginRight: "auto",
            letterSpacing: "0.06em",
          }}
        >
          profile.py
        </span>
      </div>

      {/* Code body */}
      <div style={{ padding: "28px" }}>
        {codeLines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              lineHeight: 2,
            }}
          >
            {line.tokens.map((token, j) => (
              <span key={j} style={{ color: tokenColors[token.type] ?? "var(--muted)" }}>
                {token.text}
              </span>
            ))}
          </div>
        ))}

        {/* Skill chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "24px",
          }}
        >
          {chips.map(({ label, variant }) => (
            <span
              key={label}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                padding: "5px 12px",
                borderRadius: "4px",
                letterSpacing: "0.04em",
                ...chipStyles[variant],
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

import type React from "react";

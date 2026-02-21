import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { QueryClient } from "@tanstack/react-query";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: "var(--nav-h)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(10,10,11,0.7)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            letterSpacing: "-0.01em",
            textDecoration: "none",
            color: "var(--text)",
          }}
        >
          lhajoosten<span style={{ color: "var(--accent)" }}>.</span>
        </Link>

        {/* Nav links */}
        <ul
          style={{
            display: "flex",
            gap: "32px",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {(
            [
              { to: "/projects", label: "Projects" },
              { to: "/blog", label: "Blog" },
              { to: "/certifications", label: "Certifications" },
              { to: "/about", label: "About" },
            ] as const
          ).map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                style={{ textDecoration: "none" }}
                activeProps={{
                  style: {
                    color: "var(--accent)",
                  },
                }}
              >
                {({ isActive }) => (
                  <span
                    style={{
                      fontSize: "14px",
                      color: isActive ? "var(--accent)" : "var(--muted)",
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLSpanElement).style.color = "var(--text)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLSpanElement).style.color = "var(--muted)";
                    }}
                  >
                    {label}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href="mailto:luc@hajoosten.nl"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            letterSpacing: "0.08em",
            padding: "8px 18px",
            background: "var(--accent)",
            color: "#000",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
            textTransform: "uppercase",
            textDecoration: "none",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.85")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
        >
          Hire Me
        </a>
      </nav>

      <main>
        <Outlet />
      </main>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
}

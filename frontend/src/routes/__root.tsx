import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { QueryClient } from "@tanstack/react-query";

import { useAuthContext } from "@/hooks/useAuth";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

// ---------------------------------------------------------------------------
// Nav links — static data
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { to: "/projects", label: "Projects" },
  { to: "/blog", label: "Blog" },
  { to: "/certifications", label: "Certifications" },
  { to: "/about", label: "About" },
] as const;

// ---------------------------------------------------------------------------
// AdminNav — auth-aware right side of the nav bar
// ---------------------------------------------------------------------------

/**
 * Renders the right side of the nav bar depending on auth state:
 *
 * | State        | Renders                                  |
 * |--------------|------------------------------------------|
 * | loading      | Skeleton placeholder (no flicker)        |
 * | unauthenticated | "Admin" button → /login               |
 * | authenticated   | CMS link + user pill + Sign out       |
 */
function AdminNav() {
  const { isAuthenticated, isLoading, user, logout } = useAuthContext();

  // While the session check is in-flight render a neutral placeholder so the
  // nav doesn't shift layout when the user pill appears.
  if (isLoading) {
    return (
      <div
        style={{
          width: "72px",
          height: "32px",
          borderRadius: "4px",
          background: "var(--surface2)",
          opacity: 0.4,
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <Link to="/login" className="btn-cta" style={{ fontSize: "11px", padding: "7px 16px" }}>
        Admin
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      {/* CMS dashboard link */}
      <Link
        to="/admin"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.08em",
          color: "var(--accent)",
          textDecoration: "none",
          textTransform: "uppercase",
          fontWeight: 500,
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.7")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
      >
        CMS
      </Link>

      {/* User pill — avatar + email */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "5px 12px 5px 6px",
          border: "1px solid var(--border)",
          borderRadius: "40px",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), #60a5fa)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "#000",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {user?.email?.[0]?.toUpperCase() ?? "A"}
        </div>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--muted)",
            letterSpacing: "0.04em",
            maxWidth: "140px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user?.email}
        </span>
      </div>

      {/* Sign out */}
      <button
        type="button"
        onClick={() => void logout()}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textTransform: "uppercase",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--danger)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")}
      >
        Sign out
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RootLayout
// ---------------------------------------------------------------------------

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
            flexShrink: 0,
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
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className="link-muted"
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
                activeProps={{
                  className: "",
                  style: {
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  },
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side — auth-aware */}
        <AdminNav />
      </nav>

      <main>
        <Outlet />
      </main>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
}

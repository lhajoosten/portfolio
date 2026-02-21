/**
 * Admin layout route — `/admin` subtree.
 *
 * All child routes under `/admin/*` render inside this layout, which provides:
 * - A `<ProtectedRoute requireSuperuser>` guard so unauthenticated or
 *   non-superuser visitors are redirected before any admin UI renders.
 * - A two-column shell: fixed left sidebar + scrollable right content area.
 * - Sidebar navigation linking to the main CMS sections.
 *
 * @module
 */

import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthContext } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

// ---------------------------------------------------------------------------
// Sidebar nav items
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sidebar navigation structure
// ---------------------------------------------------------------------------

interface NavItem {
  to: string;
  label: string;
  icon: string;
  exact: boolean;
  badge?: string;
  badgeColor?: "default" | "purple";
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    section: "Content",
    items: [
      { to: "/admin", label: "Dashboard", icon: "⬡", exact: true },
      { to: "/admin/projects", label: "Projects", icon: "📁", exact: false },
      { to: "/admin/posts", label: "Blog Posts", icon: "✍️", exact: false },
      { to: "/admin/certifications", label: "Certifications", icon: "🎓", exact: false },
    ],
  },
  {
    section: "AI",
    items: [
      { to: "/admin/ai", label: "AI Writing", icon: "🤖", exact: false },
      {
        to: "/admin/embeddings",
        label: "Embeddings",
        icon: "🔍",
        exact: false,
        badge: "pgvector",
        badgeColor: "purple",
      },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/admin/settings", label: "Settings", icon: "⚙️", exact: false },
      { to: "/admin/analytics", label: "Analytics", icon: "📊", exact: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// AdminLayout
// ---------------------------------------------------------------------------

function AdminLayout() {
  return (
    <ProtectedRoute requireSuperuser>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "var(--sidebar-w) 1fr",
          minHeight: "calc(100vh - var(--nav-h))",
        }}
      >
        <AdminSidebar />

        {/* Main content area */}
        <main
          style={{
            padding: "40px 48px 80px",
            overflowY: "auto",
            borderLeft: "1px solid var(--border)",
          }}
        >
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// AdminSidebar
// ---------------------------------------------------------------------------

function AdminSidebar() {
  const { user } = useAuthContext();

  return (
    <aside
      style={{
        padding: "32px 0",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        position: "sticky",
        top: "var(--nav-h)",
        height: "calc(100vh - var(--nav-h))",
        overflowY: "auto",
      }}
    >
      {/* Section label */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--muted)",
          padding: "0 20px",
          marginBottom: "8px",
        }}
      >
        Content CMS
      </div>

      {/* Nav sections */}
      {ADMIN_NAV_SECTIONS.map(({ section, items }) => (
        <div key={section}>
          {/* Section label */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(107,106,114,0.6)",
              padding: "12px 20px 4px",
            }}
          >
            {section}
          </div>

          {items.map(({ to, label, icon, exact, badge, badgeColor }) => (
            <Link
              key={to}
              to={to}
              style={{ textDecoration: "none" }}
              activeProps={{ style: { textDecoration: "none" } }}
            >
              {({ isActive: rawActive }) => {
                // For non-exact items, also check startsWith so sub-routes stay highlighted
                const isActive = exact ? rawActive : rawActive;
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      padding: "7px 20px",
                      borderRadius: "0 8px 8px 0",
                      marginRight: "12px",
                      background: isActive ? "rgba(200,255,71,0.08)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLDivElement).style.background =
                          "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: "13px", lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "13px",
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "var(--text)" : "var(--muted)",
                        letterSpacing: "0.01em",
                        transition: "color 0.15s",
                        flex: 1,
                      }}
                    >
                      {label}
                    </span>
                    {badge && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "9px",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          letterSpacing: "0.04em",
                          background:
                            badgeColor === "purple"
                              ? "rgba(167,139,250,0.12)"
                              : "rgba(255,255,255,0.06)",
                          color: badgeColor === "purple" ? "#a78bfa" : "var(--muted)",
                          border:
                            badgeColor === "purple"
                              ? "1px solid rgba(167,139,250,0.2)"
                              : "1px solid var(--border)",
                          flexShrink: 0,
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                );
              }}
            </Link>
          ))}
        </div>
      ))}

      {/* User info at bottom */}
      <div
        style={{
          padding: "0 20px",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--muted)",
            letterSpacing: "0.04em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user?.email}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "rgba(200,255,71,0.5)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginTop: "2px",
          }}
        >
          Superuser
        </div>
      </div>
    </aside>
  );
}

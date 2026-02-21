/**
 * Admin Certifications list — `/admin/certifications`
 *
 * List page with:
 * - Stats row: Total, Featured counts
 * - Search/filter input
 * - Table: Name, Issuer, Status, Issued Date, Actions (Edit / Delete)
 * - "+ New Certification" action
 *
 * Rendered inside the AdminLayout from `../route.tsx`, which applies the
 * superuser guard and sticky sidebar.
 *
 * @module
 */

import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { useCertifications, useDeleteCertification } from "@/hooks/useCertifications";
import type { CertificationResponse } from "@/lib/api/types.gen";

export const Route = createFileRoute("/admin/certifications/")({
  component: AdminCertificationsPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AdminCertificationsPage() {
  const { data: certs = [], isLoading, error } = useCertifications(false);
  const [search, setSearch] = useState("");

  const featured = certs.filter((c) => c.featured);

  const filtered = search.trim()
    ? certs.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.issuer.toLowerCase().includes(search.toLowerCase()) ||
          (c.description ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : certs;

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
            Certifications
          </h1>
        </div>

        <Link
          to="/admin/certifications/$certId"
          params={{ certId: "new" }}
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
          + New Certification
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
            label="Total"
            value={certs.length}
            delta={certs.length > 0 ? "All time" : undefined}
          />
          <StatChip
            label="Featured"
            value={featured.length}
            delta={featured.length > 0 ? "Shown on homepage" : undefined}
            accent="lime"
          />
          <StatChip
            label="Expiring Soon"
            value={
              certs.filter((c) => {
                if (!c.expires_at) return false;
                const days =
                  (new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                return days > 0 && days <= 90;
              }).length
            }
            delta="Within 90 days"
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
          Loading certifications…
        </div>
      )}

      {error && (
        <p
          role="alert"
          style={{ color: "var(--danger)", fontFamily: "var(--font-mono)", fontSize: "13px" }}
        >
          Failed to load certifications.
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
              All Certifications{" "}
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
                minWidth: "240px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1 }}>🔍</span>
              <input
                type="search"
                placeholder="Search certifications…"
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
              gridTemplateColumns: "1fr 140px 90px 110px 100px",
              padding: "10px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {["Name", "Issuer", "Featured", "Issued", "Actions"].map((h) => (
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
              {search
                ? `No certifications matching "${search}"`
                : "No certifications yet — add your first one"}
            </div>
          )}

          {/* Rows */}
          {filtered.map((cert, i) => (
            <CertRow key={cert.id} cert={cert} isLast={i === filtered.length - 1} />
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
// CertRow
// ---------------------------------------------------------------------------

interface CertRowProps {
  cert: CertificationResponse;
  isLast: boolean;
}

function CertRow({ cert, isLast }: CertRowProps) {
  const { mutate: deleteCert, isPending: isDeleting } = useDeleteCertification();

  function handleDelete() {
    if (window.confirm(`Delete "${cert.name}"? This cannot be undone.`)) {
      deleteCert({ path: { cert_id: cert.id } });
    }
  }

  const issuedLabel = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 140px 90px 110px 100px",
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
      {/* Name + description */}
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
          {cert.name}
        </div>
        {cert.description && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "320px",
            }}
          >
            {cert.description}
          </div>
        )}
      </div>

      {/* Issuer */}
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
        {cert.issuer}
      </div>

      {/* Featured chip */}
      <div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            padding: "3px 8px",
            borderRadius: "4px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background: cert.featured ? "rgba(200,255,71,0.1)" : "rgba(255,255,255,0.04)",
            color: cert.featured ? "var(--accent)" : "var(--muted)",
            border: cert.featured ? "1px solid rgba(200,255,71,0.2)" : "1px solid var(--border)",
          }}
        >
          {cert.featured ? "★ Yes" : "No"}
        </span>
      </div>

      {/* Issued date */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--muted)",
        }}
      >
        {issuedLabel}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        {/* Edit */}
        <Link
          to="/admin/certifications/$certId"
          params={{ certId: cert.id }}
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

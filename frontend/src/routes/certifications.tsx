import { createFileRoute } from "@tanstack/react-router";

import { useCertifications } from "@/hooks/useCertifications";
import type { CertificationResponse } from "@/lib/api/types.gen";

export const Route = createFileRoute("/certifications")({
  component: CertificationsPage,
});

function CertificationsPage() {
  const { data: certs = [], isLoading, error } = useCertifications();

  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "64px 48px",
        }}
      >
        <p style={{ color: "var(--muted)" }}>Loading certifications…</p>
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
        <p style={{ color: "var(--danger)" }}>Failed to load certifications.</p>
      </div>
    );
  }

  const featured = certs.filter((c) => c.featured);
  const rest = certs.filter((c) => !c.featured);
  const ordered = [...featured, ...rest];

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
            Credentials
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "52px",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            Certifications
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
          Formal credentials that validate the skills I apply every day in production.
        </p>
      </div>

      {/* Empty state */}
      {ordered.length === 0 && (
        <p
          style={{
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          No certifications yet.
        </p>
      )}

      {/* Featured row */}
      {featured.length > 0 && (
        <>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "16px",
            }}
          >
            Featured
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
              gap: "20px",
              marginBottom: "48px",
            }}
          >
            {featured.map((cert) => (
              <CertCard key={cert.id} cert={cert} highlight />
            ))}
          </div>
        </>
      )}

      {/* All certifications */}
      {rest.length > 0 && (
        <>
          {featured.length > 0 && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: "16px",
              }}
            >
              All Certifications
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "20px",
            }}
          >
            {rest.map((cert) => (
              <CertCard key={cert.id} cert={cert} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Certification card
// ---------------------------------------------------------------------------

function CertCard({
  cert,
  highlight = false,
}: {
  cert: CertificationResponse;
  highlight?: boolean;
}) {
  const isExpired = cert.expires_at ? new Date(cert.expires_at) < new Date() : false;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: highlight ? "1px solid rgba(200,255,71,0.18)" : "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        transition: "border-color 0.2s, transform 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = highlight
          ? "rgba(200,255,71,0.35)"
          : "var(--border2)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = highlight
          ? "rgba(200,255,71,0.18)"
          : "var(--border)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Top row — badge + name */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
        {cert.badge_image_url ? (
          <img
            src={cert.badge_image_url}
            alt={`${cert.name} badge`}
            style={{
              width: "56px",
              height: "56px",
              objectFit: "contain",
              borderRadius: "8px",
              flexShrink: 0,
              background: "var(--surface2)",
              padding: "4px",
            }}
          />
        ) : (
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "8px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              flexShrink: 0,
            }}
          >
            🎓
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.3,
              marginBottom: "4px",
            }}
          >
            {cert.name}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {cert.issuer}
          </div>
        </div>

        {highlight && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              padding: "3px 8px",
              borderRadius: "3px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: "rgba(200,255,71,0.1)",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            Featured
          </span>
        )}
      </div>

      {/* Description */}
      {cert.description && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            lineHeight: 1.6,
          }}
        >
          {cert.description}
        </p>
      )}

      {/* Footer — dates + verify link */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--muted)",
            flexWrap: "wrap",
          }}
        >
          <span>
            Issued{" "}
            {new Date(cert.issued_at).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
          </span>

          {cert.expires_at && (
            <>
              <span style={{ color: "var(--border2)" }}>·</span>
              <span style={{ color: isExpired ? "var(--danger)" : "var(--muted)" }}>
                {isExpired ? "Expired " : "Expires "}
                {new Date(cert.expires_at).toLocaleDateString("en-GB", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </>
          )}

          {!cert.expires_at && (
            <>
              <span style={{ color: "var(--border2)" }}>·</span>
              <span style={{ color: "#4ade80" }}>No expiry</span>
            </>
          )}
        </div>

        {cert.credential_url && (
          <a
            href={cert.credential_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.04em",
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 500,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.7")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
          >
            Verify ↗
          </a>
        )}
      </div>
    </div>
  );
}

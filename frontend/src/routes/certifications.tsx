import { createFileRoute } from "@tanstack/react-router";

import { ErrorState, LoadingState, PageContainer, PageHeader, TagPill } from "@/components/ui";
import { useCertifications } from "@/hooks/useCertifications";
import { getCertificationsApiV1CertificationsGetOptions } from "@/lib/api/@tanstack/react-query.gen";
import type { CertificationResponse } from "@/lib/api/types.gen";

// ---------------------------------------------------------------------------
// Route — with prefetch loader
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/certifications")({
  loader: ({ context: { queryClient } }) =>
    queryClient.prefetchQuery(
      getCertificationsApiV1CertificationsGetOptions({ query: { featured_only: false } }),
    ),
  component: CertificationsPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function CertificationsPage() {
  const { data: certs = [], isLoading, error } = useCertifications();

  if (isLoading) {
    return (
      <PageContainer style={{ paddingBottom: "64px" }}>
        <LoadingState message="Loading certifications…" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer style={{ paddingBottom: "64px" }}>
        <ErrorState message="Failed to load certifications." />
      </PageContainer>
    );
  }

  const featured = certs.filter((c) => c.featured);
  const rest = certs.filter((c) => !c.featured);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Credentials"
        title="Certifications"
        description="Formal credentials that validate the skills I apply every day in production."
      />

      {/* Empty state */}
      {certs.length === 0 && (
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

      {/* Featured section */}
      {featured.length > 0 && (
        <>
          <SectionLabel>Featured</SectionLabel>
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
          {featured.length > 0 && <SectionLabel>All Certifications</SectionLabel>}
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
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// SectionLabel — small mono uppercase divider label
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: string }) {
  return (
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
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CertCard
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
      className={highlight ? "card--featured" : "card"}
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        cursor: "default",
      }}
    >
      {/* Top row — badge + name + featured pill */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <CertBadge cert={cert} />

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

        {highlight && <TagPill label="Featured" variant="lime" />}
      </div>

      {/* Description */}
      {cert.description && (
        <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          {cert.description}
        </p>
      )}

      {/* Footer — dates + verify link */}
      <CertFooter cert={cert} isExpired={isExpired} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CertBadge — badge image or fallback icon
// ---------------------------------------------------------------------------

function CertBadge({ cert }: { cert: CertificationResponse }) {
  if (cert.badge_image_url) {
    return (
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
    );
  }

  return (
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
  );
}

// ---------------------------------------------------------------------------
// CertFooter — issued/expires dates + verify link
// ---------------------------------------------------------------------------

function CertFooter({ cert, isExpired }: { cert: CertificationResponse; isExpired: boolean }) {
  return (
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
      {/* Dates */}
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

        {cert.expires_at ? (
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
        ) : (
          <>
            <span style={{ color: "var(--border2)" }}>·</span>
            <span style={{ color: "#4ade80" }}>No expiry</span>
          </>
        )}
      </div>

      {/* Verify link */}
      {cert.credential_url && (
        <a
          href={cert.credential_url}
          target="_blank"
          rel="noopener noreferrer"
          className="link-accent"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.04em",
            fontWeight: 500,
          }}
        >
          Verify ↗
        </a>
      )}
    </div>
  );
}

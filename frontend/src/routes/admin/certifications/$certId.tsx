/**
 * Admin Certification Editor — `/admin/certifications/:certId`
 *
 * Form-based editor for creating and editing certification records.
 * Handles both create (`certId === "new"`) and edit modes.
 *
 * Fields: name, issuer, description, issued_at, expires_at,
 *         credential_id, credential_url, badge_image_url, featured
 *
 * @module
 */

import { useCallback, useEffect, useState } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  useCertification,
  useCreateCertification,
  useUpdateCertification,
} from "@/hooks/useCertifications";
import type { CertificationCreate, CertificationUpdate } from "@/lib/api/types.gen";

export const Route = createFileRoute("/admin/certifications/$certId")({
  component: CertificationEditorPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function CertificationEditorPage() {
  const { certId } = Route.useParams();
  const isNew = certId === "new";
  const navigate = useNavigate();

  const { data: existing, isLoading } = useCertification(isNew ? "" : certId);

  const { mutate: createCert, isPending: isCreating } = useCreateCertification();
  const { mutate: updateCert, isPending: isUpdating } = useUpdateCertification();

  const isSaving = isCreating || isUpdating;

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [description, setDescription] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [credentialUrl, setCredentialUrl] = useState("");
  const [badgeImageUrl, setBadgeImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Populate form when existing cert loads ────────────────────────────────
  useEffect(() => {
    if (existing && !isNew) {
      setName(existing.name);
      setIssuer(existing.issuer);
      setDescription(existing.description ?? "");
      setIssuedAt(existing.issued_at ?? "");
      setExpiresAt(existing.expires_at ?? "");
      setCredentialId(existing.credential_id ?? "");
      setCredentialUrl(existing.credential_url ?? "");
      setBadgeImageUrl(existing.badge_image_url ?? "");
      setFeatured(existing.featured ?? false);
      setIsDirty(false);
    }
  }, [existing, isNew]);

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!name.trim() || !issuer.trim() || !issuedAt) return;

    setSaveError(null);
    setSaveSuccess(false);

    if (isNew) {
      const body: CertificationCreate = {
        name,
        issuer,
        description: description || undefined,
        issued_at: issuedAt,
        expires_at: expiresAt || undefined,
        credential_id: credentialId || undefined,
        credential_url: credentialUrl || undefined,
        badge_image_url: badgeImageUrl || undefined,
        featured,
      };
      createCert(
        { body },
        {
          onSuccess: (created) => {
            setIsDirty(false);
            setSaveSuccess(true);
            void navigate({
              to: "/admin/certifications/$certId",
              params: { certId: created.id },
            });
          },
          onError: (err) => {
            setSaveError(
              typeof err === "object" && err !== null && "detail" in err
                ? String((err as { detail: unknown }).detail)
                : "Failed to create certification.",
            );
          },
        },
      );
    } else {
      const body: CertificationUpdate = {
        name,
        issuer,
        description: description || undefined,
        issued_at: issuedAt || undefined,
        expires_at: expiresAt || undefined,
        credential_id: credentialId || undefined,
        credential_url: credentialUrl || undefined,
        badge_image_url: badgeImageUrl || undefined,
        featured,
      };
      updateCert(
        { path: { cert_id: certId }, body },
        {
          onSuccess: () => {
            setIsDirty(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
          },
          onError: (err) => {
            setSaveError(
              typeof err === "object" && err !== null && "detail" in err
                ? String((err as { detail: unknown }).detail)
                : "Failed to update certification.",
            );
          },
        },
      );
    }
  }, [
    name,
    issuer,
    description,
    issuedAt,
    expiresAt,
    credentialId,
    credentialUrl,
    badgeImageUrl,
    featured,
    isNew,
    certId,
    createCert,
    updateCert,
    navigate,
  ]);

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (!isNew && isLoading) {
    return (
      <div
        style={{
          padding: "80px 0",
          textAlign: "center",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          letterSpacing: "0.06em",
        }}
      >
        Loading certification…
      </div>
    );
  }

  const canSave = name.trim().length > 0 && issuer.trim().length > 0 && issuedAt.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "36px",
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
            Certifications
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: "0 0 4px",
            }}
          >
            {isNew ? "New Certification" : name || "Edit Certification"}
          </h1>
          {isDirty && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.06em",
                padding: "2px 7px",
                borderRadius: "3px",
                background: "rgba(251,191,36,0.1)",
                color: "#fbbf24",
                border: "1px solid rgba(251,191,36,0.2)",
              }}
            >
              unsaved changes
            </span>
          )}
          {saveSuccess && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.06em",
                padding: "2px 7px",
                borderRadius: "3px",
                background: "rgba(200,255,71,0.1)",
                color: "var(--accent)",
                border: "1px solid rgba(200,255,71,0.2)",
              }}
            >
              saved ✓
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href="/admin/certifications"
            onClick={(e) => {
              e.preventDefault();
              if (!isDirty || window.confirm("Discard unsaved changes?")) {
                void navigate({ to: "/admin/certifications" });
              }
            }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.04em",
              padding: "8px 16px",
              background: "transparent",
              color: "var(--muted)",
              border: "1px solid var(--border2)",
              borderRadius: "6px",
              cursor: "pointer",
              textDecoration: "none",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border2)";
            }}
          >
            ← Back
          </a>

          {saveError && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--danger)",
                maxWidth: "240px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {saveError}
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !canSave}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.06em",
              padding: "8px 24px",
              background: "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: isSaving || !canSave ? "not-allowed" : "pointer",
              fontWeight: 600,
              transition: "opacity 0.2s",
              opacity: isSaving || !canSave ? 0.5 : 1,
            }}
          >
            {isSaving ? "Saving…" : isNew ? "Create" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Two-column form layout ─────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* ── Left: Main fields ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Core info card */}
          <FormCard title="Certification Info">
            <FormField label="Name *" hint="Full certification title">
              <input
                type="text"
                placeholder="e.g. AWS Certified Solutions Architect"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsDirty(true);
                }}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Issuer *" hint="Organisation that issued it">
              <input
                type="text"
                placeholder="e.g. Amazon Web Services"
                value={issuer}
                onChange={(e) => {
                  setIssuer(e.target.value);
                  setIsDirty(true);
                }}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Description" hint="Optional brief description">
              <textarea
                placeholder="A short description of what this certification covers…"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsDirty(true);
                }}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </FormField>
          </FormCard>

          {/* Dates card */}
          <FormCard title="Dates">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <FormField label="Issued At *" hint="Date the cert was issued">
                <input
                  type="date"
                  value={issuedAt}
                  onChange={(e) => {
                    setIssuedAt(e.target.value);
                    setIsDirty(true);
                  }}
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Expires At" hint="Leave blank if it does not expire">
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => {
                    setExpiresAt(e.target.value);
                    setIsDirty(true);
                  }}
                  style={inputStyle}
                />
              </FormField>
            </div>

            {expiresAt && <ExpiryStatus expiresAt={expiresAt} />}
          </FormCard>

          {/* Credential card */}
          <FormCard title="Credential Details">
            <FormField label="Credential ID" hint="ID shown on the certificate">
              <input
                type="text"
                placeholder="e.g. ABC-123-XYZ"
                value={credentialId}
                onChange={(e) => {
                  setCredentialId(e.target.value);
                  setIsDirty(true);
                }}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Credential URL" hint="Link to verify the credential">
              <input
                type="url"
                placeholder="https://www.credly.com/badges/…"
                value={credentialUrl}
                onChange={(e) => {
                  setCredentialUrl(e.target.value);
                  setIsDirty(true);
                }}
                style={inputStyle}
              />
            </FormField>
          </FormCard>
        </div>

        {/* ── Right: Sidebar ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Featured toggle card */}
          <FormCard title="Visibility">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "var(--text)",
                    fontWeight: 500,
                    marginBottom: "2px",
                  }}
                >
                  Featured
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--muted)",
                  }}
                >
                  Show on homepage
                </div>
              </div>
              <Toggle
                value={featured}
                onChange={(v) => {
                  setFeatured(v);
                  setIsDirty(true);
                }}
              />
            </div>

            {featured && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--accent)",
                  background: "rgba(200,255,71,0.07)",
                  border: "1px solid rgba(200,255,71,0.15)",
                  borderRadius: "5px",
                  padding: "8px 10px",
                  letterSpacing: "0.03em",
                }}
              >
                ★ This certification will appear on your homepage and certifications section.
              </div>
            )}
          </FormCard>

          {/* Badge image card */}
          <FormCard title="Badge Image">
            <FormField label="Image URL" hint="Badge / logo image URL">
              <input
                type="url"
                placeholder="https://…"
                value={badgeImageUrl}
                onChange={(e) => {
                  setBadgeImageUrl(e.target.value);
                  setIsDirty(true);
                }}
                style={inputStyle}
              />
            </FormField>

            {badgeImageUrl && (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  justifyContent: "center",
                  padding: "16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <img
                  src={badgeImageUrl}
                  alt="Badge preview"
                  style={{
                    maxWidth: "120px",
                    maxHeight: "120px",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </FormCard>

          {/* Credential URL preview */}
          {credentialUrl && (
            <FormCard title="Verify Link">
              <a
                href={credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--accent)",
                  textDecoration: "none",
                  letterSpacing: "0.03em",
                  borderBottom: "1px solid rgba(200,255,71,0.3)",
                  paddingBottom: "1px",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.7")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")}
              >
                🔗 View credential ↗
              </a>
            </FormCard>
          )}

          {/* Metadata (edit mode only) */}
          {!isNew && existing && (
            <FormCard title="Metadata">
              <MetaInfo label="ID" value={existing.id} mono />
              <MetaInfo
                label="Created"
                value={new Date(existing.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
              <MetaInfo
                label="Updated"
                value={new Date(existing.updated_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            </FormCard>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpiryStatus
// ---------------------------------------------------------------------------

function ExpiryStatus({ expiresAt }: { expiresAt: string }) {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--danger)",
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: "5px",
          padding: "6px 10px",
          marginTop: "8px",
          letterSpacing: "0.03em",
        }}
      >
        ⚠ Expired {Math.abs(daysLeft)} days ago
      </div>
    );
  }

  if (daysLeft <= 90) {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "#fbbf24",
          background: "rgba(251,191,36,0.06)",
          border: "1px solid rgba(251,191,36,0.15)",
          borderRadius: "5px",
          padding: "6px 10px",
          marginTop: "8px",
          letterSpacing: "0.03em",
        }}
      >
        ⏳ Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        color: "var(--accent)",
        background: "rgba(200,255,71,0.05)",
        border: "1px solid rgba(200,255,71,0.12)",
        borderRadius: "5px",
        padding: "6px 10px",
        marginTop: "8px",
        letterSpacing: "0.03em",
      }}
    >
      ✓ Valid for {daysLeft} days
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: "24px" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "18px",
          paddingBottom: "10px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>{children}</div>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          marginBottom: "5px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {label}
        {hint && <span style={{ color: "rgba(107,106,114,0.6)", fontSize: "9px" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function MetaInfo({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--muted)",
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
          fontSize: "10px",
          color: "var(--text)",
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        position: "relative",
        width: "40px",
        height: "22px",
        borderRadius: "11px",
        background: value ? "var(--accent)" : "var(--surface2)",
        border: `1px solid ${value ? "rgba(200,255,71,0.4)" : "var(--border2)"}`,
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: value ? "19px" : "3px",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: value ? "#000" : "var(--muted)",
          transition: "left 0.2s, background 0.2s",
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Shared input style
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "8px 10px",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  color: "var(--text)",
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

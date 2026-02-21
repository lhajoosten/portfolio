/**
 * Admin Project Editor — `/admin/projects/:projectSlug`
 *
 * Full-screen three-panel editor rendered as a fixed overlay on top of the
 * admin layout shell.  Handles both create (`projectSlug === "new"`) and
 * edit modes using the same component.
 *
 * Panels:
 *   1. Meta sidebar (left, 220 px) — status, featured, URLs, tags, embedding info
 *   2. TipTap rich-text editor (centre, flex 1) — title, slug, description, body
 *   3. AI Writing Assistant (right, 320 px) — SSE-streamed chat wired to vLLM
 *
 * @module
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useCreateProject, useProject, useUpdateProject } from "@/hooks/useProjects";
import { useAiWrite } from "@/hooks/useAiWrite";
import type { WriteMode } from "@/hooks/useAiWrite";
import { useEmbedStatus, useReEmbed } from "@/hooks/useEmbedding";
import type { ProjectCreate, ProjectUpdate } from "@/lib/api/types.gen";

export const Route = createFileRoute("/admin/projects/$projectSlug")({
  component: ProjectEditorPage,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Superset of WriteMode — "qa" is mapped to "write" when calling the backend. */
type AiMode = "write" | "improve" | "summarise" | "qa";

interface AiMessage {
  role: "assistant" | "user";
  content: string;
  streaming?: boolean;
}

const INITIAL_AI_MESSAGES: AiMessage[] = [
  {
    role: "assistant",
    content:
      'I can write, improve or summarise your project content. What should I focus on?\n\nTry: "Write a technical overview highlighting the architecture" or "Make this more compelling for recruiters".',
  },
];

const AI_MODES: { id: AiMode; label: string }[] = [
  { id: "write", label: "Write" },
  { id: "improve", label: "Improve" },
  { id: "summarise", label: "Summarise" },
  { id: "qa", label: "Q&A" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function ProjectEditorPage() {
  const { projectSlug } = Route.useParams();
  const isNew = projectSlug === "new";
  const navigate = useNavigate();

  // Only fetch when editing an existing project
  const { data: existing, isLoading: isLoadingProject } = useProject(isNew ? "" : projectSlug);

  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();

  const isSaving = isCreating || isUpdating;

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [liveUrl, setLiveUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [slugWasManuallyEdited, setSlugWasManuallyEdited] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── AI panel state ────────────────────────────────────────────────────────
  const [aiMode, setAiMode] = useState<AiMode>("write");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(INITIAL_AI_MESSAGES);
  const [aiInput, setAiInput] = useState("");
  const [hasAiResponse, setHasAiResponse] = useState(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const { write: streamAi, isStreaming, abort: abortStream } = useAiWrite();

  // ── AI panel resize ───────────────────────────────────────────────────────
  const [aiPanelWidth, setAiPanelWidth] = useState(320);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = aiPanelWidth;

      const onMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = dragStartX.current - moveEvent.clientX;
        setAiPanelWidth(Math.max(260, Math.min(640, dragStartWidth.current + delta)));
      };
      const onUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [aiPanelWidth],
  );

  // ── Embedding ─────────────────────────────────────────────────────────────
  const { data: embedStatus, isLoading: isLoadingEmbed } = useEmbedStatus();
  const { reEmbed, isReEmbedding, lastResult: reEmbedResult, error: reEmbedError } = useReEmbed();

  // ── TipTap editor ─────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "Write the full project description here…",
      }),
      Typography,
    ],
    content: "",
    onUpdate: () => setIsDirty(true),
    editorProps: {
      attributes: {
        class: "tiptap-editor-body",
        spellcheck: "true",
      },
    },
  });

  // ── Populate form when existing project loads ─────────────────────────────
  useEffect(() => {
    if (!existing || isNew) return;
    setTitle(existing.title);
    setSlug(existing.slug);
    setDescription(existing.description);
    setPublished(existing.published ?? false);
    setFeatured(existing.featured ?? false);
    setLiveUrl(existing.live_url ?? "");
    setRepoUrl(existing.repo_url ?? "");
    setTags(existing.tags ?? []);
    setTechStack(existing.tech_stack ?? []);
    setSlugWasManuallyEdited(true); // don't overwrite loaded slug
    editor?.commands.setContent(existing.content ?? "");
    setIsDirty(false);
  }, [existing, isNew, editor]);

  // ── Auto-generate slug from title ─────────────────────────────────────────
  useEffect(() => {
    if (!slugWasManuallyEdited && isNew) {
      setSlug(slugify(title));
    }
  }, [title, slugWasManuallyEdited, isNew]);

  // Scroll AI chat to bottom when messages change
  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // ── Save handlers ─────────────────────────────────────────────────────────
  const handleSave = useCallback(
    (publish: boolean) => {
      const content = editor?.getHTML() ?? "";

      if (isNew) {
        const body: ProjectCreate = {
          title,
          description,
          content,
          slug: slug || slugify(title),
          tags,
          tech_stack: techStack,
          live_url: liveUrl || null,
          repo_url: repoUrl || null,
          featured,
          published: publish,
        };
        createProject(
          { body },
          {
            onSuccess: () => {
              setIsDirty(false);
              void navigate({ to: "/admin/projects" });
            },
          },
        );
      } else if (existing) {
        const body: ProjectUpdate = {
          title,
          description,
          content,
          tags,
          tech_stack: techStack,
          live_url: liveUrl || null,
          repo_url: repoUrl || null,
          featured,
          published: publish,
        };
        updateProject(
          { path: { slug: existing.slug }, body },
          {
            onSuccess: () => {
              setIsDirty(false);
            },
          },
        );
      }
    },
    [
      editor,
      isNew,
      existing,
      title,
      description,
      slug,
      tags,
      techStack,
      liveUrl,
      repoUrl,
      featured,
      createProject,
      updateProject,
      navigate,
    ],
  );

  // ── Tag helpers ───────────────────────────────────────────────────────────
  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, "");
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setIsDirty(true);
      }
      setTagInput("");
    }
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
    setIsDirty(true);
  }

  // ── AI send — streams from vLLM via SSE ───────────────────────────────────
  // ── Core streaming helper — called by both the chat input and toolbar buttons ─
  function handleAiQuickSend(prompt: string, mode: AiMode, context?: string) {
    if (isStreaming) return;

    setAiMode(mode);

    const backendMode: WriteMode = mode === "qa" ? "write" : mode;

    const userMsg: AiMessage = { role: "user", content: prompt };
    const streamingMsg: AiMessage = { role: "assistant", content: "", streaming: true };
    setAiMessages((prev) => [...prev, userMsg, streamingMsg]);
    setHasAiResponse(true);

    void streamAi({
      prompt,
      mode: backendMode,
      context,
      onToken: (chunk) => {
        setAiMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + chunk };
          }
          return next;
        });
      },
      onDone: () => {
        setAiMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
      },
      onError: (message) => {
        setAiMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: `⚠ ${message}`,
              streaming: false,
            };
          }
          return next;
        });
      },
    });
  }

  function handleAiSend() {
    const text = aiInput.trim();
    if (!text || isStreaming) return;
    setAiInput("");
    // For improve/summarise, pass the current editor HTML as grounding context.
    const context =
      aiMode === "improve" || aiMode === "summarise" ? (editor?.getHTML() ?? undefined) : undefined;
    handleAiQuickSend(text, aiMode, context);
  }

  // ── Toolbar quick-action handlers ─────────────────────────────────────────

  function handleToolbarGenerate() {
    const prompt = title.trim()
      ? `Write detailed, engaging content for a portfolio project titled: "${title}". Include an overview of the project, the technical challenges solved, key features, and the technologies used.`
      : "Write a detailed project description for a portfolio project.";
    handleAiQuickSend(prompt, "write", undefined);
  }

  function handleToolbarImprove() {
    const sel = editor?.state.selection;
    const hasSelection = sel && !sel.empty;
    const selectedText = hasSelection ? editor!.state.doc.textBetween(sel.from, sel.to, " ") : "";
    const context = editor?.getHTML() ?? undefined;
    const prompt =
      hasSelection && selectedText.trim()
        ? `Improve the following selected text to be clearer, more concise, and more engaging:\n\n${selectedText}`
        : "Improve the existing project description to be clearer, more engaging, and better structured.";
    handleAiQuickSend(prompt, "improve", context);
  }

  function handleToolbarSummarise() {
    const context = editor?.getHTML() ?? undefined;
    handleAiQuickSend(
      "Write a concise 2–3 sentence summary of this project suitable for a portfolio listing.",
      "summarise",
      context,
    );
  }

  // ── AI insert helpers ─────────────────────────────────────────────────────

  /** The text content of the last assistant message (used for Insert/Replace). */
  function lastAiText(): string {
    const msgs = [...aiMessages].reverse();
    return msgs.find((m) => m.role === "assistant")?.content ?? "";
  }

  function handleInsertBelow() {
    const text = lastAiText();
    if (!text || !editor) return;
    editor.chain().focus().insertContent(text).run();
  }

  function handleReplaceAll() {
    const text = lastAiText();
    if (!text || !editor) return;
    editor.chain().focus().setContent(text).run();
    setIsDirty(true);
  }

  function handleAppend() {
    const text = lastAiText();
    if (!text || !editor) return;
    editor
      .chain()
      .focus()
      .setTextSelection(editor.state.doc.content.size)
      .insertContent(text)
      .run();
  }

  // ── Toolbar helper ────────────────────────────────────────────────────────
  function ToolbarBtn({
    onClick,
    active,
    children,
    ai,
    title: btnTitle,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    ai?: boolean;
    title?: string;
  }) {
    return (
      <button
        type="button"
        title={btnTitle}
        onMouseDown={(e) => {
          e.preventDefault(); // don't blur editor
          onClick();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: ai ? "var(--font-mono)" : "var(--font-body)",
          fontSize: ai ? "11px" : "12px",
          fontWeight: ai ? 500 : 600,
          letterSpacing: ai ? "0.04em" : 0,
          padding: ai ? "4px 10px" : "4px 8px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
          background: active
            ? "rgba(200,255,71,0.12)"
            : ai
              ? "rgba(200,255,71,0.06)"
              : "transparent",
          color: active ? "var(--accent)" : ai ? "var(--accent)" : "var(--muted)",
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = ai
              ? "rgba(200,255,71,0.1)"
              : "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "var(--text)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = ai ? "rgba(200,255,71,0.06)" : "transparent";
            e.currentTarget.style.color = ai ? "var(--accent)" : "var(--muted)";
          }
        }}
      >
        {children}
      </button>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!isNew && isLoadingProject) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          top: "var(--nav-h)",
          zIndex: 50,
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          color: "var(--muted)",
          letterSpacing: "0.04em",
        }}
      >
        Loading project…
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        top: "var(--nav-h)",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Editor top bar ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: "48px",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => void navigate({ to: "/admin/projects" })}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: "13px",
              fontFamily: "var(--font-body)",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--text)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")
            }
          >
            ← Projects
          </button>
          <span style={{ color: "var(--border2)", fontSize: "14px" }}>|</span>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text)",
              fontFamily: "var(--font-body)",
            }}
          >
            {isNew ? "New Project" : "Edit Project"}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "3px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: published ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)",
              color: published ? "#4ade80" : "var(--muted)",
              border: published ? "1px solid rgba(74,222,128,0.2)" : "1px solid var(--border)",
            }}
          >
            {published ? "Published" : "Draft"}
          </span>
          {isDirty && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--warn)",
                letterSpacing: "0.04em",
              }}
            >
              • Unsaved changes
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave(false)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              padding: "6px 16px",
              background: "transparent",
              color: "var(--muted)",
              border: "1px solid var(--border2)",
              borderRadius: "6px",
              cursor: isSaving ? "not-allowed" : "pointer",
              transition: "border-color 0.15s, color 0.15s",
              opacity: isSaving ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.borderColor = "var(--text)";
                e.currentTarget.style.color = "var(--text)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            {isSaving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave(true)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              padding: "6px 18px",
              background: "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: isSaving ? "not-allowed" : "pointer",
              fontWeight: 600,
              transition: "opacity 0.2s",
              opacity: isSaving ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSaving) e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = isSaving ? "0.6" : "1";
            }}
          >
            Publish →
          </button>
        </div>
      </div>

      {/* ── Three-panel body ───────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `220px 1fr 4px ${aiPanelWidth}px`,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* ════════════════════════════════════════════════════════
            LEFT — Meta sidebar
            ════════════════════════════════════════════════════════ */}
        <aside
          style={{
            borderRight: "1px solid var(--border)",
            overflowY: "auto",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          {/* Publish */}
          <MetaSection title="Publish">
            {/* Status */}
            <MetaField label="Status">
              <div style={{ display: "flex", gap: "6px" }}>
                <StatusChip
                  label="Draft"
                  active={!published}
                  onClick={() => {
                    setPublished(false);
                    setIsDirty(true);
                  }}
                  variant="gray"
                />
                <StatusChip
                  label="Published"
                  active={published}
                  onClick={() => {
                    setPublished(true);
                    setIsDirty(true);
                  }}
                  variant="lime"
                />
              </div>
            </MetaField>

            {/* Featured toggle */}
            <MetaField label="">
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Featured
                </span>
                <Toggle
                  on={featured}
                  onChange={(v) => {
                    setFeatured(v);
                    setIsDirty(true);
                  }}
                />
              </div>
            </MetaField>
          </MetaSection>

          {/* Meta */}
          <MetaSection title="Meta">
            <MetaField label="GitHub URL">
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="https://github.com/…"
                style={metaInputStyle}
              />
            </MetaField>
            <MetaField label="Live Demo">
              <input
                type="url"
                value={liveUrl}
                onChange={(e) => {
                  setLiveUrl(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="https://…"
                style={metaInputStyle}
              />
            </MetaField>
          </MetaSection>

          {/* Tags */}
          <MetaSection title="Tags">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  title={`Remove "${tag}"`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    padding: "3px 7px",
                    borderRadius: "3px",
                    background: "rgba(61,90,254,0.12)",
                    color: "#818cf8",
                    border: "1px solid rgba(61,90,254,0.2)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,77,77,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(61,90,254,0.12)")}
                >
                  {tag} ×
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag, press Enter"
              style={{ ...metaInputStyle, fontSize: "11px" }}
            />
          </MetaSection>

          {/* Tech Stack */}
          <MetaSection title="Tech Stack">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
              {techStack.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => {
                    setTechStack(techStack.filter((t) => t !== tech));
                    setIsDirty(true);
                  }}
                  title={`Remove "${tech}"`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    padding: "3px 7px",
                    borderRadius: "3px",
                    background: "rgba(200,255,71,0.08)",
                    color: "var(--accent)",
                    border: "1px solid rgba(200,255,71,0.15)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,77,77,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(200,255,71,0.08)")}
                >
                  {tech} ×
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tech, press Enter"
              style={{ ...metaInputStyle, fontSize: "11px" }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim().replace(/,/g, "");
                  if (!techStack.includes(val)) {
                    setTechStack([...techStack, val]);
                    setIsDirty(true);
                  }
                  e.currentTarget.value = "";
                }
              }}
            />
          </MetaSection>

          {/* Embedding */}
          <MetaSection title="Embedding">
            {isLoadingEmbed ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--muted)",
                  letterSpacing: "0.04em",
                }}
              >
                Loading…
              </div>
            ) : embedStatus ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  lineHeight: 2,
                  color: "var(--muted)",
                }}
              >
                <div>
                  Model:{" "}
                  <span style={{ color: "var(--text)" }}>{embedStatus.model.split("/").pop()}</span>
                </div>
                <div>
                  Dims: <span style={{ color: "var(--text)" }}>{embedStatus.dims}</span>
                </div>
                <div>
                  Projects:{" "}
                  <span
                    style={{
                      color:
                        embedStatus.projects.indexed === embedStatus.projects.total &&
                        embedStatus.projects.total > 0
                          ? "var(--accent)"
                          : "var(--warn, #fbbf24)",
                    }}
                  >
                    {embedStatus.projects.indexed}/{embedStatus.projects.total}
                  </span>
                </div>
                <div>
                  Posts:{" "}
                  <span
                    style={{
                      color:
                        embedStatus.posts.indexed === embedStatus.posts.total &&
                        embedStatus.posts.total > 0
                          ? "var(--accent)"
                          : "var(--warn, #fbbf24)",
                    }}
                  >
                    {embedStatus.posts.indexed}/{embedStatus.posts.total}
                  </span>
                </div>
                <div>
                  Certs:{" "}
                  <span
                    style={{
                      color:
                        embedStatus.certifications.indexed === embedStatus.certifications.total &&
                        embedStatus.certifications.total > 0
                          ? "var(--accent)"
                          : "var(--warn, #fbbf24)",
                    }}
                  >
                    {embedStatus.certifications.indexed}/{embedStatus.certifications.total}
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--muted)",
                  fontStyle: "italic",
                }}
              >
                Unavailable
              </div>
            )}

            {reEmbedResult && !isReEmbedding && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: reEmbedResult.errors > 0 ? "var(--warn, #fbbf24)" : "var(--accent)",
                  marginTop: "6px",
                  letterSpacing: "0.03em",
                }}
              >
                ✓ {reEmbedResult.indexed} indexed
                {reEmbedResult.errors > 0 ? `, ${reEmbedResult.errors} errors` : ""}
              </div>
            )}
            {reEmbedError && !isReEmbedding && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--danger, #ef4444)",
                  marginTop: "6px",
                }}
              >
                ⚠ {reEmbedError}
              </div>
            )}

            <button
              type="button"
              disabled={isReEmbedding || !embedStatus}
              onClick={() => void reEmbed()}
              style={{
                marginTop: "10px",
                width: "100%",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.04em",
                padding: "6px 0",
                background: isReEmbedding ? "rgba(200,255,71,0.05)" : "transparent",
                color: isReEmbedding ? "var(--accent)" : "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                cursor: isReEmbedding || !embedStatus ? "not-allowed" : "pointer",
                opacity: isReEmbedding || !embedStatus ? 0.6 : 1,
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isReEmbedding && embedStatus) {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isReEmbedding) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--muted)";
                }
              }}
            >
              {isReEmbedding ? "Indexing…" : "Re-embed →"}
            </button>
          </MetaSection>
        </aside>

        {/* ════════════════════════════════════════════════════════
            CENTRE — Editor
            ════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              padding: "6px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              active={editor?.isActive("underline")}
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </ToolbarBtn>

            <ToolbarSep />

            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor?.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              H1
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              H2
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              H3
            </ToolbarBtn>

            <ToolbarSep />

            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleCode().run()}
              active={editor?.isActive("code")}
              title="Inline code"
            >
              {"</>"}
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive("blockquote")}
              title="Blockquote"
            >
              &quot;
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              title="Bullet list"
            >
              ≡
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              active={editor?.isActive("codeBlock")}
              title="Code block"
            >
              Code
            </ToolbarBtn>

            <ToolbarSep />

            <ToolbarBtn
              ai
              onClick={handleToolbarGenerate}
              title="AI Generate — write content from the project title"
            >
              ✨ AI Generate
            </ToolbarBtn>
            <ToolbarBtn
              ai
              onClick={handleToolbarImprove}
              title="AI Improve — improve selected text or full content"
            >
              ✦ Improve
            </ToolbarBtn>
            <ToolbarBtn
              ai
              onClick={handleToolbarSummarise}
              title="AI Summarise — generate a concise project summary"
            >
              ⌥ Summarise
            </ToolbarBtn>
          </div>

          {/* Scrollable writing area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px 48px 80px",
            }}
          >
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Project title"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 4vw, 40px)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: "var(--text)",
                marginBottom: "12px",
              }}
            />

            {/* Slug row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0",
                marginBottom: "20px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                overflow: "hidden",
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--muted)",
                  padding: "6px 10px",
                  borderRight: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.02)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                lucjoosten.dev/projects/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugWasManuallyEdited(true);
                  setIsDirty(true);
                }}
                placeholder="project-slug"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--accent)",
                  padding: "6px 10px",
                  minWidth: "160px",
                }}
              />
            </div>

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Short description shown on project cards and in search results…"
              rows={3}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                borderBottom: "1px solid var(--border)",
                fontFamily: "var(--font-body)",
                fontSize: "15px",
                color: "var(--muted)",
                lineHeight: 1.7,
                resize: "none",
                padding: "0 0 16px",
                marginBottom: "24px",
              }}
            />

            {/* TipTap editor */}
            <EditorContent editor={editor} style={{ flex: 1, minHeight: "320px" }} />
          </div>
        </div>

        {/* ── Resize handle ─────────────────────────────────────── */}
        <div
          onMouseDown={onResizeStart}
          title="Drag to resize AI panel"
          style={{
            cursor: "col-resize",
            background: "var(--border)",
            flexShrink: 0,
            transition: "background 0.15s",
            userSelect: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--border)";
          }}
        />

        {/* ════════════════════════════════════════════════════════
            RIGHT — AI Writing Assistant
            ════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          {/* AI header */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              {/* Pulse dot */}
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  flexShrink: 0,
                  animation: "pulse-dot 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                AI Writing Assistant
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                  padding: "2px 7px",
                  borderRadius: "3px",
                  background: "rgba(200,255,71,0.08)",
                  color: "var(--accent)",
                  border: "1px solid rgba(200,255,71,0.15)",
                }}
              >
                qwen2.5-7b
              </span>
            </div>
          </div>

          {/* Mode tabs */}
          <div
            style={{
              display: "flex",
              gap: "2px",
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
              background: "var(--surface2)",
            }}
          >
            {AI_MODES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAiMode(id)}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                  padding: "5px 0",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  background: aiMode === id ? "rgba(200,255,71,0.1)" : "transparent",
                  color: aiMode === id ? "var(--accent)" : "var(--muted)",
                  transition: "background 0.15s, color 0.15s",
                  fontWeight: aiMode === id ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (aiMode !== id) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "var(--text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (aiMode !== id) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--muted)";
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chat messages */}
          <div
            ref={aiChatRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {aiMessages.map((msg, i) => (
              <AiBubble key={i} message={msg} />
            ))}
          </div>

          {/* Insert actions (shown once there's a response and not streaming) */}
          {hasAiResponse && !isStreaming && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                padding: "8px 12px",
                borderTop: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {(
                [
                  { label: "↓ Insert", handler: handleInsertBelow },
                  { label: "↺ Replace", handler: handleReplaceAll },
                  { label: "⊕ Append", handler: handleAppend },
                ] as const
              ).map(({ label, handler }) => (
                <button
                  key={label}
                  type="button"
                  onClick={handler}
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.04em",
                    padding: "5px 4px",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.03)",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(200,255,71,0.06)";
                    e.currentTarget.style.color = "var(--accent)";
                    e.currentTarget.style.borderColor = "rgba(200,255,71,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.color = "var(--muted)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "flex-end",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border2)",
                borderRadius: "8px",
                padding: "8px 8px 8px 12px",
              }}
            >
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAiSend();
                  }
                  if (e.key === "Escape" && isStreaming) {
                    abortStream();
                  }
                }}
                placeholder="Describe what to write or change…"
                rows={2}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  color: "var(--text)",
                  lineHeight: 1.5,
                  resize: "none",
                }}
              />
              <button
                type="button"
                onClick={isStreaming ? abortStream : handleAiSend}
                disabled={!isStreaming && !aiInput.trim()}
                title={isStreaming ? "Stop generating (Esc)" : "Send (Enter)"}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: isStreaming
                    ? "rgba(239,68,68,0.15)"
                    : aiInput.trim()
                      ? "var(--accent)"
                      : "rgba(255,255,255,0.05)",
                  color: isStreaming ? "#ef4444" : aiInput.trim() ? "#000" : "var(--muted)",
                  border: isStreaming ? "1px solid rgba(239,68,68,0.3)" : "none",
                  cursor: isStreaming || aiInput.trim() ? "pointer" : "not-allowed",
                  fontSize: isStreaming ? "10px" : "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {isStreaming ? "■" : "↑"}
              </button>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--muted)",
                marginTop: "5px",
                textAlign: "center",
                letterSpacing: "0.04em",
                opacity: 0.6,
              }}
            >
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        paddingBottom: "16px",
        marginBottom: "16px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: "12px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      {label && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--muted)",
            letterSpacing: "0.04em",
            marginBottom: "5px",
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function StatusChip({
  label,
  active,
  onClick,
  variant,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant: "lime" | "gray";
}) {
  const activeStyles =
    variant === "lime"
      ? {
          background: "rgba(200,255,71,0.12)",
          color: "var(--accent)",
          border: "1px solid rgba(200,255,71,0.25)",
        }
      : {
          background: "rgba(255,255,255,0.06)",
          color: "var(--text)",
          border: "1px solid var(--border2)",
        };

  const inactiveStyles = {
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid var(--border)",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        padding: "4px 10px",
        borderRadius: "4px",
        cursor: "pointer",
        letterSpacing: "0.06em",
        transition: "all 0.15s",
        ...(active ? activeStyles : inactiveStyles),
      }}
    >
      {label}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        position: "relative",
        width: "32px",
        height: "18px",
        borderRadius: "9px",
        background: on ? "var(--accent)" : "rgba(255,255,255,0.1)",
        border: "none",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: on ? "17px" : "3px",
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: on ? "#000" : "rgba(255,255,255,0.6)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function ToolbarSep() {
  return (
    <div
      style={{
        width: "1px",
        height: "16px",
        background: "var(--border2)",
        margin: "0 4px",
        alignSelf: "center",
        flexShrink: 0,
      }}
    />
  );
}

function AiBubble({ message }: { message: AiMessage }) {
  const isBot = message.role === "assistant";

  return (
    <div
      style={{
        background: isBot ? "var(--surface2)" : "rgba(200,255,71,0.06)",
        border: `1px solid ${isBot ? "var(--border)" : "rgba(200,255,71,0.12)"}`,
        borderRadius: isBot ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: isBot ? "var(--muted)" : "var(--accent)",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {isBot ? "Assistant" : "You"}
        {message.streaming && (
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "12px",
              background: "var(--accent)",
              animation: "blink-cursor 1s step-end infinite",
            }}
          />
        )}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text)",
          lineHeight: 1.65,
          fontFamily: "var(--font-body)",
          whiteSpace: "pre-wrap",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared style
// ---------------------------------------------------------------------------

const metaInputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
  padding: "6px 9px",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "var(--text)",
  outline: "none",
  transition: "border-color 0.15s",
};

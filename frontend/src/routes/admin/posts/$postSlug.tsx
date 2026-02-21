/**
 * Admin Blog Post Editor — `/admin/posts/:postSlug`
 *
 * Full-screen three-panel editor rendered as a fixed overlay on top of the
 * admin layout shell. Handles both create (`postSlug === "new"`) and edit
 * modes using the same component.
 *
 * Panels:
 *   1. Meta sidebar (left, 220 px) — status, cover image, tags, reading time
 *   2. TipTap rich-text editor (centre, flex 1) — title, slug, excerpt, body
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

import { useCreatePost, usePost, useUpdatePost } from "@/hooks/usePosts";
import { useAiWrite } from "@/hooks/useAiWrite";
import type { WriteMode } from "@/hooks/useAiWrite";
import { useEmbedStatus, useReEmbed } from "@/hooks/useEmbedding";
import type { PostCreate, PostUpdate } from "@/lib/api/types.gen";

export const Route = createFileRoute("/admin/posts/$postSlug")({
  component: PostEditorPage,
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
      'I can write, improve or summarise your blog post content. What should I focus on?\n\nTry: "Write an engaging intro about RAG pipelines" or "Make this more accessible for junior devs".',
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

function PostEditorPage() {
  const { postSlug } = Route.useParams();
  const isNew = postSlug === "new";
  const navigate = useNavigate();

  const { data: existing, isLoading: isLoadingPost } = usePost(isNew ? "" : postSlug);

  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();

  const isSaving = isCreating || isUpdating;

  // ── Form state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [published, setPublished] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [readingTime, setReadingTime] = useState<number | "">("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [slugWasManuallyEdited, setSlugWasManuallyEdited] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── AI state ──────────────────────────────────────────────────────────────
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
        placeholder: "Start writing your post body here…",
      }),
      Typography,
    ],
    content: "",
    onUpdate: () => {
      setIsDirty(true);
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
        spellcheck: "true",
      },
    },
  });

  // ── Populate form when existing post loads ────────────────────────────────
  useEffect(() => {
    if (existing && !isNew) {
      setTitle(existing.title);
      setSlug(existing.slug);
      setExcerpt(existing.excerpt);
      setPublished(existing.published ?? false);
      setCoverImageUrl(existing.cover_image_url ?? "");
      setReadingTime(existing.reading_time_minutes ?? "");
      setTags(existing.tags ?? []);
      setSlugWasManuallyEdited(true);
      if (editor && existing.body) {
        editor.commands.setContent(existing.body);
      }
      setIsDirty(false);
    }
  }, [existing, isNew, editor]);

  // Auto-scroll AI chat on new messages
  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // ── Auto-generate slug from title ─────────────────────────────────────────
  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      setIsDirty(true);
      if (!slugWasManuallyEdited) {
        setSlug(slugify(value));
      }
    },
    [slugWasManuallyEdited],
  );

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!title.trim()) return;

    setSaveError(null);
    setSaveSuccess(false);

    const content = editor?.getHTML() ?? "";

    if (isNew) {
      const body: PostCreate = {
        title,
        slug: slug || undefined,
        excerpt,
        body: content || undefined,
        tags,
        cover_image_url: coverImageUrl || undefined,
        reading_time_minutes: readingTime !== "" ? Number(readingTime) : undefined,
        published,
      };
      createPost(
        { body },
        {
          onSuccess: (created) => {
            setIsDirty(false);
            setSaveSuccess(true);
            void navigate({
              to: "/admin/posts/$postSlug",
              params: { postSlug: created.slug },
            });
          },
          onError: (err) => {
            setSaveError(
              typeof err === "object" && err !== null && "detail" in err
                ? String((err as { detail: unknown }).detail)
                : "Failed to save post.",
            );
          },
        },
      );
    } else {
      const body: PostUpdate = {
        title,
        slug,
        excerpt,
        body: content,
        tags,
        cover_image_url: coverImageUrl || undefined,
        reading_time_minutes: readingTime !== "" ? Number(readingTime) : undefined,
        published,
      };
      updatePost(
        { path: { slug: postSlug }, body },
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
                : "Failed to update post.",
            );
          },
        },
      );
    }
  }, [
    title,
    slug,
    excerpt,
    coverImageUrl,
    readingTime,
    tags,
    published,
    isNew,
    postSlug,
    editor,
    createPost,
    updatePost,
    navigate,
  ]);

  // ── Tag helpers ───────────────────────────────────────────────────────────
  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/,/g, "");
      if (newTag && !tags.includes(newTag)) {
        setTags((prev) => [...prev, newTag]);
        setIsDirty(true);
      }
      setTagInput("");
    }
  }

  function handleRemoveTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
    setIsDirty(true);
  }

  // ── AI send — streams from vLLM via SSE ───────────────────────────────────
  // ── Core streaming helper — called by both the chat input and toolbar buttons ──
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

  // ── Toolbar quick-action handlers ─────────────────────────────────────────

  function handleToolbarGenerate() {
    const prompt = title.trim()
      ? `Write detailed, engaging content for a blog post titled: "${title}". Include a compelling introduction, well-structured body sections, and a concise conclusion.`
      : "Write a detailed, engaging blog post.";
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
        : "Improve the existing blog post content to be clearer, more engaging, and better structured.";
    handleAiQuickSend(prompt, "improve", context);
  }

  function handleToolbarSummarise() {
    const context = editor?.getHTML() ?? undefined;
    handleAiQuickSend(
      "Write a concise 2–3 sentence summary of this blog post suitable for a listing excerpt.",
      "summarise",
      context,
    );
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

  // ── Toolbar button helper ─────────────────────────────────────────────────
  function ToolbarBtn({
    onClick,
    active,
    ai,
    title: btnTitle,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    ai?: boolean;
    title?: string;
    children: React.ReactNode;
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
          fontFamily: ai ? "var(--font-mono)" : "var(--font-mono)",
          fontSize: ai ? "11px" : "11px",
          fontWeight: ai ? 500 : 500,
          letterSpacing: ai ? "0.04em" : "0.02em",
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
          transition: "background 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = ai
              ? "rgba(200,255,71,0.1)"
              : "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = ai
              ? "rgba(200,255,71,0.06)"
              : "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = ai
              ? "var(--accent)"
              : "var(--muted)";
          }
        }}
      >
        {children}
      </button>
    );
  }

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (!isNew && isLoadingPost) {
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
          letterSpacing: "0.06em",
        }}
      >
        Loading post…
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
        zIndex: 40,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: "52px",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {/* Left: back + breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a
            href="/admin/posts"
            onClick={(e) => {
              e.preventDefault();
              if (!isDirty || window.confirm("Discard unsaved changes?")) {
                void navigate({ to: "/admin/posts" });
              }
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--border2)",
              padding: "5px 10px",
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              transition: "color 0.15s, border-color 0.15s",
              textDecoration: "none",
              borderRadius: "4px",
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
            ← Posts
          </a>
          <span style={{ color: "var(--border2)", fontSize: "14px" }}>/</span>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text)",
              fontFamily: "var(--font-body)",
            }}
          >
            {isNew ? "New Post" : title || postSlug}
          </span>
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
              unsaved
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

        {/* Right: save */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {saveError && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--danger)",
                maxWidth: "260px",
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
            disabled={isSaving || !title.trim()}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              letterSpacing: "0.06em",
              padding: "8px 22px",
              background: "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: isSaving || !title.trim() ? "not-allowed" : "pointer",
              fontWeight: 600,
              transition: "opacity 0.2s",
              opacity: isSaving || !title.trim() ? 0.5 : 1,
            }}
          >
            {isSaving ? "Saving…" : isNew ? "Publish" : "Save"}
          </button>
        </div>
      </div>

      {/* ── Three-panel body ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `220px 1fr 4px ${aiPanelWidth}px`,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* ── LEFT: Meta sidebar ──────────────────────────────────────────── */}
        <aside
          style={{
            borderRight: "1px solid var(--border)",
            overflowY: "auto",
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Status */}
          <MetaSection title="Status">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <StatusChip
                label="Published"
                active={published}
                onClick={() => {
                  setPublished(true);
                  setIsDirty(true);
                }}
              />
              <StatusChip
                label="Draft"
                active={!published}
                onClick={() => {
                  setPublished(false);
                  setIsDirty(true);
                }}
              />
            </div>
          </MetaSection>

          {/* Cover Image */}
          <MetaSection title="Cover Image">
            <MetaField label="URL">
              <input
                type="url"
                placeholder="https://…"
                value={coverImageUrl}
                onChange={(e) => {
                  setCoverImageUrl(e.target.value);
                  setIsDirty(true);
                }}
                style={metaInputStyle}
              />
            </MetaField>
            {coverImageUrl && (
              <img
                src={coverImageUrl}
                alt="Cover preview"
                style={{
                  width: "100%",
                  borderRadius: "6px",
                  marginTop: "8px",
                  border: "1px solid var(--border)",
                  objectFit: "cover",
                  maxHeight: "100px",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </MetaSection>

          {/* Reading Time */}
          <MetaSection title="Reading Time">
            <MetaField label="Minutes">
              <input
                type="number"
                placeholder="e.g. 5"
                min={1}
                max={120}
                value={readingTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setReadingTime(val === "" ? "" : Number(val));
                  setIsDirty(true);
                }}
                style={metaInputStyle}
              />
            </MetaField>
          </MetaSection>

          {/* Tags */}
          <MetaSection title="Tags">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "5px",
                marginBottom: tags.length > 0 ? "8px" : undefined,
              }}
            >
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    padding: "3px 7px",
                    borderRadius: "4px",
                    background: "rgba(200,255,71,0.07)",
                    color: "var(--accent)",
                    border: "1px solid rgba(200,255,71,0.15)",
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                  title="Click to remove"
                >
                  #{tag} ×
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tag, press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              style={{ ...metaInputStyle, fontSize: "11px" }}
            />
          </MetaSection>

          {/* Slug (read-only display in sidebar) */}
          <MetaSection title="Slug">
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--muted)",
                wordBreak: "break-all",
                lineHeight: 1.5,
              }}
            >
              {slug || "—"}
            </div>
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

        {/* ── CENTRE: Editor ───────────────────────────────────────────────── */}
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
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              title="Bold"
            >
              <b>B</b>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              title="Italic"
            >
              <i>I</i>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              active={editor?.isActive("underline")}
              title="Underline"
            >
              <u>U</u>
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleCode().run()}
              active={editor?.isActive("code")}
              title="Inline Code"
            >
              {"</>"}
            </ToolbarBtn>
            <ToolbarSep />
            {([1, 2, 3] as const).map((level) => (
              <ToolbarBtn
                key={level}
                onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
                active={editor?.isActive("heading", { level })}
                title={`Heading ${level}`}
              >
                H{level}
              </ToolbarBtn>
            ))}
            <ToolbarSep />
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              title="Bullet list"
            >
              • List
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
              title="Ordered list"
            >
              1. List
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive("blockquote")}
              title="Blockquote"
            >
              ❝
            </ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              active={editor?.isActive("codeBlock")}
              title="Code block"
            >
              Block
            </ToolbarBtn>
            <ToolbarSep />
            <ToolbarBtn
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="Horizontal rule"
            >
              —
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()} title="Undo">
              ↩
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().redo().run()} title="Redo">
              ↪
            </ToolbarBtn>

            <ToolbarSep />

            <ToolbarBtn
              ai
              onClick={handleToolbarGenerate}
              title="AI Generate — write content from the post title"
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
              title="AI Summarise — generate a concise post summary"
            >
              ⌥ Summarise
            </ToolbarBtn>
          </div>

          {/* Scrollable content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            {/* Title */}
            <input
              type="text"
              placeholder="Post title…"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "var(--font-display)",
                fontSize: "32px",
                lineHeight: 1.15,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                marginBottom: "8px",
              }}
            />

            {/* Slug editor */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  maxWidth: "100%",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--muted)",
                    padding: "5px 8px",
                    borderRight: "1px solid var(--border)",
                    background: "var(--surface)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  /blog/
                </span>
                <input
                  type="text"
                  placeholder="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugWasManuallyEdited(true);
                    setIsDirty(true);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--text)",
                    padding: "5px 8px",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            {/* Excerpt */}
            <textarea
              placeholder="Short excerpt shown in post listings…"
              value={excerpt}
              onChange={(e) => {
                setExcerpt(e.target.value);
                setIsDirty(true);
              }}
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
                lineHeight: 1.6,
                resize: "none",
                padding: "0 0 16px",
                marginBottom: "24px",
                boxSizing: "border-box",
              }}
            />

            {/* TipTap body */}
            <div style={{ flex: 1, minHeight: "320px" }}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* ── Resize handle ─────────────────────────────────────────────────── */}
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

        {/* ── RIGHT: AI Writing Assistant ──────────────────────────────────── */}
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
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
              background: "var(--surface2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "rgba(200,255,71,0.1)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                }}
              >
                🤖
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
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
                  letterSpacing: "0.06em",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  background: "rgba(200,255,71,0.08)",
                  color: "var(--accent)",
                  border: "1px solid rgba(200,255,71,0.15)",
                }}
              >
                qwen2.5-7b
              </span>
            </div>

            {/* Mode tabs */}
            <div style={{ display: "flex", gap: "4px" }}>
              {AI_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setAiMode(mode.id)}
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.04em",
                    padding: "5px 4px",
                    borderRadius: "4px",
                    border:
                      aiMode === mode.id
                        ? "1px solid rgba(200,255,71,0.3)"
                        : "1px solid var(--border)",
                    cursor: "pointer",
                    background: aiMode === mode.id ? "rgba(200,255,71,0.1)" : "transparent",
                    color: aiMode === mode.id ? "var(--accent)" : "var(--muted)",
                    fontWeight: aiMode === mode.id ? 600 : 400,
                    transition: "all 0.12s",
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat messages */}
          <div
            ref={aiChatRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {aiMessages.map((msg, i) => (
              <AiBubble key={i} message={msg} />
            ))}
          </div>

          {/* Action buttons when AI has responded and not streaming */}
          {hasAiResponse && !isStreaming && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                padding: "10px 16px",
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
                    padding: "6px",
                    borderRadius: "4px",
                    border: "1px solid var(--border2)",
                    cursor: "pointer",
                    background: "transparent",
                    color: "var(--muted)",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* AI input */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              background: "var(--surface2)",
              borderRadius: "0 0 0 0",
            }}
          >
            <textarea
              placeholder={
                aiMode === "write"
                  ? "What should I write?"
                  : aiMode === "improve"
                    ? "What should I improve?"
                    : aiMode === "summarise"
                      ? "Summarise the selected text…"
                      : "Ask a question about your content…"
              }
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
              rows={3}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                outline: "none",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text)",
                lineHeight: 1.5,
                resize: "none",
                padding: "8px 10px",
                borderRadius: "6px",
              }}
            />
            <button
              type="button"
              onClick={isStreaming ? abortStream : handleAiSend}
              disabled={!isStreaming && !aiInput.trim()}
              title={isStreaming ? "Stop generating (Esc)" : "Send (Enter)"}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "6px",
                background: isStreaming
                  ? "rgba(239,68,68,0.15)"
                  : aiInput.trim()
                    ? "var(--accent)"
                    : "var(--surface)",
                color: isStreaming ? "#ef4444" : aiInput.trim() ? "#000" : "var(--muted)",
                border: isStreaming ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--border2)",
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

          {/* Footer hint */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "var(--muted)",
              textAlign: "center",
              padding: "6px 12px 10px",
              letterSpacing: "0.04em",
              opacity: 0.6,
            }}
          >
            Enter to send · Shift+Enter for newline
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
        paddingBottom: "20px",
        marginBottom: "4px",
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
          marginBottom: "10px",
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
    <div style={{ marginBottom: "8px" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          color: "var(--muted)",
          letterSpacing: "0.06em",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function StatusChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const activeStyles: Record<string, React.CSSProperties> = {
    Published: {
      background: "rgba(200,255,71,0.1)",
      color: "var(--accent)",
      border: "1px solid rgba(200,255,71,0.25)",
    },
    Draft: {
      background: "rgba(255,255,255,0.06)",
      color: "var(--text)",
      border: "1px solid var(--border2)",
    },
  };
  const inactiveStyles: React.CSSProperties = {
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
        fontSize: "11px",
        padding: "6px 12px",
        borderRadius: "5px",
        cursor: "pointer",
        letterSpacing: "0.04em",
        transition: "all 0.12s",
        textAlign: "left",
        width: "100%",
        ...(active ? (activeStyles[label] ?? activeStyles["Draft"]) : inactiveStyles),
      }}
    >
      {label}
    </button>
  );
}

function ToolbarSep() {
  return (
    <div
      style={{
        width: "1px",
        height: "16px",
        background: "var(--border)",
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
        background: isBot ? "rgba(255,255,255,0.03)" : "rgba(200,255,71,0.04)",
        border: `1px solid ${isBot ? "var(--border)" : "rgba(200,255,71,0.12)"}`,
        borderRadius: "8px",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: isBot ? "var(--muted)" : "var(--accent)",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {isBot ? "assistant" : "you"}
        {message.streaming && (
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              background: "var(--accent)",
              borderRadius: "50%",
              animation: "pulse 1s ease-in-out infinite",
            }}
          />
        )}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text)",
          lineHeight: 1.55,
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
// Shared styles
// ---------------------------------------------------------------------------

const metaInputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
  padding: "6px 8px",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "var(--text)",
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-zinc-100">About</h1>
      <p className="mb-12 text-zinc-400">A bit about me.</p>
      <div className="prose max-w-none prose-zinc prose-invert">
        <p className="leading-relaxed text-zinc-300">
          Full-stack software engineer with a focus on AI-powered platforms. I work at the
          intersection of modern web development and LLM workflows — building tools that bring
          automation into accountancy and BI.
        </p>
      </div>
    </div>
  );
}

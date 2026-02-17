import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-zinc-100">Projects</h1>
      <p className="mb-12 text-zinc-400">Things I have built.</p>
      <div className={`grid gap-6 sm:grid-cols-2`}>
        {/* Will be populated via TanStack Query + API */}
        <p className="text-sm text-zinc-600">No projects yet.</p>
      </div>
    </div>
  );
}

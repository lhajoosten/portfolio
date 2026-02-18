import { createFileRoute } from "@tanstack/react-router";

import { useProjects } from "@/hooks/useProjects";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: projects = [], isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-zinc-400">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-red-400">Failed to load projects.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-zinc-100">Projects</h1>
      <p className="mb-12 text-zinc-400">Things I have built.</p>
      <div className="grid gap-6 sm:grid-cols-2">
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-600">No projects yet.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="rounded-xl border border-zinc-800 p-6">
              <h2 className="text-lg font-semibold text-zinc-100">{project.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{project.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

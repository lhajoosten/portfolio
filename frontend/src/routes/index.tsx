import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      {/* Hero */}
      <section className="mb-24">
        <p className="mb-4 font-mono text-sm text-emerald-400">Hey, I'm</p>
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-zinc-100">
          Luc Hajoosten
        </h1>
        <p className="mb-8 max-w-xl text-lg text-zinc-400 leading-relaxed">
          Full-stack software engineer building AI-powered platforms. 
          Specialising in Python, FastAPI, React and LLM workflows.
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/projects"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors"
          >
            View Projects
          </Link>
          <Link
            to="/about"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
          >
            About Me
          </Link>
        </div>
      </section>

      {/* Featured Projects placeholder */}
      <section>
        <h2 className="mb-8 text-sm font-mono text-zinc-500 uppercase tracking-widest">
          Featured Projects
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Projects will be loaded here via TanStack Query */}
          <div className="rounded-xl border border-zinc-800 p-6 text-zinc-600 text-sm">
            Projects loading...
          </div>
        </div>
      </section>
    </div>
  );
}

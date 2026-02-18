import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { QueryClient } from "@tanstack/react-query";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav
        className={`fixed top-0 right-0 left-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm`}
      >
        <div className={`mx-auto flex max-w-5xl items-center justify-between px-6 py-4`}>
          <Link
            to="/"
            className={`font-mono text-sm font-semibold tracking-tight text-zinc-100 hover:text-white`}
          >
            lhajoosten
          </Link>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <Link
              to="/projects"
              className={`transition-colors hover:text-zinc-100 [&.active]:text-zinc-100`}
            >
              Projects
            </Link>
            <Link
              to="/about"
              className={`transition-colors hover:text-zinc-100 [&.active]:text-zinc-100`}
            >
              About
            </Link>
            <a
              href="https://github.com/lhajoosten"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors hover:text-zinc-100`}
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>
      <main className="pt-16">
        <Outlet />
      </main>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
}

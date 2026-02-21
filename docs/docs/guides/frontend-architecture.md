# Frontend Architecture

This guide covers the frontend implementation in detail — how the React application is structured, the patterns enforced at each layer, and the reasoning behind every decision.

For the high-level overview including diagrams, see [Architecture](architecture.md).

---

## Technology stack

| Layer | Technology | Version |
|---|---|---|
| UI framework | React | 19 |
| Language | TypeScript | 5.x |
| Build tool | Vite | 7.x |
| Routing | TanStack Router | 1.x |
| Server state | TanStack Query | 5.x |
| API client | Hey API (`@hey-api/client-fetch`) | 0.13+ |
| Rich text editor | TipTap | 3.x |
| Styling | Tailwind CSS | 4.x |
| Testing | Vitest + Testing Library | 4.x |
| Package manager | pnpm | 9+ |

---

## Directory structure

```text
frontend/src/
├── routes/                    # Page-level components + TanStack Router config
│   ├── __root.tsx             # Root layout (providers, error boundary)
│   ├── index.tsx              # Public homepage
│   ├── admin/                 # Admin CMS routes (protected)
│   │   ├── projects/
│   │   ├── posts/
│   │   └── certifications/
│   └── routeTree.gen.ts       # AUTO-GENERATED — never edit
├── components/
│   ├── ui/                    # Primitive design-system components
│   └── ...                    # Feature-specific components
├── hooks/                     # Custom React hooks (TanStack Query wrappers)
│   ├── useProjects.ts
│   ├── usePosts.ts
│   └── useCertifications.ts
├── lib/
│   ├── api/                   # AUTO-GENERATED Hey API client — never edit
│   ├── api-client.ts          # Client configuration (base URL, credentials)
│   ├── constants.ts           # QUERY_KEYS, ROUTES, and other shared constants
│   ├── errors.ts              # ApiError class + error parsing utilities
│   ├── query.ts               # useAppQuery / useAppMutation wrappers
│   └── query-client.ts        # TanStack Query client singleton
└── types/
    └── index.ts               # Shared TypeScript type aliases
```

---

## Data flow

All server state follows a single top-to-bottom path:

```
Route / Page component
  → Custom hook          (useProjects, usePosts, …)
    → useAppQuery / useAppMutation   (lib/query.ts)
      → Generated TanStack options  (lib/api/@tanstack/react-query.gen.ts)
        → Hey API fetch client      (lib/api-client.ts)
          → FastAPI backend
```

### Rules enforced at every layer

| Layer | Pattern | Allowed to… | Must never… |
|---|---|---|---|
| **Route / Page** | `src/routes/**/*.tsx` | Compose hooks + render components | Call `fetch`, use `useEffect` for data fetching |
| **Domain hook** | `src/hooks/use*.ts` | Call `useAppQuery` / `useAppMutation` with generated options | Contain render logic |
| **`useAppQuery`** | `src/lib/query.ts` | Wrap TanStack Query, log errors in dev | Import from feature modules |
| **Generated client** | `src/lib/api/` | Typed fetch calls against the OpenAPI spec | Be edited by hand |

---

## Routing — TanStack Router

TanStack Router provides **file-based routing** with full TypeScript type safety.
The route tree is **auto-generated** by the Vite plugin into `routeTree.gen.ts` —
never edit that file directly.

### Adding a new route

1. Create a file in `src/routes/` following the naming convention:
   - `src/routes/projects/index.tsx` → `/projects`
   - `src/routes/projects/$slug.tsx` → `/projects/:slug`
2. Export a `Route` created with `createFileRoute`:

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const projects = useProjects()
  // …
}
```

3. The router plugin regenerates `routeTree.gen.ts` on the next `vite` hot reload.

### Protected routes

Admin routes are protected by a `beforeLoad` guard that redirects unauthenticated
users to `/login`:

```typescript
export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AdminLayout,
})
```

---

## Server state — TanStack Query

All server state is fetched, cached, and invalidated through TanStack Query.
**`useEffect` is never used for data fetching.**

### Custom hooks

Each domain has a dedicated hook file in `src/hooks/`:

```typescript
// src/hooks/useProjects.ts
import { useAppQuery, useAppMutation } from '@/lib/query'
import {
  projectsListOptions,
  projectsCreateMutation,
} from '@/lib/api/@tanstack/react-query.gen'

export function useProjects() {
  return useAppQuery(projectsListOptions())
}

export function useCreateProject() {
  return useAppMutation(projectsCreateMutation())
}
```

### `useAppQuery` and `useAppMutation`

These thin wrappers in `src/lib/query.ts` add:

- Development-only error logging
- Consistent default `staleTime` and `gcTime`
- Typed `overrides` parameter for per-call customisation

---

## API client — Hey API

The typed API client in `src/lib/api/` is **auto-generated** from the backend's
OpenAPI spec. Regenerate it whenever backend routes or schemas change:

```bash
# Requires the backend to be running on http://localhost:8000
task generate:client
```

The client is configured once in `src/lib/api-client.ts`:

```typescript
import { createClient } from '@hey-api/client-fetch'

export const apiClient = createClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: 'include',   // sends httpOnly auth cookie automatically
})
```

> **Never hand-write fetch calls.** All HTTP communication goes through the
> generated client. This guarantees type safety at every request/response boundary.

---

## Rich text editor — TipTap

The admin CMS uses [TipTap](https://tiptap.dev/) for rich content editing.
It is configured with:

- `StarterKit` — headings, bold, italic, lists, code blocks
- `Link` — hyperlink support with auto-detect
- `Underline` — underline formatting
- `Typography` — smart quotes and typographic improvements
- `Placeholder` — configurable placeholder text

### AI writing panel

An AI writing panel is embedded alongside the TipTap editor in project and post
editors. It streams tokens from the backend `/api/v1/ai/write` SSE endpoint and
appends them to the editor content in real time.

---

## Styling — Tailwind CSS 4

The project uses Tailwind CSS v4 (Vite plugin, no `postcss.config.js` needed).
Design tokens and theme customisation live in `src/index.css`.

### Conventions

- Use Tailwind utility classes directly in JSX — no CSS modules
- Use `cn()` (a `clsx` + `twMerge` wrapper) for conditional class composition
- Primitive components in `src/components/ui/` accept a `className` prop for extension
- Never use inline `style` props except for truly dynamic values (e.g. animation offsets)

---

## Error handling

### `ApiError`

All HTTP errors from the generated client are wrapped in `ApiError` from
`src/lib/errors.ts`. It carries the HTTP status code, a human-readable message,
and the raw backend error body for logging.

### `ErrorBoundary`

The root layout wraps the entire app in an `ErrorBoundary` component that catches
unhandled render errors and displays a fallback UI rather than a blank screen.

### `useAppQuery` error logging

In development mode, `useAppQuery` logs query errors to the console with the
query key and error details. In production, errors are silently caught by
TanStack Query's retry logic.

---

## Testing — Vitest

Tests live alongside the source files or in `__tests__/` subdirectories.

```bash
task test:frontend          # run all frontend tests
task test:coverage:frontend # run with coverage report
```

### Testing conventions

- **Unit tests** — test hooks and utilities in isolation using `renderHook` from Testing Library
- **Component tests** — render components with a minimal provider tree (QueryClient + Router)
- **No snapshot tests** — prefer explicit assertions over snapshots

---

## Adding a new domain to the frontend

To add a new content domain (e.g. `talks`) following the established patterns:

1. **Hook** — create `src/hooks/useTalks.ts` using generated TanStack options
2. **List page** — create `src/routes/admin/talks/index.tsx`
3. **Editor page** — create `src/routes/admin/talks/$talkId.tsx` with the TipTap editor
4. **Regenerate client** — run `task generate:client` after adding backend routes
5. **Constants** — add `QUERY_KEYS.talks` to `src/lib/constants.ts`

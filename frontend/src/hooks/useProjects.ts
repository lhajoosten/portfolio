/**
 * Domain hooks for the Projects resource.
 *
 * All hooks are thin wrappers around {@link useAppQuery} / {@link useAppMutation}
 * that pass the **generated** TanStack Query option factories from
 * `src/lib/api/@tanstack/react-query.gen.ts` directly.  There are no manual
 * `queryFn` wrappers here — the generated factories already contain the
 * correctly typed `queryFn`, `queryKey`, and `mutationFn`.
 *
 * ## Cache key strategy
 *
 * Every hook uses `QUERY_KEYS.PROJECTS` as the base key so that all
 * write hooks (`useCreateProject`, `useUpdateProject`, `useDeleteProject`)
 * can invalidate the entire projects cache with a single entry in
 * `invalidates`.
 *
 * ## Pattern
 *
 * ```ts
 * // Query:
 * export function useProjects(publishedOnly = true) {
 *   return useAppQuery(
 *     getProjectsApiV1ProjectsGetOptions({ query: { published_only: publishedOnly } })
 *   )
 * }
 *
 * // Mutation:
 * export function useCreateProject() {
 *   return useAppMutation(createProjectApiV1ProjectsPostMutation(), {
 *     invalidates: [[QUERY_KEYS.PROJECTS]],
 *   })
 * }
 * ```
 *
 * @module
 */

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import {
  createProjectApiV1ProjectsPostMutation,
  deleteProjectApiV1ProjectsSlugDeleteMutation,
  getFeaturedProjectsApiV1ProjectsFeaturedGetOptions,
  getProjectApiV1ProjectsSlugGetOptions,
  getProjectsApiV1ProjectsGetOptions,
  updateProjectApiV1ProjectsSlugPatchMutation,
} from "@/lib/api/@tanstack/react-query.gen";
import type { Options } from "@/lib/api/sdk.gen";
import type {
  CreateProjectApiV1ProjectsPostData,
  CreateProjectApiV1ProjectsPostError,
  CreateProjectApiV1ProjectsPostResponse,
  DeleteProjectApiV1ProjectsSlugDeleteData,
  DeleteProjectApiV1ProjectsSlugDeleteError,
  DeleteProjectApiV1ProjectsSlugDeleteResponse,
  HttpValidationError,
  ProjectResponse,
  UpdateProjectApiV1ProjectsSlugPatchData,
  UpdateProjectApiV1ProjectsSlugPatchError,
  UpdateProjectApiV1ProjectsSlugPatchResponse,
} from "@/lib/api/types.gen";
import { QUERY_KEYS } from "@/lib/constants";
import { useAppMutation, useAppQuery } from "@/lib/query";

// ---------------------------------------------------------------------------
// Variable type aliases — keep call sites readable
// ---------------------------------------------------------------------------

type CreateVariables = Options<CreateProjectApiV1ProjectsPostData>;
type UpdateVariables = Options<UpdateProjectApiV1ProjectsSlugPatchData>;
type DeleteVariables = Options<DeleteProjectApiV1ProjectsSlugDeleteData>;

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all projects, with an optional published-only filter.
 *
 * Maps to `GET /api/v1/projects/`.
 *
 * @param publishedOnly - When `true` (default), only published projects are
 *   returned.  Pass `false` in the admin CMS to include drafts.
 * @returns TanStack Query result containing an array of {@link ProjectResponse}.
 *
 * @example
 * ```tsx
 * function ProjectsPage() {
 *   const { data: projects = [], isLoading } = useProjects()
 *   if (isLoading) return <Spinner />
 *   return <ProjectList projects={projects} />
 * }
 * ```
 */
export function useProjects(
  publishedOnly = true,
): UseQueryResult<ProjectResponse[], HttpValidationError> {
  return useAppQuery(
    getProjectsApiV1ProjectsGetOptions({ query: { published_only: publishedOnly } }),
  );
}

/**
 * Fetch all featured, published projects.
 *
 * Maps to `GET /api/v1/projects/featured`.
 *
 * @returns TanStack Query result containing an array of featured
 *   {@link ProjectResponse} objects.
 *
 * @example
 * ```tsx
 * function HomePage() {
 *   const { data: featured = [] } = useFeaturedProjects()
 *   return <FeaturedGrid projects={featured} />
 * }
 * ```
 */
export function useFeaturedProjects(): UseQueryResult<ProjectResponse[], Error> {
  return useAppQuery(getFeaturedProjectsApiV1ProjectsFeaturedGetOptions());
}

/**
 * Fetch a single project by URL slug.
 *
 * Maps to `GET /api/v1/projects/{slug}`.
 *
 * The query is disabled when `slug` is an empty string, so it is safe to
 * call this hook before the slug is available (e.g. during route transitions).
 *
 * @param slug - The unique URL slug of the project to fetch.
 * @returns TanStack Query result containing the matching {@link ProjectResponse}.
 *   The query is in `pending` state (not `error`) when `slug` is empty.
 *
 * @example
 * ```tsx
 * function ProjectDetailPage({ slug }: { slug: string }) {
 *   const { data: project, isLoading, error } = useProject(slug)
 *   if (isLoading) return <Spinner />
 *   if (error) return <ErrorMessage error={error} />
 *   return <ProjectDetail project={project} />
 * }
 * ```
 */
export function useProject(slug: string): UseQueryResult<ProjectResponse, HttpValidationError> {
  return useAppQuery({
    ...getProjectApiV1ProjectsSlugGetOptions({ path: { slug } }),
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Create a new project.
 *
 * Maps to `POST /api/v1/projects/`.
 *
 * Automatically invalidates all project queries on success so that list
 * views refresh without a manual refetch.
 *
 * @returns TanStack mutation result.  Call `mutate({ body: {...} })` to
 *   trigger the mutation.
 *
 * @example
 * ```tsx
 * function CreateProjectForm() {
 *   const { mutate: createProject, isPending } = useCreateProject()
 *
 *   function handleSubmit(values: ProjectCreate) {
 *     createProject({ body: values })
 *   }
 *
 *   return <form onSubmit={...}> ... </form>
 * }
 * ```
 */
export function useCreateProject(): UseMutationResult<
  CreateProjectApiV1ProjectsPostResponse,
  CreateProjectApiV1ProjectsPostError,
  CreateVariables
> {
  return useAppMutation(createProjectApiV1ProjectsPostMutation(), {
    invalidates: [[QUERY_KEYS.PROJECTS]],
  });
}

/**
 * Update an existing project by slug.
 *
 * Maps to `PATCH /api/v1/projects/{slug}`.
 *
 * Only the fields provided in `body` are updated — all other fields are
 * left unchanged (the backend applies `model_dump(exclude_unset=True)`).
 *
 * Automatically invalidates all project queries on success.
 *
 * @returns TanStack mutation result.  Call
 *   `mutate({ path: { slug }, body: { title: "New title" } })` to trigger.
 *
 * @example
 * ```tsx
 * const { mutate: updateProject } = useUpdateProject()
 * updateProject({ path: { slug: "my-project" }, body: { published: true } })
 * ```
 */
export function useUpdateProject(): UseMutationResult<
  UpdateProjectApiV1ProjectsSlugPatchResponse,
  UpdateProjectApiV1ProjectsSlugPatchError,
  UpdateVariables
> {
  return useAppMutation(updateProjectApiV1ProjectsSlugPatchMutation(), {
    invalidates: [[QUERY_KEYS.PROJECTS]],
  });
}

/**
 * Delete a project by slug.
 *
 * Maps to `DELETE /api/v1/projects/{slug}`.
 *
 * Automatically invalidates all project queries on success so that the
 * deleted item disappears from list views immediately.
 *
 * @returns TanStack mutation result.  Call `mutate({ path: { slug } })` to
 *   trigger the deletion.
 *
 * @example
 * ```tsx
 * const { mutate: deleteProject } = useDeleteProject()
 * deleteProject({ path: { slug: "my-project" } })
 * ```
 */
export function useDeleteProject(): UseMutationResult<
  DeleteProjectApiV1ProjectsSlugDeleteResponse,
  DeleteProjectApiV1ProjectsSlugDeleteError,
  DeleteVariables
> {
  return useAppMutation(deleteProjectApiV1ProjectsSlugDeleteMutation(), {
    invalidates: [[QUERY_KEYS.PROJECTS]],
  });
}

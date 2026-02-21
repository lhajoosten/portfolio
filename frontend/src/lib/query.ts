/**
 * Base TanStack Query wrappers for the Portfolio application.
 *
 * Every domain hook in `src/hooks/` must use these wrappers instead of
 * calling `useQuery` / `useMutation` directly.  This gives us a single
 * place to add cross-cutting concerns (error parsing, cache invalidation)
 * without touching every hook individually.
 *
 * ## Error logging strategy
 *
 * Dev-mode error logging is handled **once** in the `QueryCache.onError` and
 * `MutationCache.onError` callbacks inside `query-client.ts`.  Those callbacks
 * fire exactly once when a query/mutation first transitions to the error state,
 * which avoids the log-spam problem that comes from logging inside a render
 * function (where the same error message would be printed on every re-render
 * while the query remains in the error state).
 *
 * ## Usage pattern
 *
 * ```ts
 * // In a domain hook — using generated queryOptions factories:
 * import { getProjectsApiV1ProjectsGetOptions } from "@/lib/api/@tanstack/react-query.gen"
 *
 * export function useProjects(publishedOnly = true) {
 *   return useAppQuery(
 *     getProjectsApiV1ProjectsGetOptions({ query: { published_only: publishedOnly } })
 *   )
 * }
 *
 * export function useCreateProject() {
 *   return useAppMutation(createProjectApiV1ProjectsPostMutation(), {
 *     invalidates: [[QUERY_KEYS.PROJECTS]],
 *   })
 * }
 * ```
 *
 * @module
 */

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import { queryClient } from "./query-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Optional overrides passed to {@link useAppMutation} to layer portfolio-
 * specific behaviour on top of the generated mutation options.
 *
 * @typeParam TData - The type of data returned by the mutation on success.
 * @typeParam TVariables - The type of variables passed to the mutation function.
 * @typeParam TError - The error type thrown on failure (defaults to `Error`).
 */
type MutationOverrides<TData, TVariables, TError> = {
  /**
   * Called after a successful mutation, **before** query invalidation.
   *
   * @param data - The data returned by the mutation.
   * @param variables - The variables that were passed to the mutation.
   */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;

  /**
   * Called when the mutation throws an error.
   *
   * @param error - The error thrown by the mutation function.
   * @param variables - The variables that were passed to the mutation.
   */
  onError?: (error: TError, variables: TVariables) => void | Promise<void>;

  /**
   * Array of query keys to invalidate via `queryClient.invalidateQueries`
   * after a successful mutation.
   *
   * Each entry is passed as the `queryKey` option to
   * `queryClient.invalidateQueries`, so it follows the same partial-key
   * matching semantics as TanStack Query.
   *
   * @example
   * ```ts
   * // Invalidate all project queries:
   * { invalidates: [[QUERY_KEYS.PROJECTS]] }
   *
   * // Invalidate a specific project:
   * { invalidates: [[QUERY_KEYS.PROJECTS, slug]] }
   * ```
   */
  invalidates?: QueryKey[];
};

// ---------------------------------------------------------------------------
// useAppQuery
// ---------------------------------------------------------------------------

/**
 * Portfolio wrapper around TanStack Query's `useQuery`.
 *
 * Drop-in replacement for `useQuery` that adds:
 * - **Generated options compatibility** — accepts the `queryOptions` objects
 *   produced by the Hey API `@tanstack/react-query` plugin
 *   (`src/lib/api/@tanstack/react-query.gen.ts`) without any wrapping.
 *
 * Error logging is intentionally absent here.  It is handled once in
 * `QueryCache.onError` inside `query-client.ts`, which fires exactly once
 * per error transition rather than on every re-render.
 *
 * All standard `useQuery` return values are passed through unchanged.
 *
 * @typeParam TData - The type of the resolved query data.
 * @typeParam TError - The error type (defaults to `Error`).
 *
 * @param options - A `UseQueryOptions` object.  Pass the generated
 *   `*Options()` factory result from `@tanstack/react-query.gen.ts` directly.
 * @returns All values from `useQuery` — `data`, `isLoading`, `error`, etc.
 *
 * @example
 * ```ts
 * // Preferred — using the generated options factory:
 * import { getProjectsApiV1ProjectsGetOptions } from "@/lib/api/@tanstack/react-query.gen"
 *
 * export function useProjects(publishedOnly = true) {
 *   return useAppQuery(
 *     getProjectsApiV1ProjectsGetOptions({ query: { published_only: publishedOnly } })
 *   )
 * }
 *
 * // Also valid — manual queryOptions:
 * export function useCustomData() {
 *   return useAppQuery<MyType>({
 *     queryKey: ["custom"],
 *     queryFn: async () => fetchSomething(),
 *   })
 * }
 * ```
 */
export function useAppQuery<TData, TError = Error, TQueryKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  return useQuery(options);
}

// ---------------------------------------------------------------------------
// useAppMutation
// ---------------------------------------------------------------------------

/**
 * Portfolio wrapper around TanStack Query's `useMutation`.
 *
 * Drop-in replacement for `useMutation` that adds:
 * - **Automatic cache invalidation** — pass `invalidates` in the overrides
 *   and the listed query keys are invalidated on every successful mutation.
 * - **Generated options compatibility** — accepts the `*Mutation()` factories
 *   from `src/lib/api/@tanstack/react-query.gen.ts` as the first argument.
 * - **Composable callbacks** — both the generated mutation's `onSuccess` /
 *   `onError` and the override's `onSuccess` / `onError` are called in order,
 *   so neither is silently dropped.
 *
 * Error logging is handled once in `MutationCache.onError` inside
 * `query-client.ts` and is therefore absent here.
 *
 * ### Callback execution order on success
 * 1. Query invalidation (so downstream queries are fresh)
 * 2. Generated mutation's `onSuccess` (if defined)
 * 3. Override's `onSuccess` (if defined)
 *
 * @typeParam TData - The type of data returned by the mutation on success.
 * @typeParam TVariables - The type of variables passed to the mutation.
 * @typeParam TError - The error type (defaults to `Error`).
 *
 * @param mutationOptions - Base mutation options — typically the generated
 *   `*Mutation()` factory result from `@tanstack/react-query.gen.ts`.
 * @param overrides - Optional portfolio-specific behaviour layered on top:
 *   cache invalidation, additional success/error callbacks.
 * @returns All values from `useMutation` — `mutate`, `mutateAsync`,
 *   `isPending`, `error`, etc.
 *
 * @example
 * ```ts
 * // Using the generated mutation factory:
 * import { createProjectApiV1ProjectsPostMutation } from "@/lib/api/@tanstack/react-query.gen"
 * import { QUERY_KEYS } from "@/lib/constants"
 *
 * export function useCreateProject() {
 *   return useAppMutation(createProjectApiV1ProjectsPostMutation(), {
 *     invalidates: [[QUERY_KEYS.PROJECTS]],
 *     onSuccess: (data) => {
 *       toast.success(`Created: ${data.slug}`)
 *     },
 *   })
 * }
 *
 * // In the component:
 * const { mutate: createProject, isPending } = useCreateProject()
 * createProject({ body: { title: "My Project", description: "..." } })
 * ```
 */
export function useAppMutation<TData, TVariables, TError = Error>(
  mutationOptions: UseMutationOptions<TData, TError, TVariables, unknown>,
  overrides?: MutationOverrides<TData, TVariables, TError>,
): UseMutationResult<TData, TError, TVariables, unknown> {
  return useMutation({
    ...mutationOptions,

    onSuccess: async (data, variables, onMutateResult, context) => {
      // 1. Invalidate requested query keys first so data is fresh when
      //    any subsequent callbacks run.
      if (overrides?.invalidates) {
        await Promise.all(
          overrides.invalidates.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      }

      // 2. Call the generated mutation's own onSuccess (if any).
      if (mutationOptions.onSuccess) {
        await mutationOptions.onSuccess(data, variables, onMutateResult, context);
      }

      // 3. Call the override's onSuccess (if any).
      if (overrides?.onSuccess) {
        await overrides.onSuccess(data, variables);
      }
    },

    onError: async (error, variables, onMutateResult, context) => {
      // Call the generated mutation's own onError (if any).
      if (mutationOptions.onError) {
        await mutationOptions.onError(error, variables, onMutateResult, context);
      }

      // Call the override's onError (if any).
      if (overrides?.onError) {
        await overrides.onError(error, variables);
      }
    },
  });
}

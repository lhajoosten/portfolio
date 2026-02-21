/**
 * Domain hooks for the Posts / Blog resource.
 *
 * All hooks are thin wrappers around {@link useAppQuery} / {@link useAppMutation}
 * that pass the **generated** TanStack Query option factories from
 * `src/lib/api/@tanstack/react-query.gen.ts` directly.  There are no manual
 * `queryFn` wrappers here — the generated factories already contain the
 * correctly typed `queryFn`, `queryKey`, and `mutationFn`.
 *
 * ## Cache key strategy
 *
 * Every hook uses `QUERY_KEYS.POSTS` as the base key so that all
 * write hooks (`useCreatePost`, `useUpdatePost`, `useDeletePost`)
 * can invalidate the entire posts cache with a single entry in
 * `invalidates`.
 *
 * @module
 */

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import {
  createPostApiV1PostsPostMutation,
  deletePostApiV1PostsSlugDeleteMutation,
  getPostApiV1PostsSlugGetOptions,
  getPostsApiV1PostsGetOptions,
  updatePostApiV1PostsSlugPatchMutation,
} from "@/lib/api/@tanstack/react-query.gen";
import type { Options } from "@/lib/api/sdk.gen";
import type {
  CreatePostApiV1PostsPostData,
  CreatePostApiV1PostsPostError,
  CreatePostApiV1PostsPostResponse,
  DeletePostApiV1PostsSlugDeleteData,
  DeletePostApiV1PostsSlugDeleteError,
  DeletePostApiV1PostsSlugDeleteResponse,
  HttpValidationError,
  PostResponse,
  UpdatePostApiV1PostsSlugPatchData,
  UpdatePostApiV1PostsSlugPatchError,
  UpdatePostApiV1PostsSlugPatchResponse,
} from "@/lib/api/types.gen";
import { QUERY_KEYS } from "@/lib/constants";
import { useAppMutation, useAppQuery } from "@/lib/query";

// ---------------------------------------------------------------------------
// Variable type aliases — keep call sites readable
// ---------------------------------------------------------------------------

type CreateVariables = Options<CreatePostApiV1PostsPostData>;
type UpdateVariables = Options<UpdatePostApiV1PostsSlugPatchData>;
type DeleteVariables = Options<DeletePostApiV1PostsSlugDeleteData>;

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all blog posts, with an optional published-only filter.
 *
 * Maps to `GET /api/v1/posts/`.
 *
 * @param publishedOnly - When `true` (default), only published posts are
 *   returned.  Pass `false` in the admin CMS to include drafts.
 * @returns TanStack Query result containing an array of {@link PostResponse}.
 *
 * @example
 * ```tsx
 * function BlogPage() {
 *   const { data: posts = [], isLoading } = usePosts()
 *   if (isLoading) return <Spinner />
 *   return <PostList posts={posts} />
 * }
 * ```
 */
export function usePosts(
  publishedOnly = true,
): UseQueryResult<PostResponse[], HttpValidationError> {
  return useAppQuery(getPostsApiV1PostsGetOptions({ query: { published_only: publishedOnly } }));
}

/**
 * Fetch a single blog post by URL slug.
 *
 * Maps to `GET /api/v1/posts/{slug}`.
 *
 * The query is disabled when `slug` is an empty string, so it is safe to
 * call this hook before the slug is available (e.g. during route transitions).
 *
 * @param slug - The unique URL slug of the post to fetch.
 * @returns TanStack Query result containing the matching {@link PostResponse}.
 *   The query is in `pending` state (not `error`) when `slug` is empty.
 *
 * @example
 * ```tsx
 * function PostDetailPage({ slug }: { slug: string }) {
 *   const { data: post, isLoading, error } = usePost(slug)
 *   if (isLoading) return <Spinner />
 *   if (error) return <ErrorMessage error={error} />
 *   return <PostDetail post={post} />
 * }
 * ```
 */
export function usePost(slug: string): UseQueryResult<PostResponse, HttpValidationError> {
  return useAppQuery({
    ...getPostApiV1PostsSlugGetOptions({ path: { slug } }),
    enabled: slug.length > 0,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Create a new blog post.
 *
 * Maps to `POST /api/v1/posts/`.
 *
 * Automatically invalidates all post queries on success so that list
 * views refresh without a manual refetch.
 *
 * @returns TanStack mutation result.  Call `mutate({ body: {...} })` to
 *   trigger the mutation.
 *
 * @example
 * ```tsx
 * function CreatePostForm() {
 *   const { mutate: createPost, isPending } = useCreatePost()
 *
 *   function handleSubmit(values: PostCreate) {
 *     createPost({ body: values })
 *   }
 *
 *   return <form onSubmit={...}> ... </form>
 * }
 * ```
 */
export function useCreatePost(): UseMutationResult<
  CreatePostApiV1PostsPostResponse,
  CreatePostApiV1PostsPostError,
  CreateVariables
> {
  return useAppMutation(createPostApiV1PostsPostMutation(), {
    invalidates: [[QUERY_KEYS.POSTS]],
  });
}

/**
 * Update an existing blog post by slug.
 *
 * Maps to `PATCH /api/v1/posts/{slug}`.
 *
 * Only the fields provided in `body` are updated — all other fields are
 * left unchanged (the backend applies `model_dump(exclude_unset=True)`).
 *
 * Automatically invalidates all post queries on success.
 *
 * @returns TanStack mutation result.  Call
 *   `mutate({ path: { slug }, body: { title: "New title" } })` to trigger.
 *
 * @example
 * ```tsx
 * const { mutate: updatePost } = useUpdatePost()
 * updatePost({ path: { slug: "my-post" }, body: { published: true } })
 * ```
 */
export function useUpdatePost(): UseMutationResult<
  UpdatePostApiV1PostsSlugPatchResponse,
  UpdatePostApiV1PostsSlugPatchError,
  UpdateVariables
> {
  return useAppMutation(updatePostApiV1PostsSlugPatchMutation(), {
    invalidates: [[QUERY_KEYS.POSTS]],
  });
}

/**
 * Delete a blog post by slug.
 *
 * Maps to `DELETE /api/v1/posts/{slug}`.
 *
 * Automatically invalidates all post queries on success so that the
 * deleted item disappears from list views immediately.
 *
 * @returns TanStack mutation result.  Call `mutate({ path: { slug } })` to
 *   trigger the deletion.
 *
 * @example
 * ```tsx
 * const { mutate: deletePost } = useDeletePost()
 * deletePost({ path: { slug: "my-post" } })
 * ```
 */
export function useDeletePost(): UseMutationResult<
  DeletePostApiV1PostsSlugDeleteResponse,
  DeletePostApiV1PostsSlugDeleteError,
  DeleteVariables
> {
  return useAppMutation(deletePostApiV1PostsSlugDeleteMutation(), {
    invalidates: [[QUERY_KEYS.POSTS]],
  });
}

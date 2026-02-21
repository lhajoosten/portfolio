/**
 * Domain hooks for the Certifications resource.
 *
 * All hooks are thin wrappers around {@link useAppQuery} / {@link useAppMutation}
 * that pass the **generated** TanStack Query option factories from
 * `src/lib/api/@tanstack/react-query.gen.ts` directly.  There are no manual
 * `queryFn` wrappers here — the generated factories already contain the
 * correctly typed `queryFn`, `queryKey`, and `mutationFn`.
 *
 * ## Cache key strategy
 *
 * Every hook uses `QUERY_KEYS.CERTIFICATIONS` as the base key so that all
 * write hooks (`useCreateCertification`, `useUpdateCertification`,
 * `useDeleteCertification`) can invalidate the entire certifications cache
 * with a single entry in `invalidates`.
 *
 * @module
 */

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import {
  createCertificationApiV1CertificationsPostMutation,
  deleteCertificationApiV1CertificationsCertIdDeleteMutation,
  getCertificationApiV1CertificationsCertIdGetOptions,
  getCertificationsApiV1CertificationsGetOptions,
  updateCertificationApiV1CertificationsCertIdPatchMutation,
} from "@/lib/api/@tanstack/react-query.gen";
import type { Options } from "@/lib/api/sdk.gen";
import type {
  CertificationResponse,
  CreateCertificationApiV1CertificationsPostData,
  CreateCertificationApiV1CertificationsPostError,
  CreateCertificationApiV1CertificationsPostResponse,
  DeleteCertificationApiV1CertificationsCertIdDeleteData,
  DeleteCertificationApiV1CertificationsCertIdDeleteError,
  DeleteCertificationApiV1CertificationsCertIdDeleteResponse,
  GetCertificationApiV1CertificationsCertIdGetData,
  HttpValidationError,
  UpdateCertificationApiV1CertificationsCertIdPatchData,
  UpdateCertificationApiV1CertificationsCertIdPatchError,
  UpdateCertificationApiV1CertificationsCertIdPatchResponse,
} from "@/lib/api/types.gen";
import { QUERY_KEYS } from "@/lib/constants";
import { useAppMutation, useAppQuery } from "@/lib/query";

// ---------------------------------------------------------------------------
// Variable type aliases — keep call sites readable
// ---------------------------------------------------------------------------

type CreateVariables = Options<CreateCertificationApiV1CertificationsPostData>;
type UpdateVariables = Options<UpdateCertificationApiV1CertificationsCertIdPatchData>;
type DeleteVariables = Options<DeleteCertificationApiV1CertificationsCertIdDeleteData>;
type GetByIdVariables = Options<GetCertificationApiV1CertificationsCertIdGetData>;

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all certifications, with an optional featured-only filter.
 *
 * Maps to `GET /api/v1/certifications/`.
 *
 * @param featuredOnly - When `true`, only featured certifications are
 *   returned.  Defaults to `false` (return all certifications).
 * @returns TanStack Query result containing an array of
 *   {@link CertificationResponse}.
 *
 * @example
 * ```tsx
 * function CertificationsPage() {
 *   const { data: certs = [], isLoading } = useCertifications()
 *   if (isLoading) return <Spinner />
 *   return <CertificationList certs={certs} />
 * }
 * ```
 */
export function useCertifications(
  featuredOnly = false,
): UseQueryResult<CertificationResponse[], HttpValidationError> {
  return useAppQuery(
    getCertificationsApiV1CertificationsGetOptions({
      query: { featured_only: featuredOnly },
    }),
  );
}

/**
 * Fetch a single certification by its UUID.
 *
 * Maps to `GET /api/v1/certifications/{cert_id}`.
 *
 * The query is disabled when `certId` is an empty string, so it is safe to
 * call this hook before the ID is available (e.g. during route transitions).
 *
 * @param certId - The UUID of the certification to fetch.
 * @returns TanStack Query result containing the matching
 *   {@link CertificationResponse}.  The query is in `pending` state (not
 *   `error`) when `certId` is empty.
 *
 * @example
 * ```tsx
 * function CertificationDetailPage({ certId }: { certId: string }) {
 *   const { data: cert, isLoading, error } = useCertification(certId)
 *   if (isLoading) return <Spinner />
 *   if (error) return <ErrorMessage error={error} />
 *   return <CertificationDetail cert={cert} />
 * }
 * ```
 */
export function useCertification(
  certId: string,
): UseQueryResult<CertificationResponse, HttpValidationError> {
  return useAppQuery({
    ...getCertificationApiV1CertificationsCertIdGetOptions({
      path: { cert_id: certId },
    } as GetByIdVariables),
    enabled: certId.length > 0,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Create a new certification record.
 *
 * Maps to `POST /api/v1/certifications/`.
 *
 * Automatically invalidates all certification queries on success so that list
 * views refresh without a manual refetch.
 *
 * @returns TanStack mutation result.  Call `mutate({ body: {...} })` to
 *   trigger the mutation.
 *
 * @example
 * ```tsx
 * function CreateCertificationForm() {
 *   const { mutate: createCert, isPending } = useCreateCertification()
 *
 *   function handleSubmit(values: CertificationCreate) {
 *     createCert({ body: values })
 *   }
 *
 *   return <form onSubmit={...}> ... </form>
 * }
 * ```
 */
export function useCreateCertification(): UseMutationResult<
  CreateCertificationApiV1CertificationsPostResponse,
  CreateCertificationApiV1CertificationsPostError,
  CreateVariables
> {
  return useAppMutation(createCertificationApiV1CertificationsPostMutation(), {
    invalidates: [[QUERY_KEYS.CERTIFICATIONS]],
  });
}

/**
 * Update an existing certification by UUID.
 *
 * Maps to `PATCH /api/v1/certifications/{cert_id}`.
 *
 * Only the fields provided in `body` are updated — all other fields are
 * left unchanged (the backend applies `model_dump(exclude_unset=True)`).
 *
 * Automatically invalidates all certification queries on success.
 *
 * @returns TanStack mutation result.  Call
 *   `mutate({ path: { cert_id }, body: { featured: true } })` to trigger.
 *
 * @example
 * ```tsx
 * const { mutate: updateCert } = useUpdateCertification()
 * updateCert({ path: { cert_id: "some-uuid" }, body: { featured: true } })
 * ```
 */
export function useUpdateCertification(): UseMutationResult<
  UpdateCertificationApiV1CertificationsCertIdPatchResponse,
  UpdateCertificationApiV1CertificationsCertIdPatchError,
  UpdateVariables
> {
  return useAppMutation(updateCertificationApiV1CertificationsCertIdPatchMutation(), {
    invalidates: [[QUERY_KEYS.CERTIFICATIONS]],
  });
}

/**
 * Delete a certification by UUID.
 *
 * Maps to `DELETE /api/v1/certifications/{cert_id}`.
 *
 * Automatically invalidates all certification queries on success so that the
 * deleted item disappears from list views immediately.
 *
 * @returns TanStack mutation result.  Call `mutate({ path: { cert_id } })` to
 *   trigger the deletion.
 *
 * @example
 * ```tsx
 * const { mutate: deleteCert } = useDeleteCertification()
 * deleteCert({ path: { cert_id: "some-uuid" } })
 * ```
 */
export function useDeleteCertification(): UseMutationResult<
  DeleteCertificationApiV1CertificationsCertIdDeleteResponse,
  DeleteCertificationApiV1CertificationsCertIdDeleteError,
  DeleteVariables
> {
  return useAppMutation(deleteCertificationApiV1CertificationsCertIdDeleteMutation(), {
    invalidates: [[QUERY_KEYS.CERTIFICATIONS]],
  });
}

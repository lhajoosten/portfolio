import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { parseApiError } from "./errors";

function handleGlobalError(error: unknown) {
  const apiError = parseApiError(error);
  if (apiError.isUnauthorized && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (import.meta.env.DEV) {
        console.error("Query error:", query.queryKey, error);
      }
      handleGlobalError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error("Mutation error:", error);
      }
      handleGlobalError(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

import { getPostApiV1PostsSlugGetOptions } from "@/lib/api/@tanstack/react-query.gen";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ context: { queryClient }, params: { slug } }) =>
    queryClient.prefetchQuery(getPostApiV1PostsSlugGetOptions({ path: { slug } })),
});

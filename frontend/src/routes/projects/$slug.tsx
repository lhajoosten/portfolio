import { createFileRoute } from "@tanstack/react-router";

import { getProjectApiV1ProjectsSlugGetOptions } from "@/lib/api/@tanstack/react-query.gen";

export const Route = createFileRoute("/projects/$slug")({
  loader: ({ context: { queryClient }, params: { slug } }) =>
    queryClient.prefetchQuery(getProjectApiV1ProjectsSlugGetOptions({ path: { slug } })),
});

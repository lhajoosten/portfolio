import { defineConfig } from "@hey-api/openapi-ts";
export default defineConfig({
  input: "http://localhost:8000/openapi.json",
  output: {
    path: "src/lib/api",
    format: "prettier",
    lint: "eslint",
  },
  plugins: [
    "@hey-api/typescript",
    {
      name: "@hey-api/sdk",
      operationId: true,
    },
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "../api-client.ts",
    },
    {
      name: "@tanstack/react-query",
      infiniteQueryOptions: true,
      mutationOptions: true,
      queryOptions: true,
    },
  ],
});

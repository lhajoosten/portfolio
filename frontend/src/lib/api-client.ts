import { createClient, type ClientOptions, type Config } from "./api/client";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

const fetchWithCredentials: typeof fetch = (input, init) =>
  fetch(input, { ...init, credentials: "include" });

export const createClientConfig = (config: Config<ClientOptions> = {}): Config<ClientOptions> => ({
  ...config,
  baseUrl: baseUrl || config.baseUrl || "",
  fetch: fetchWithCredentials,
});

export const apiClient = createClient(createClientConfig({}));

export default apiClient;

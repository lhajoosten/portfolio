export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type WriteMode = "write" | "improve" | "summarise";

export type StreamState = {
  output: string;
  isStreaming: boolean;
  error: string | null;
};

export type BaseEntity = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export interface ApiError {
  status: number;
  error: string;
  errorCode: string;
  message: string;
  path: string;
  traceId: string;
  timestamp: string;
}

export interface ApiPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type ApiListOrPage<T> = T[] | ApiPage<T>;

export type Id = string | number;

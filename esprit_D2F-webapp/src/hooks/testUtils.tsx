import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";

export async function flushQuery(result: { current: { isSuccess?: boolean; isFetched?: boolean; isError?: boolean } }) {
  try {
    await waitFor(() => {
      if (!(result.current.isSuccess || result.current.isFetched || result.current.isError)) {
        throw new Error("query not settled");
      }
    }, { timeout: 1000, interval: 20 });
  } catch {
    /* disabled/never-settling query: let the test assert its own expectations */
  }
}

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

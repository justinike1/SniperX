import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    } catch (error) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown | undefined,
): Promise<any> {
  try {
    const headers: Record<string, string> = {};
    
    if (data) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Handle authentication errors gracefully
        throw new Error(`401: Unauthorized`);
      }
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${errorText}`);
    }
    
    return await res.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network request failed');
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(`${res.status}: ${errorText}`);
      }

      return await res.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Query failed');
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

import { QueryClient } from "@tanstack/react-query";

/**
 * Helper function to make API requests with standard error handling
 * @param endpoint API endpoint path
 * @param options Fetch options
 * @returns Promise with response data
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  console.log(`Making API request to: ${endpoint}`);
  
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(
        `API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    console.log(`API request to ${endpoint} successful, received data`);
    return data;
  } catch (error) {
    console.error(`Error in API request to ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Helper function for creating a query function bound to a specific endpoint
 * @param endpoint API endpoint to query 
 */
export function getQueryFn<T = any>(endpoint: string) {
  return async (): Promise<T> => {
    return apiRequest<T>(endpoint);
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      retry: 1,         // Allow one retry
      retryDelay: 1000, // Wait 1 second before retrying
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
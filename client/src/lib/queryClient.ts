import { QueryClient } from "@tanstack/react-query";

/**
 * Helper function to make API requests with standard error handling
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param endpoint API endpoint path
 * @param body Optional request body (for POST/PUT)
 * @returns Promise with response data
 */
export async function apiRequest<T = any>(
  method: string,
  endpoint: string,
  body?: any
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  console.log(`Making API request: ${method} ${endpoint}`);
  
  try {
    const response = await fetch(endpoint, options);

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      try {
        // Try to parse error as JSON
        const errorJson = await response.json();
        console.error(`API error response (JSON):`, errorJson);
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorJson)}`
        );
      } catch (parseError) {
        // If parsing as JSON fails, get as text
        const errorText = await response.text();
        console.error(`API error response (text): ${errorText}`);
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    console.log(`API request to ${endpoint} successful, received data:`, data);
    return data;
  } catch (error) {
    console.error(`Error in API request to ${endpoint}:`, error);
    // Return more details about the error
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
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
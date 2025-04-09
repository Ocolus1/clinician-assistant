import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class strings using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Make an API request to the backend
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @param path - API path
 * @param data - Request body data (for POST, PUT)
 * @returns Promise with the response data
 */
export async function apiRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: any
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(path, options);

  if (!response.ok) {
    // Try to get error message from response
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || 'An error occurred');
    } catch (e) {
      // If we can't parse the error as JSON, throw a generic error
      if (e instanceof Error && e.message !== 'An error occurred') {
        throw e;
      }
      throw new Error(`${response.status}: ${response.statusText}`);
    }
  }

  // Return empty object for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
import { QueryClient, QueryFunction, QueryKey } from "@tanstack/react-query";

// Enhanced error handling with more comprehensive error information
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // For debugging, log the full response
    console.error(`API Error Response (${res.status}):`, res);
    
    let errorMessage;
    let errorDetails = null;
    
    const contentType = res.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    try {
      // If content type is HTML (e.g., from a 500 error page)
      if (contentType.includes('text/html')) {
        const htmlContent = await res.text();
        // Extract a readable message from HTML (first 100 chars)
        errorMessage = `Server Error: HTML response (${htmlContent.substring(0, 100)}...)`;
        console.error('Received HTML error response:', htmlContent.substring(0, 500));
      }
      // If content type is JSON
      else if (contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        errorDetails = errorData;
      } 
      // Default case - try to get text
      else {
        errorMessage = await res.text() || res.statusText;
      }
    } catch (parseError) {
      // If we can't parse the error response, fall back to status text
      console.error('Error parsing error response:', parseError);
      errorMessage = `Error ${res.status}: ${res.statusText}`;
    }
    
    console.error(`API Error (${res.status}):`, errorMessage, errorDetails);
    
    // Create a more informative error object
    const error = new Error(`${res.status}: ${errorMessage}`);
    (error as any).status = res.status;
    (error as any).details = errorDetails;
    throw error;
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  try {
    // Validate inputs to prevent common errors
    if (!url) {
      throw new Error('API URL is required');
    }
    
    if (url.includes('undefined') || url.includes('null')) {
      console.warn('API URL contains undefined or null values:', url);
    }
    
    // Check for data type issues with budget items
    if (url.includes('budget-items') && data) {
      console.log('Validating budget item data before submission:', data);
      
      // Add type validation for common numeric fields
      if (typeof data === 'object' && data !== null) {
        const budgetData = data as any;
        
        // Ensure quantity is a number
        if ('quantity' in budgetData && budgetData.quantity !== undefined) {
          const originalQuantity = budgetData.quantity;
          budgetData.quantity = Number(budgetData.quantity);
          
          if (isNaN(budgetData.quantity)) {
            console.error('Invalid quantity value:', originalQuantity);
            throw new Error(`Invalid quantity: "${originalQuantity}" is not a valid number`);
          }
        }
        
        // Ensure unitPrice is a number
        if ('unitPrice' in budgetData && budgetData.unitPrice !== undefined) {
          const originalPrice = budgetData.unitPrice;
          budgetData.unitPrice = Number(budgetData.unitPrice);
          
          if (isNaN(budgetData.unitPrice)) {
            console.error('Invalid unit price value:', originalPrice);
            throw new Error(`Invalid unit price: "${originalPrice}" is not a valid number`);
          }
        }
        
        // Ensure budgetSettingsId is a number
        if ('budgetSettingsId' in budgetData && budgetData.budgetSettingsId !== undefined) {
          const originalId = budgetData.budgetSettingsId;
          budgetData.budgetSettingsId = Number(budgetData.budgetSettingsId);
          
          if (isNaN(budgetData.budgetSettingsId)) {
            console.error('Invalid budget settings ID value:', originalId);
            throw new Error(`Invalid budget settings ID: "${originalId}" is not a valid number`);
          }
        }
        
        console.log('Validated budget data:', budgetData);
      }
    }
    
    const options: RequestInit = {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    };

    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }

    console.log(`API ${method} request to ${url}:`, data);
    
    const res = await fetch(url, options);
    await throwIfResNotOk(res);

    // Handle empty responses (e.g., for DELETE requests)
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const responseData = await res.json();
      console.log(`API response from ${url}:`, responseData);
      return responseData;
    } else {
      console.log(`API response from ${url} (non-JSON):`, res.statusText);
      return { success: true, status: res.status } as unknown as T;
    }
  } catch (error) {
    console.error(`API request to ${url} failed:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

interface QueryFnOptions {
  on401: UnauthorizedBehavior;
  getFn?: (ctx: { queryKey: QueryKey }) => { url: string; params?: Record<string, any> };
}

export const getQueryFn: <T>(options: QueryFnOptions) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, getFn }) =>
  async ({ queryKey }) => {
    // If a custom getFn is provided, use it to get the URL and params
    if (getFn) {
      const { url, params } = getFn({ queryKey });
      
      // Construct the query string if params are provided
      let fullUrl = url;
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        
        const queryString = queryParams.toString();
        if (queryString) {
          fullUrl = `${url}?${queryString}`;
        }
      }
      
      console.log(`Query request: ${fullUrl}`, queryKey.slice(1));
      
      try {
        const res = await fetch(fullUrl, {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          console.log(`Unauthorized access to ${fullUrl}, returning null as configured`);
          return null;
        }

        await throwIfResNotOk(res);
        const data = await res.json();
        console.log(`Query response from ${url}:`, data);
        return data;
      } catch (error) {
        console.error(`Query failed for ${url}:`, error);
        throw error;
      }
    }
    else {
      const url = queryKey[0] as string;
      
      // Construct the query string for any parameters in queryKey[1]
      let fullUrl = url;
      const params = queryKey[1] as Record<string, any> | undefined;
      
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        
        const queryString = queryParams.toString();
        if (queryString) {
          fullUrl = `${url}?${queryString}`;
        }
      }
      
      console.log(`Query request: ${fullUrl}`, queryKey.slice(1));
      
      try {
        const res = await fetch(fullUrl, {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          console.log(`Unauthorized access to ${fullUrl}, returning null as configured`);
          return null;
        }

        await throwIfResNotOk(res);
        const data = await res.json();
        console.log(`Query response from ${url}:`, data);
        return data;
      } catch (error) {
        console.error(`Query failed for ${url}:`, error);
        throw error;
      }
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute instead of infinity
      retry: 1,         // Allow one retry
      retryDelay: 1000, // Wait 1 second before retrying
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

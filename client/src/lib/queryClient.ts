import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
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
            console.error('Invalid budgetSettingsId value:', originalId);
            throw new Error(`Invalid budget settings ID: "${originalId}" is not a valid number`);
          }
        }
        
        console.log('Validated budget data:', budgetData);
      }
    }
    
    console.log(`API Request: ${method} ${url}`, data || '');
    
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request failed for ${method} ${url}:`, error);
    // Add request details to the error for better debugging
    if (error instanceof Error) {
      (error as any).request = { method, url, data };
      (error as any).timestamp = new Date().toISOString();
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Query request: ${url}`, queryKey.slice(1));
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized access to ${url}, returning null as configured`);
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

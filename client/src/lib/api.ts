
/**
 * API client for interacting with the server
 */

export async function apiRequest(method: string, endpoint: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, options);
  return response;
}

export async function createClient(clientData: any) {
  const response = await apiRequest('POST', '/api/clients', clientData);
  if (!response.ok) {
    throw new Error('Failed to create client');
  }
  return response.json();
}

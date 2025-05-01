/**
 * API Compatibility Utilities
 * 
 * This module provides utilities for maintaining backward compatibility
 * with legacy API endpoints during the schema transition from client/ally
 * to patient/caregiver terminology.
 */

/**
 * Maps legacy API paths to their new equivalents
 * @param url The original API URL
 * @returns The mapped URL using the new schema terminology
 */
export function mapLegacyApiPath(url: string): string {
  // Map client endpoints to patient endpoints
  if (url.startsWith('/api/clients')) {
    // Special case for allies endpoints
    if (url.includes('/allies')) {
      return url.replace('/api/clients', '/api/patients').replace('/allies', '/caregivers');
    }
    return url.replace('/api/clients', '/api/patients');
  }
  
  // Map ally endpoints to caregiver endpoints
  if (url.includes('/allies')) {
    return url.replace('/allies', '/caregivers');
  }
  
  // Return the original URL if no mapping is needed
  return url;
}

/**
 * Maps legacy data fields to their new equivalents
 * @param data The original data object with legacy field names
 * @returns A new data object with updated field names
 */
export function mapLegacySchema(data: any): any {
  // If data is null or undefined, return it as is
  if (data === null || data === undefined) return data;
  
  // If data is an array, map each item
  if (Array.isArray(data)) {
    return data.map(item => mapLegacySchema(item));
  }
  
  // If data is not an object, return it as is
  if (typeof data !== 'object') return data;
  
  // Create a new object to hold the result
  const result: Record<string, any> = { ...data };
  
  // Map clientId to patientId
  if ('clientId' in data) {
    result.patientId = data.clientId;
  }
  
  // Map allyId to caregiverId
  if ('allyId' in data) {
    result.caregiverId = data.allyId;
  }
  
  // Map allies to caregivers
  if ('allies' in data && Array.isArray(data.allies)) {
    result.caregivers = data.allies.map((ally: any) => mapLegacySchema(ally));
  }
  
  // Process each key in the data object for any other nested objects
  for (const [key, value] of Object.entries(data)) {
    // Skip the keys we've already processed
    if (key === 'clientId' || key === 'allyId' || key === 'allies') continue;
    
    // Recursively map nested objects and arrays
    if (value !== null && typeof value === 'object') {
      result[key] = mapLegacySchema(value);
    }
  }
  
  return result;
}

/**
 * Maps legacy array data to their new equivalents
 * @param dataArray Array of data objects with legacy field names
 * @returns Array of mapped data objects with both legacy and new field names
 */
export function mapLegacyArraySchema(dataArray: any[]): any[] {
  return dataArray.map(item => mapLegacySchema(item));
}

/**
 * Maps new schema data back to legacy format for backward compatibility
 * @param data The data object with new field names
 * @returns A data object with legacy field names added
 */
export function mapNewToLegacySchema(data: any): any {
  // If data is null or undefined, return it as is
  if (data === null || data === undefined) return data;
  
  // If data is an array, map each item
  if (Array.isArray(data)) {
    return data.map(item => mapNewToLegacySchema(item));
  }
  
  // If data is not an object, return it as is
  if (typeof data !== 'object') return data;
  
  // Create a new object to hold the result
  const result: Record<string, any> = { ...data };
  
  // Map patientId to clientId
  if ('patientId' in data) {
    result.clientId = data.patientId;
  }
  
  // Map caregiverId to allyId
  if ('caregiverId' in data) {
    result.allyId = data.caregiverId;
  }
  
  // Map caregivers to allies
  if ('caregivers' in data && Array.isArray(data.caregivers)) {
    result.allies = data.caregivers.map((caregiver: any) => mapNewToLegacySchema(caregiver));
  }
  
  // Process each key in the data object for any other nested objects
  for (const [key, value] of Object.entries(data)) {
    // Skip the keys we've already processed
    if (key === 'patientId' || key === 'caregiverId' || key === 'caregivers') continue;
    
    // Recursively map nested objects and arrays
    if (value !== null && typeof value === 'object') {
      result[key] = mapNewToLegacySchema(value);
    }
  }
  
  return result;
}

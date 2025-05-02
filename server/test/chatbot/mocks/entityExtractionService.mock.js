/**
 * Mock Entity Extraction Service
 * 
 * This is a mock implementation of the entityExtractionService for testing purposes.
 * It simulates the behavior of the real service without requiring TypeScript.
 */

// Define query types that match the real service
const QueryTypes = {
  PATIENT_COUNT: 'PATIENT_COUNT',
  EXPIRING_BUDGETS: 'EXPIRING_BUDGETS',
  PATIENT_GOAL_PROGRESS: 'PATIENT_GOAL_PROGRESS',
  PATIENT_SEARCH: 'PATIENT_SEARCH',
  UNKNOWN: 'UNKNOWN'
};

// Define patterns to match different query types
const patterns = {
  [QueryTypes.PATIENT_COUNT]: [
    /patient count/i,
    /how many patients/i,
    /total patient/i,
    /number of patients/i,
    /count of (?:all )?patients/i,
    /patients do we have/i,
    /patients are registered/i,
    /patient total/i,
    /total patients/i
  ],
  [QueryTypes.EXPIRING_BUDGETS]: [
    /expiring budget/i,
    /budget.*expire/i,
    /expire.*budget/i,
    /budget.*deplete/i,
    /budget.*end/i,
    /budget.*renewal/i
  ],
  [QueryTypes.PATIENT_GOAL_PROGRESS]: [
    /goal progress/i,
    /progressing on.*goal/i,
    /progress.*goal/i,
    /goal.*status/i,
    /status of.*goal/i,
    /doing with their goals/i,
    /made progress on.*goal/i
  ],
  [QueryTypes.PATIENT_SEARCH]: [
    /find patient/i,
    /search for/i,
    /look up/i,
    /find .+/i,
    /search .+/i,
    /do we have a patient named/i,
    /is.*one of our patients/i,
    /show me patient/i,
    /get details for/i,
    /patient with id/i,
    /patient #/i,
    /patient number/i,
    /patient identifier/i
  ]
};

// Extract patient name or identifier from a query
function extractPatientIdentifier(query) {
  // Check for unique identifier patterns (6-digit code)
  const idPatterns = [
    /patient (?:id|ID|#|number|identifier) (\d{6})\b/i,
    /patient (?:with|has) (?:id|ID|#|number|identifier) (\d{6})\b/i,
    /patient (\d{6})\b/i,
    /(\d{6})\b/i,
    /#(\d{6})\b/i,
    /patient[-\s](\d{6})\b/i,             // patient-123456
    /(\w+\s+\w+)[-\s](\d{6})\b/i          // Radwan Smith-404924
  ];
  
  for (const pattern of idPatterns) {
    const match = query.match(pattern);
    if (match) {
      // Check if this is a name-identifier pattern like "Radwan Smith-404924"
      if (pattern.toString().includes('\\w+\\s+\\w+') && match[2]) {
        return {
          type: 'combined',
          name: match[1],
          identifier: match[2]
        };
      } else if (match[1]) {
        return {
          type: 'identifier',
          value: match[1]
        };
      }
    }
  }
  
  // If no identifier found, try to extract name
  return extractPatientName(query);
}

// Extract patient name from a query
function extractPatientName(query) {
  // Enhanced patterns to extract names (assumes names are 1-3 words)
  const namePatterns = [
    /for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /named\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:'s|\s+is|\s+has|\s+in|\s+goal)/i,
    /up\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /find\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /search\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /find patient\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /search for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /patient\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /about\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i,
    /show\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i
  ];
  
  for (const pattern of namePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return {
        type: 'name',
        value: match[1]
      };
    }
  }
  
  return null;
}

// Determine the query type based on patterns
function determineQueryType(query) {
  for (const [type, typePatterns] of Object.entries(patterns)) {
    for (const pattern of typePatterns) {
      if (pattern.test(query)) {
        return type;
      }
    }
  }
  
  return QueryTypes.UNKNOWN;
}

/**
 * Mock implementation of the entity extraction service
 */
class EntityExtractionServiceMock {
  /**
   * Extract entities from a natural language query
   * 
   * @param {string} query - The natural language query to extract entities from
   * @returns {Object} Extracted entities including patient name, query type, etc.
   */
  async extractEntities(query) {
    const queryType = determineQueryType(query);
    const patientIdentifier = extractPatientIdentifier(query);
    
    // Create a response object that matches the structure of the real service
    const response = {
      queryType: queryType,
    };
    
    if (patientIdentifier) {
      if (patientIdentifier.type === 'identifier') {
        response.patientIdentifier = patientIdentifier.value;
      } else if (patientIdentifier.type === 'name') {
        response.patientName = patientIdentifier.value;
      } else if (patientIdentifier.type === 'combined') {
        // Handle combined name and identifier
        response.patientName = patientIdentifier.name;
        response.patientIdentifier = patientIdentifier.identifier;
      }
    }
    
    return response;
  }
  
  /**
   * Process a query to extract entities and resolve patient IDs
   * 
   * @param {string} query - The natural language query to process
   * @returns {Object} Processed entities with resolved patient ID
   */
  async processQuery(query) {
    return this.extractEntities(query);
  }
}

// Export a singleton instance of the mock service
export const entityExtractionService = new EntityExtractionServiceMock();

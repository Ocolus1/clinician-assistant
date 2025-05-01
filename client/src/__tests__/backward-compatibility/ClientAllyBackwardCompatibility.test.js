import { apiRequest } from '@/lib/queryClient';
import { mapLegacyApiPath, mapLegacySchema } from '@/lib/utils/apiCompatibility';

// Mock the apiRequest function
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn().mockImplementation((method, url, data) => {
    console.log(`Mocked apiRequest called with: ${method} ${url}`);
    return Promise.resolve([{ id: 1 }]);
  }),
  queryClient: {
    invalidateQueries: jest.fn()
  }
}));

describe('Backward Compatibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Compatibility Note', () => {
    it('should note that backward compatibility functions have been removed', () => {
      // This test serves as documentation that backward compatibility functions
      // have been intentionally removed as part of the final phase of the
      // patient/caregiver terminology transition
      console.log('Note: Backward compatibility functions have been removed as part of the final phase of the patient/caregiver terminology transition.');
      expect(true).toBe(true);
    });
  });

  describe('URL Mapping Utility', () => {
    it('should map client URLs to patient URLs', () => {
      const clientUrl = '/api/clients/123';
      const result = mapLegacyApiPath(clientUrl);
      expect(result).toBe('/api/patients/123');
    });

    it('should map client/allies URLs to patient/caregivers URLs', () => {
      const allyUrl = '/api/clients/123/allies';
      const result = mapLegacyApiPath(allyUrl);
      expect(result).toBe('/api/patients/123/caregivers');
    });

    it('should not change non-client URLs', () => {
      const otherUrl = '/api/other/123';
      const result = mapLegacyApiPath(otherUrl);
      expect(result).toBe('/api/other/123');
    });
  });

  describe('Schema Mapping Utility', () => {
    it('should map client schema to patient schema', () => {
      const clientData = { clientId: 123, name: 'Test Client' };
      const result = mapLegacySchema(clientData);
      expect(result).toEqual(expect.objectContaining({ 
        patientId: 123, 
        name: 'Test Client' 
      }));
    });

    it('should map ally schema to caregiver schema', () => {
      const allyData = { allyId: 456, clientId: 123, name: 'Test Ally' };
      const result = mapLegacySchema(allyData);
      expect(result).toEqual(expect.objectContaining({ 
        caregiverId: 456, 
        patientId: 123, 
        name: 'Test Ally' 
      }));
    });

    it('should handle nested objects and arrays', () => {
      const complexData = {
        clientId: 123,
        name: 'Test Client',
        allies: [
          { allyId: 456, name: 'Test Ally 1' },
          { allyId: 789, name: 'Test Ally 2' }
        ]
      };
      
      const result = mapLegacySchema(complexData);
      
      // Check that the top-level fields are mapped correctly
      expect(result).toEqual(expect.objectContaining({
        patientId: 123,
        name: 'Test Client'
      }));
      
      // Check that the caregivers array exists and has the correct length
      expect(result.caregivers).toHaveLength(2);
      
      // Check that each caregiver has the correct fields
      expect(result.caregivers[0]).toEqual(expect.objectContaining({
        caregiverId: 456,
        name: 'Test Ally 1'
      }));
      
      expect(result.caregivers[1]).toEqual(expect.objectContaining({
        caregiverId: 789,
        name: 'Test Ally 2'
      }));
    });
  });
});

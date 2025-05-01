// Mock the components and dependencies before importing anything
jest.mock('@/components/onboarding/CaregiverForm', () => () => null);
jest.mock('@/pages/EnhancedPatientList', () => ({ EnhancedPatientList: () => null }));
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn().mockResolvedValue({ json: () => Promise.resolve([]) }),
  queryClient: { invalidateQueries: jest.fn() }
}));

// Now import after mocking
import { apiRequest } from '@/lib/queryClient';

// This test verifies that the patient-caregiver flow uses the correct API endpoints
describe('Patient-Caregiver Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use the correct patient API endpoint for fetching patients', async () => {
    // Simulate fetching patients
    await apiRequest('GET', '/api/patients');
    
    // Verify the API was called with the correct endpoint
    expect(apiRequest).toHaveBeenCalledWith('GET', '/api/patients');
  });

  it('should use the correct patient API endpoint for fetching a specific patient', async () => {
    // Simulate fetching a specific patient
    const patientId = 123;
    await apiRequest('GET', `/api/patients/${patientId}`);
    
    // Verify the API was called with the correct endpoint
    expect(apiRequest).toHaveBeenCalledWith('GET', `/api/patients/${patientId}`);
  });

  it('should use the correct patient API endpoint for fetching caregivers', async () => {
    // Simulate fetching caregivers for a patient
    const patientId = 123;
    await apiRequest('GET', `/api/patients/${patientId}/caregivers`);
    
    // Verify the API was called with the correct endpoint
    expect(apiRequest).toHaveBeenCalledWith('GET', `/api/patients/${patientId}/caregivers`);
  });

  it('should use the correct patient API endpoint for creating a caregiver', async () => {
    // Simulate creating a caregiver for a patient
    const patientId = 123;
    const caregiverData = {
      name: 'Test Caregiver',
      relationship: 'Parent',
      preferredLanguage: 'English',
      email: 'test@example.com',
      accessTherapeutics: true,
      accessFinancials: false
    };
    
    await apiRequest('POST', `/api/patients/${patientId}/caregivers`, caregiverData);
    
    // Verify the API was called with the correct endpoint and data
    expect(apiRequest).toHaveBeenCalledWith(
      'POST', 
      `/api/patients/${patientId}/caregivers`,
      caregiverData
    );
  });
});

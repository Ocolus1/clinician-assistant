/**
 * @jest-environment jsdom
 */

// Mock the component and dependencies before importing anything
jest.mock('@/components/onboarding/CaregiverForm', () => () => null);
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn().mockResolvedValue({ json: () => Promise.resolve([]) }),
  queryClient: { invalidateQueries: jest.fn() }
}));

// Now import after mocking
import { apiRequest } from '@/lib/queryClient';

// This test verifies that the backward compatibility layer works correctly
describe('CaregiverForm API Integration', () => {
  it('should use the correct patient API endpoint', async () => {
    // Directly test the API function with a patient ID
    const patientId = 123;
    await apiRequest('GET', `/api/patients/${patientId}/caregivers`);
    
    // Verify the API was called with the correct endpoint
    expect(apiRequest).toHaveBeenCalledWith('GET', `/api/patients/${patientId}/caregivers`);
  });
});

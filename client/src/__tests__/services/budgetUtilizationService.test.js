import { budgetUtilizationService } from '@/lib/services/budgetUtilizationService';
import { apiRequest } from '@/lib/queryClient';

// Mock the apiRequest function
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn(),
  queryClient: {
    invalidateQueries: jest.fn()
  }
}));

describe('budgetUtilizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPatientSessions', () => {
    it('should fetch sessions from the correct patient endpoint', async () => {
      // Setup
      const patientId = 123;
      const mockResponse = [{ id: 1, patientId: 123 }];
      apiRequest.mockResolvedValue(mockResponse);
      
      // Execute
      await budgetUtilizationService.fetchPatientSessions(patientId);
      
      // Verify
      expect(apiRequest).toHaveBeenCalledWith('GET', `/api/patients/${patientId}/sessions-with-products`);
    });
  });

  describe('getBudgetSummary', () => {
    it('should use fetchPatientSessions to get session data', async () => {
      // Setup
      const patientId = 123;
      const mockBudgetItems = [{ id: 1, patientId: 123, quantity: 10, usedQuantity: 2, unitPrice: '100.00' }];
      const mockBudgetSettings = { id: 1, patientId: 123, startDate: '2025-01-01', endDate: '2025-12-31', isActive: true };
      const mockSessions = [{ id: 1, patientId: 123, sessionDate: '2025-02-01' }];
      
      // Create fresh spies for each test
      const originalFetchBudgetItems = budgetUtilizationService.fetchBudgetItems;
      const originalFetchBudgetSettings = budgetUtilizationService.fetchBudgetSettings;
      const originalFetchPatientSessions = budgetUtilizationService.fetchPatientSessions;
      const originalCalculateSpendingEvents = budgetUtilizationService.calculateSpendingEvents;
      const originalCalculateTotalBudget = budgetUtilizationService.calculateTotalBudget;
      const originalCalculateUsedBudget = budgetUtilizationService.calculateUsedBudget;
      const originalCalculateMonthlySpending = budgetUtilizationService.calculateMonthlySpending;
      
      // Mock the individual service methods
      budgetUtilizationService.fetchBudgetItems = jest.fn().mockResolvedValue(mockBudgetItems);
      budgetUtilizationService.fetchBudgetSettings = jest.fn().mockResolvedValue(mockBudgetSettings);
      budgetUtilizationService.fetchPatientSessions = jest.fn().mockResolvedValue(mockSessions);
      budgetUtilizationService.calculateSpendingEvents = jest.fn().mockReturnValue([]);
      budgetUtilizationService.calculateTotalBudget = jest.fn().mockReturnValue(1000);
      budgetUtilizationService.calculateUsedBudget = jest.fn().mockReturnValue(200);
      budgetUtilizationService.calculateMonthlySpending = jest.fn().mockReturnValue([]);
      
      // Execute
      await budgetUtilizationService.getBudgetSummary(patientId);
      
      // Verify
      expect(budgetUtilizationService.fetchPatientSessions).toHaveBeenCalledWith(patientId);
      
      // Restore original methods
      budgetUtilizationService.fetchBudgetItems = originalFetchBudgetItems;
      budgetUtilizationService.fetchBudgetSettings = originalFetchBudgetSettings;
      budgetUtilizationService.fetchPatientSessions = originalFetchPatientSessions;
      budgetUtilizationService.calculateSpendingEvents = originalCalculateSpendingEvents;
      budgetUtilizationService.calculateTotalBudget = originalCalculateTotalBudget;
      budgetUtilizationService.calculateUsedBudget = originalCalculateUsedBudget;
      budgetUtilizationService.calculateMonthlySpending = originalCalculateMonthlySpending;
    });
  });

  describe('fetchBudgetItems', () => {
    it('should fetch budget items from the correct patient endpoint', async () => {
      // Setup
      const patientId = 123;
      const mockResponse = [{ id: 1, patientId: 123 }];
      apiRequest.mockResolvedValue(mockResponse);
      
      // Execute
      await budgetUtilizationService.fetchBudgetItems(patientId);
      
      // Verify
      expect(apiRequest).toHaveBeenCalledWith('GET', `/api/patients/${patientId}/budget-items`);
    });
  });

  describe('fetchBudgetSettings', () => {
    it('should fetch budget settings from the correct patient endpoint', async () => {
      // Setup
      const patientId = 123;
      const mockResponse = { id: 1, patientId: 123 };
      apiRequest.mockResolvedValue(mockResponse);
      
      // Execute
      await budgetUtilizationService.fetchBudgetSettings(patientId);
      
      // Verify
      expect(apiRequest).toHaveBeenCalledWith('GET', `/api/patients/${patientId}/budget-settings`);
    });
  });
});

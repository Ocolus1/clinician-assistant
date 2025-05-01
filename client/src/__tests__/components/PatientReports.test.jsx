import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PatientReports } from '@/components/profile/PatientReports';
import { budgetUtilizationService } from '@/lib/services/budgetUtilizationService';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock the budgetUtilizationService
jest.mock('@/lib/services/budgetUtilizationService', () => ({
  budgetUtilizationService: {
    fetchBudgetItems: jest.fn().mockResolvedValue([]),
    fetchBudgetSettings: jest.fn().mockResolvedValue({
      id: 1,
      patientId: 123,
      createdAt: '2025-01-01',
      isActive: true
    }),
    fetchPatientSessions: jest.fn().mockResolvedValue([]),
    getBudgetSummary: jest.fn().mockResolvedValue({}),
    fetchClientSessions: jest.fn()
  }
}));

// Mock the fetchGoalPerformanceData function
jest.mock('@/lib/services/goalPerformanceService', () => ({
  fetchGoalPerformanceData: jest.fn().mockResolvedValue([])
}));

// Mock other required components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }) => <div data-testid="card" className={className} onClick={onClick}>{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }) => <div data-testid="card-title" className={className}>{children}</div>,
  CardFooter: ({ children }) => <div data-testid="card-footer">{children}</div>,
  CardDescription: ({ children }) => <div data-testid="card-description">{children}</div>
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }) => <div data-testid="progress" className={className} style={{ width: `${value}%` }}></div>
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }) => <span data-testid="badge" className={variant}>{children}</span>
}));

// Mock the API request function
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn().mockImplementation(() => ({
    json: jest.fn().mockResolvedValue([])
  }))
}));

// Mock the report modal components
jest.mock('@/components/profile/ReportModal', () => ({
  ReportModal: ({ children, isOpen, onClose, title }) => 
    isOpen ? <div data-testid="report-modal" title={title}>{children}</div> : null
}));

jest.mock('@/components/profile/EnhancedBudgetUtilizationModal', () => ({
  EnhancedBudgetUtilizationModal: ({ open, onOpenChange, patientId }) => 
    open ? <div data-testid="budget-modal" data-patient-id={patientId}></div> : null
}));

jest.mock('@/components/profile/GoalPerformanceModal', () => ({
  GoalPerformanceModal: () => <div data-testid="goal-performance-modal"></div>
}));

// Create a new QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('PatientReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call fetchPatientSessions with the correct patient ID', async () => {
    // Setup
    const patientId = 123;
    const queryClient = createTestQueryClient();
    
    // Execute
    render(
      <QueryClientProvider client={queryClient}>
        <PatientReports patientId={patientId} />
      </QueryClientProvider>
    );
    
    // Verify
    await waitFor(() => {
      expect(budgetUtilizationService.fetchPatientSessions).toHaveBeenCalledWith(patientId);
    });
  });

  it('should not call the deprecated fetchClientSessions method', async () => {
    // Setup
    const patientId = 123;
    const queryClient = createTestQueryClient();
    
    // Execute
    render(
      <QueryClientProvider client={queryClient}>
        <PatientReports patientId={patientId} />
      </QueryClientProvider>
    );
    
    // Verify
    await waitFor(() => {
      expect(budgetUtilizationService.fetchClientSessions).not.toHaveBeenCalled();
    });
  });

  it('should display "Patient Performance Reports" heading', async () => {
    // Setup
    const patientId = 123;
    const queryClient = createTestQueryClient();
    
    // Execute
    render(
      <QueryClientProvider client={queryClient}>
        <PatientReports patientId={patientId} />
      </QueryClientProvider>
    );
    
    // Verify
    await waitFor(() => {
      expect(screen.getByText(/Patient Performance Reports/i)).toBeInTheDocument();
    });
  });
});

# Frontend Schema Update Testing Implementation

## Overview

This document outlines the specific testing implementation for the frontend schema updates where "client" has been renamed to "patient" and "ally" has been renamed to "caregiver". This testing implementation follows the testing plan outlined in [frontend-schema-update-testing-plan.md](./frontend-schema-update-testing-plan.md) and focuses on verifying that all updated components, services, and API endpoints function correctly.

## Testing Implementation Steps

### 1. Unit Testing for Services

#### 1.1 API Endpoint Testing

| Service | Test Implementation | Status |
|---------|---------------------|--------|
| `budgetUtilizationService.ts` | Test `fetchPatientSessions` method to ensure it correctly fetches data from `/api/patients/:id/sessions` endpoint | To be implemented |
| `budgetUtilizationService.ts` | Verify backward compatibility of `fetchClientSessions` method by ensuring it calls `fetchPatientSessions` | To be implemented |
| `progressDataService.ts` | Test patient progress data retrieval with new endpoint paths | To be implemented |
| `strategyDataService.ts` | Test strategy data retrieval with patient terminology | To be implemented |
| `goalPerformanceService.ts` | Test `fetchGoalPerformanceData` with patient IDs | To be implemented |
| `patientReports.ts` | Test `getPatientPerformanceReport` and `getPatientStrategiesReport` methods | To be implemented |

#### 1.2 Implementation Example for budgetUtilizationService

```javascript
// Test file: budgetUtilizationService.test.js
import { budgetUtilizationService } from '../budgetUtilizationService';
import { apiRequest } from '@/lib/queryClient';

// Mock the apiRequest function
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn()
}));

describe('budgetUtilizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPatientSessions', () => {
    it('should fetch sessions from the correct endpoint', async () => {
      // Setup
      const patientId = 123;
      const mockResponse = { json: jest.fn().mockResolvedValue([{ id: 1, patientId: 123 }]) };
      apiRequest.mockResolvedValue(mockResponse);
      
      // Execute
      await budgetUtilizationService.fetchPatientSessions(patientId);
      
      // Verify
      expect(apiRequest).toHaveBeenCalledWith('GET', `/api/patients/${patientId}/sessions`);
    });
  });

  describe('fetchClientSessions (backward compatibility)', () => {
    it('should call fetchPatientSessions with the same parameters', async () => {
      // Setup
      const patientId = 123;
      const spy = jest.spyOn(budgetUtilizationService, 'fetchPatientSessions');
      
      // Execute
      await budgetUtilizationService.fetchClientSessions(patientId);
      
      // Verify
      expect(spy).toHaveBeenCalledWith(patientId);
    });
  });
});
```

### 2. Component Testing

#### 2.1 PatientReports Component Testing

```javascript
// Test file: PatientReports.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { PatientReports } from './PatientReports';
import { budgetUtilizationService } from '@/lib/services/budgetUtilizationService';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock the budgetUtilizationService
jest.mock('@/lib/services/budgetUtilizationService', () => ({
  budgetUtilizationService: {
    fetchBudgetItems: jest.fn().mockResolvedValue([]),
    fetchBudgetSettings: jest.fn().mockResolvedValue({}),
    fetchPatientSessions: jest.fn().mockResolvedValue([]),
    getBudgetSummary: jest.fn().mockResolvedValue({})
  }
}));

const queryClient = new QueryClient();

describe('PatientReports', () => {
  it('should call fetchPatientSessions with the correct patient ID', async () => {
    // Setup
    const patientId = 123;
    
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
});
```

#### 2.2 CaregiverForm Component Testing

```javascript
// Test file: CaregiverForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CaregiverForm from './CaregiverForm';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Mock the API request function
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn(),
  queryClient: {
    invalidateQueries: jest.fn()
  }
}));

describe('CaregiverForm', () => {
  const mockProps = {
    patientId: 123,
    onComplete: jest.fn(),
    onPrevious: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiRequest.mockImplementation(() => ({
      json: jest.fn().mockResolvedValue([])
    }));
  });

  it('should fetch caregivers from the correct endpoint', async () => {
    // Execute
    render(<CaregiverForm {...mockProps} />);
    
    // Verify
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('GET', `/api/patients/${mockProps.patientId}/caregivers`);
    });
  });

  it('should submit new caregiver to the correct endpoint', async () => {
    // Setup
    render(<CaregiverForm {...mockProps} />);
    
    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText(/Enter caregiver's name/i), {
      target: { value: 'John Doe' }
    });
    // ... fill out other required fields
    
    // Submit the form
    fireEvent.click(screen.getByText(/Add Caregiver/i));
    
    // Verify
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        'POST', 
        `/api/patients/${mockProps.patientId}/caregivers`,
        expect.any(Object)
      );
    });
  });
});
```

### 3. Integration Testing

#### 3.1 Patient Profile Flow

Test the complete patient profile flow to ensure all components work together correctly:

1. Navigate to the patient list page
2. Create a new patient
3. Add caregivers to the patient
4. Add goals for the patient
5. View the patient's profile
6. Generate reports for the patient

#### 3.2 Implementation Example

```javascript
// Test file: PatientProfileFlow.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from './App';

describe('Patient Profile Flow', () => {
  it('should navigate through the complete patient workflow', async () => {
    // Setup
    const router = createMemoryRouter([{ path: '*', element: <App /> }], {
      initialEntries: ['/patients']
    });
    
    render(<RouterProvider router={router} />);
    
    // Step 1: Verify we're on the patient list page
    await waitFor(() => {
      expect(screen.getByText(/Patient List/i)).toBeInTheDocument();
    });
    
    // Step 2: Create a new patient
    fireEvent.click(screen.getByText(/Add Patient/i));
    // Fill out patient form...
    
    // Step 3: Add caregivers
    // Fill out caregiver form...
    
    // Continue through the workflow...
    
    // Final step: Verify we can view patient reports
    await waitFor(() => {
      expect(screen.getByText(/Patient Reports/i)).toBeInTheDocument();
    });
  });
});
```

### 4. Backward Compatibility Testing

#### 4.1 Legacy API Calls

Test that calls to the old endpoints are properly redirected to the new endpoints:

```javascript
// Test file: BackwardCompatibility.test.js
import { apiRequest } from '@/lib/queryClient';

describe('Backward Compatibility', () => {
  it('should redirect /api/clients/ calls to /api/patients/', async () => {
    // This test would need to be implemented at the server level
    // to verify that the server redirects these requests correctly
  });
});
```

#### 4.2 Legacy Component Usage

Test that the application still works when using old component names through the aliases:

```javascript
// Test file: LegacyComponents.test.jsx
import { render } from '@testing-library/react';
import { ClientList } from './ClientList'; // This should be an alias to PatientList

describe('Legacy Components', () => {
  it('should render ClientList component (which is aliased to PatientList)', () => {
    const { container } = render(<ClientList />);
    expect(container).not.toBeEmptyDOMElement();
  });
});
```

## Test Execution Plan

### Phase 1: Unit Tests (April 29-30, 2025)

- Implement unit tests for all updated services
- Implement unit tests for all updated components
- Run tests and fix any issues

### Phase 2: Integration Tests (May 1-2, 2025)

- Implement integration tests for key user flows
- Test navigation between components
- Verify data consistency across components

### Phase 3: Backward Compatibility Tests (May 3, 2025)

- Test legacy API calls
- Test legacy component usage
- Verify smooth transition

### Phase 4: Browser and Device Testing (May 4-5, 2025)

- Test on different browsers (Chrome, Firefox, Safari, Edge)
- Test on different device sizes
- Fix any UI/UX issues

## Test Reporting

After each testing phase, create a report that includes:

- Number of tests executed
- Pass/fail status
- Issues found
- Recommendations for fixes

## Conclusion

This testing implementation provides a comprehensive approach to verify the frontend schema updates. By following this plan, we can ensure that the application functions correctly with the new terminology and that backward compatibility is maintained during the transition period.

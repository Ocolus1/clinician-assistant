# Frontend Schema Update Testing Plan

## Overview

This document outlines a comprehensive testing plan for the frontend schema updates where "client" has been renamed to "patient" and "ally" has been renamed to "caregiver". The testing plan ensures that all updated components, services, and API endpoints function correctly and that backward compatibility is maintained during the transition period.

## Testing Objectives

1. Verify that all updated components render correctly with the new terminology
2. Ensure that all API calls use the correct endpoints
3. Confirm that backward compatibility functions work as expected
4. Test navigation and routing with the new URL patterns
5. Validate form submissions with the new field names
6. Check data flow between components and services

## Testing Approach

### 1. Unit Testing

#### Service Tests

| Service | Test Cases | Priority |
|---------|------------|----------|
| `budgetUtilizationService.ts` | • Test new API endpoints • Test backward compatibility methods | High |
| `progressDataService.ts` | • Test new API endpoints • Test backward compatibility methods | High |
| `strategyDataService.ts` | • Test new API endpoints • Test backward compatibility methods | High |
| `goalPerformanceService.ts` | • Test new API endpoints | High |
| `knowledgeService.ts` | • Test updated terminology • Test type handling | Medium |
| `budgetDataService.simplified.ts` | • Test new API endpoints • Test backward compatibility methods | Medium |
| `patientReports.ts` | • Test new API endpoints • Test backward compatibility functions | High |

#### Component Tests

| Component | Test Cases | Priority |
|-----------|------------|----------|
| `PatientCaregivers.tsx` | • Test rendering with sample data • Test interactions | Medium |
| `PatientGoals.tsx` | • Test rendering with sample data • Test goal interactions | High |
| `PatientPersonalInfo.tsx` | • Test rendering with sample data | Medium |
| `PatientGoalsForm.tsx` | • Test form submission • Test validation | High |
| `PatientProfile.tsx` | • Test rendering all tabs • Test navigation between tabs | High |
| `PatientSessions.tsx` | • Test rendering with sample data • Test session interactions | Medium |
| `PatientReports.tsx` | • Test rendering with sample data • Test report generation | High |
| `PatientBudgetTab.tsx` | • Test rendering with sample data • Test budget interactions | High |
| `PatientBudget.tsx` | • Test rendering with sample data | Medium |
| `PatientList.tsx` | • Test rendering with sample data • Test filtering • Test navigation to patient details | High |
| `PatientForm.tsx` | • Test form submission • Test validation | High |
| `PatientServiceComparison.tsx` | • Test rendering with sample data • Test comparison options | Medium |

### 2. Integration Testing

| Test Scenario | Test Cases | Priority |
|---------------|------------|----------|
| Patient Creation Flow | • Create a new patient • Verify patient appears in list • Navigate to patient profile | High |
| Patient Profile Navigation | • Navigate between all tabs • Verify data consistency across tabs | High |
| Budget Management | • Create budget plan • Add budget items • Update budget items • Verify calculations | High |
| Goal Management | • Create goals • Update goals • Track goal progress | High |
| Report Generation | • Generate different types of reports • Verify report data accuracy | Medium |
| Service Comparison | • Compare patient with others • Test different comparison options | Low |

### 3. API Endpoint Testing

| Endpoint | Test Cases | Priority |
|----------|------------|----------|
| `/api/patients` | • GET: List all patients • POST: Create new patient | High |
| `/api/patients/:id` | • GET: Retrieve patient details • PUT: Update patient • DELETE: Delete patient | High |
| `/api/patients/:id/goals` | • GET: Retrieve patient goals • POST: Create new goal | High |
| `/api/patients/:id/budget-settings` | • GET: Retrieve budget settings • POST: Create budget settings | High |
| `/api/patients/:id/budget-items` | • GET: Retrieve budget items • POST: Create budget item | High |
| `/api/patients/:id/reports` | • GET: Retrieve patient reports | Medium |
| `/api/patients/:id/sessions` | • GET: Retrieve patient sessions | Medium |
| `/api/patients/:id/caregivers` | • GET: Retrieve patient caregivers • POST: Add caregiver | Medium |

### 4. Backward Compatibility Testing

| Test Scenario | Test Cases | Priority |
|---------------|------------|----------|
| Legacy API Calls | • Test calls to `/api/clients/` endpoints • Verify they redirect to `/api/patients/` endpoints | High |
| Legacy Service Methods | • Test deprecated methods in services • Verify they call the new methods | High |
| Legacy Component Usage | • Test using old components in new contexts • Verify proper warnings are displayed | Medium |

### 5. Browser Compatibility Testing

Test the application in the following browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### 6. Responsive Design Testing

Test the application on the following device types:

- Desktop (1920x1080)
- Laptop (1366x768)
- Tablet (768x1024)
- Mobile (375x667)

## Test Data

Create the following test data sets:

1. Sample patients with various attributes
2. Sample goals with different statuses
3. Sample budget plans and items
4. Sample caregivers with different relationships
5. Sample sessions with different dates and notes

## Testing Tools

- Jest for unit testing
- React Testing Library for component testing
- Cypress for end-to-end testing
- Postman for API testing
- Chrome DevTools for debugging and performance testing

## Test Execution Plan

1. **Phase 1: Unit Testing**
   - Test individual services and components
   - Fix any issues found

2. **Phase 2: Integration Testing**
   - Test end-to-end flows
   - Verify data consistency across components

3. **Phase 3: Backward Compatibility Testing**
   - Test legacy code paths
   - Ensure smooth transition

4. **Phase 4: Browser and Responsive Testing**
   - Test across different browsers and devices
   - Fix any UI/UX issues

## Test Reporting

For each test phase, create a report that includes:

- Test cases executed
- Pass/fail status
- Issues found
- Screenshots of failures
- Recommendations for fixes

## Success Criteria

The testing is considered successful when:

1. All unit tests pass
2. All integration tests pass
3. Backward compatibility is maintained
4. The application works correctly across all supported browsers and devices
5. No critical or high-priority issues remain unresolved

## Timeline

| Phase | Duration | Start Date | End Date |
|-------|----------|------------|----------|
| Unit Testing | 3 days | 2025-04-29 | 2025-05-01 |
| Integration Testing | 2 days | 2025-05-02 | 2025-05-03 |
| Backward Compatibility Testing | 1 day | 2025-05-04 | 2025-05-04 |
| Browser and Responsive Testing | 1 day | 2025-05-05 | 2025-05-05 |
| Bug Fixing | 2 days | 2025-05-06 | 2025-05-07 |
| Final Verification | 1 day | 2025-05-08 | 2025-05-08 |

## Conclusion

This testing plan provides a comprehensive approach to verify the frontend schema updates. By following this plan, we can ensure that the application functions correctly with the new terminology and that backward compatibility is maintained during the transition period.

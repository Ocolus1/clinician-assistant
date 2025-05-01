# Backward Compatibility Removal Plan

## Overview

This document outlines the plan for removing the backward compatibility layer that was implemented during the transition from "client/ally" terminology to "patient/caregiver" terminology. Now that the primary components have been updated and archived, we can proceed with removing the compatibility layer to complete the transition.

## Compatibility Layers to Remove

### 1. Service Compatibility Functions

The following service files contain backward compatibility functions that should be removed:

#### budgetDataService.simplified.ts
- `fetchClientBudgetSettings` (alias to fetchBudgetSettings)
- `fetchAllClientBudgetSettings` (alias to fetchAllBudgetSettings)
- `fetchClientBudgetItems` (alias to fetchBudgetItems)
- `fetchClientSessions` (alias to fetchSessions)

#### budgetUtilizationService.ts
- `fetchClientSessions` (alias to fetchPatientSessions)

#### progressDataService.ts
- `getClientGoalPerformance` (alias to getPatientGoalPerformance)

#### strategyDataService.ts
- `getRecommendedStrategiesForClient` (alias to getRecommendedStrategiesForPatient)
- `personalizeStrategiesForClient` (alias to personalizeStrategiesForPatient)

#### patientReports.ts
- `getClientPerformanceReport` (alias to getPatientPerformanceReport)
- `getClientStrategiesReport` (alias to getPatientStrategiesReport)
- Type alias `ClientReportData` to `PatientReportData`
- Type alias `ClientDetailsData` to `PatientDetailsData`

### 2. API Compatibility Layer

#### queryClient.ts
- Backward compatibility mapping for legacy API paths
- Backward compatibility mapping for legacy data fields

#### apiCompatibility.ts
- Entire utility module for maintaining backward compatibility

### 3. Component Props Compatibility

#### GoalsForm.tsx
- `clientId` prop (kept for backward compatibility)

#### BudgetForm.interface.ts
- `clientId` prop (kept for backward compatibility)

## Implementation Steps

1. **Archive Compatibility Files**:
   - Move `apiCompatibility.ts` to the archive directory
   - Create documentation for each archived file

2. **Remove Service Compatibility Functions**:
   - Remove all backward compatibility alias functions from service files
   - Update any remaining references to use the new function names

3. **Update Component Props**:
   - Remove backward compatibility props from component interfaces
   - Update component implementations to use only the new terminology

4. **Clean Up queryClient.ts**:
   - Remove backward compatibility mapping logic
   - Simplify API request handling

5. **Update Tests**:
   - Remove backward compatibility tests
   - Update remaining tests to use the new terminology

## Testing

After removing the backward compatibility layer, comprehensive testing should be performed to ensure that all functionality works correctly with the new terminology:

1. **Unit Tests**:
   - Update and run all unit tests to verify service functionality
   - Ensure all components render correctly with the new props

2. **Integration Tests**:
   - Test all user flows to ensure they work with the new terminology
   - Verify that all API calls use the correct endpoints

3. **End-to-End Tests**:
   - Perform end-to-end testing of key user journeys
   - Verify that all data is displayed correctly throughout the application

## Rollback Plan

In case issues are encountered after removing the backward compatibility layer:

1. Restore the archived compatibility files
2. Reimplement the compatibility functions in service files
3. Update component props to accept both old and new terminology

## Timeline

- Day 1: Archive compatibility files and create documentation
- Day 2: Remove service compatibility functions and update component props
- Day 3: Clean up queryClient.ts and update tests
- Day 4: Comprehensive testing and issue resolution
- Day 5: Final verification and sign-off

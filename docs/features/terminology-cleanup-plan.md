# Terminology Cleanup Plan

## Overview

This document outlines the plan for cleaning up any remaining references to the old "client/ally" terminology in the codebase. This is the final step in the terminology transition to ensure consistency throughout the application.

## Files Requiring Cleanup

### 1. Components with Old Terminology References

#### Summary.tsx
- References to `ally` should be updated to `caregiver`

#### ClientServiceComparison.tsx
- Should be renamed to `PatientServiceComparison.tsx`
- All references to `client` should be updated to `patient`
- All references to `clientId`, `clientName`, etc. should be updated

#### BudgetDebugPage.tsx
- References to `client` and `/api/clients/` should be updated

#### AllySelector.tsx
- Should be replaced with a new `CaregiverSelector.tsx` component
- All references to `ally` should be updated to `caregiver`

#### LanguageSelector.tsx
- References to `ally` should be updated to `caregiver`

### 2. API Endpoint References

Several components still reference the old API endpoints:

- `/api/clients/` should be updated to `/api/patients/`
- `/api/allies/` should be updated to `/api/caregivers/`

### 3. Type References

- Any remaining references to `Client` and `Ally` types should be updated to `Patient` and `Caregiver`

## Implementation Steps

1. **Create New Components**:
   - Create `CaregiverSelector.tsx` to replace `AllySelector.tsx`
   - Create `PatientServiceComparison.tsx` to replace `ClientServiceComparison.tsx`

2. **Update Existing Components**:
   - Update `Summary.tsx` to use `caregiver` instead of `ally`
   - Update `BudgetDebugPage.tsx` to use `patient` instead of `client`
   - Update `LanguageSelector.tsx` to use `caregiver` instead of `ally`

3. **Update API Endpoint References**:
   - Search for and update all remaining references to `/api/clients/` and `/api/allies/`

4. **Update Type References**:
   - Search for and update all remaining references to `Client` and `Ally` types

## Testing

After cleaning up the terminology, comprehensive testing should be performed:

1. **Visual Inspection**:
   - Review all UI components to ensure consistent terminology
   - Check that no references to "client" or "ally" appear in the UI

2. **Functional Testing**:
   - Test all components that were updated
   - Verify that all API calls use the correct endpoints

3. **End-to-End Testing**:
   - Perform end-to-end testing of key user journeys
   - Verify that all data is displayed correctly throughout the application

## Documentation

Update all relevant documentation to reflect the terminology changes:

1. **User Documentation**:
   - Update any user-facing documentation to use the new terminology

2. **API Documentation**:
   - Update API documentation to reflect the new endpoint names

3. **Component Documentation**:
   - Update component documentation to use the new terminology

## Timeline

- Day 1: Create new components to replace those with old terminology
- Day 2: Update existing components with terminology references
- Day 3: Update API endpoint and type references
- Day 4: Comprehensive testing and issue resolution
- Day 5: Update documentation and final verification

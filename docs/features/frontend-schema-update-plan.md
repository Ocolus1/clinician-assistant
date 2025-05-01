# Frontend Schema Update Plan

## Overview

This document outlines the plan for updating the frontend components and services to align with the backend schema changes implemented in Phase 1 of the Clinician Chatbot implementation. The primary changes involve renaming `clients` to `patients`, `allies` to `caregivers`, and `performanceAssessments` to `goalAssessments` throughout the codebase.

## 1. API Client Updates

### 1.1 Update API Endpoint References

- Update all API client functions to use new endpoint names
- Replace all instances of `/api/clients/` with `/api/patients/`
- Replace all instances of `/api/allies/` with `/api/caregivers/`
- Update references to `performanceAssessments` to `goalAssessments`

Files to update:
- `client/src/lib/services/goalPerformanceService.ts`
- `client/src/lib/services/budgetDataService.ts`
- `client/src/lib/services/budgetUtilizationService.ts`
- `client/src/lib/services/progressDataService.ts`
- `client/src/lib/services/strategyDataService.ts`
- `client/src/lib/api/clientReports.ts` (rename to `patientReports.ts`)
- `client/src/lib/queryClient.ts`

### 1.2 Update Type Definitions

- Update all interface definitions to use new schema names
- Rename `ClientGoal` to `PatientGoal`
- Rename `clientId` fields to `patientId`
- Rename `allyId` fields to `caregiverId`
- Update `performanceAssessments` references to `goalAssessments`
- Update `rating` to `achievementLevel`

## 2. Component Updates

### 2.1 Profile Components

- Update all component props and state variables in profile components
- Refactor components that display client/patient data
- Update references to client to patient in all component files

Files to update:
- All files in `client/src/components/profile/`
- Rename `ClientProfile.tsx` to `PatientProfile.tsx`
- Rename `ClientGoals.tsx` to `PatientGoals.tsx`
- Rename `ClientAllies.tsx` to `PatientCaregivers.tsx`

### 2.2 Budget Components

- Update all budget component references from client to patient
- Update budget item references to use new field names

Files to update:
- All files in `client/src/components/budget/`

### 2.3 Dashboard Components

- Update dashboard components to use new schema names
- Update chart and data visualization components

Files to update:
- All files in `client/src/components/dashboard/`

### 2.4 Session Components

- Update session note components to use new schema
- Update references to `presentAllies` to `presentCaregivers`

Files to update:
- All files in `client/src/components/sessions/`

## 3. Form Updates

### 3.1 Form Field Names

- Update all form field names to match new schema
- Update validation schemas to use new field names

Files to update:
- `client/src/components/profile/ClientForm.tsx` (rename to `PatientForm.tsx`)
- `client/src/components/profile/AllyForm.tsx` (rename to `CaregiverForm.tsx`)
- All other form components that reference the old schema

### 3.2 Validation Schemas

- Update all validation schemas to use new field names
- Update error messages to reference new terminology

## 4. Page Updates

- Update all page components to use new schema names
- Rename page files to reflect new terminology

Files to update:
- Files in `client/src/pages/` that reference clients or allies

## 5. Implementation Strategy

### 5.1 Phased Approach

1. **Phase 1: API Client Updates**
   - Update all API endpoint references
   - Update type definitions
   - Test API calls to ensure they work with new endpoints

2. **Phase 2: Component Updates**
   - Update profile components
   - Update budget components
   - Update dashboard components
   - Update session components

3. **Phase 3: Form Updates**
   - Update form field names
   - Update validation schemas
   - Test form submissions

4. **Phase 4: Testing**
   - Test all updated components
   - Verify data flow from frontend to backend
   - Fix any issues discovered during testing

### 5.2 Testing Strategy

- Create test cases for each updated component
- Test all form submissions to ensure they work with new schema
- Test data retrieval and display to ensure it works with new schema
- Test error handling to ensure proper error messages are displayed

## 6. Implementation Timeline

- **Day 1-2**: API Client Updates
- **Day 3-5**: Component Updates
- **Day 6-7**: Form Updates
- **Day 8-10**: Testing and Bug Fixes

## 7. Documentation Updates

- Update frontend documentation to reflect new schema
- Create a migration guide for developers
- Update any user-facing documentation to use new terminology

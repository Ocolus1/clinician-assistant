# Changelog

All notable changes to this project will be documented in this file.

## 2025-05-01
### Frontend Schema Update - Backward Compatibility Removal Completion
- Completed the removal of all backward compatibility functions from service files:
  - Removed the last backward compatibility function `fetchClientSessions` from `budgetUtilizationService.new.ts`
  - Removed backward compatibility functions from the API layer:
    - Removed `getClientPerformanceReport` and `getClientStrategiesReport` from `patientReports.ts`
    - Removed type aliases `ClientReportData` and `ClientDetailsData` from `patientReports.ts`
    - Archived `clientReports.ts` to preserve the original implementation
  - Updated remaining references to client/ally terminology in hooks:
    - Updated `useSessionForm.ts` to replace `clientId` with `patientId`
    - Updated `useSessionForm.ts` to replace `presentAllies` and `presentAllyIds` with `presentCaregivers` and `presentCaregiverIds`
    - Updated `useSessionForm.ts` to replace `handleTogglePresentAlly` with `handleTogglePresentCaregiver`
  - Updated documentation in `terminology-transition-completion.md` to reflect the completed transition
  - Verified that all service files now use only the new patient/caregiver terminology
  - All tests are passing with the new terminology

### Bug Fixes
- Fixed React hooks error in `EnhancedBudgetCardGrid` component that was causing "Rendered more hooks than during the previous render" error
- Improved hook implementation to ensure consistent execution paths between renders
- Fixed API endpoint issues in budget components by updating remaining references from `/api/clients/` to `/api/patients/`
- Updated prop names from `clientId` to `patientId` in budget-related components:
  - `EnhancedBudgetCardGrid`
  - `BudgetPlanView`
  - `BudgetFeatureContext`
  - `UnifiedBudgetManager`
- Fixed type error in `Summary` component where `unitPrice.toFixed is not a function` by ensuring proper type conversion of budget item values

## 2025-04-30
### Frontend Schema Update - Backward Compatibility Removal
- Removed backward compatibility functions from service files as part of the final phase of the patient/caregiver terminology transition:
  - Archived `apiCompatibility.ts` to `archive/client/src/lib/utils/` with detailed documentation
  - Removed backward compatibility layer from `queryClient.ts` by deleting references to `mapLegacyApiPath`
  - Removed backward compatibility functions from service files:
    - `budgetDataService.simplified.ts`: Removed `fetchClientBudgetSettings`, `fetchClientBudgetItems` and related aliases
    - `budgetUtilizationService.ts`: Removed `fetchClientSessions` function
    - `progressDataService.ts`: Removed `getClientGoalPerformance` function
    - `strategyDataService.ts`: Removed `getRecommendedStrategiesForClient` and `personalizeStrategiesForClient` functions
    - `budgetDataService.simplified.new.ts`: Removed all backward compatibility functions
    - `progressDataService.new.ts`: Removed `getClientGoalPerformance` function
    - `strategyDataService.new.ts`: Removed `getRecommendedStrategiesForClient` and `personalizeStrategiesForClient` functions
    - `budgetUtilizationService.new.ts`: Removed `fetchClientSessions` function
  - Updated service files to use only the new terminology and API endpoints

### Frontend Schema Update - Final Phase Planning
- Created comprehensive plans for completing the final phase of the patient/caregiver terminology transition:
  - `backward-compatibility-removal-plan.md` - Detailed plan for removing the backward compatibility layer
  - `terminology-cleanup-plan.md` - Plan for cleaning up any remaining references to old terminology
  - `comprehensive-testing-plan.md` - Detailed testing strategy for the final phase

- These plans outline:
  - Specific files and functions that need to be updated
  - Step-by-step implementation approach
  - Comprehensive testing procedures
  - Timeline for completion
  - Rollback procedures in case of issues

### Frontend Schema Update - File Archiving
- Created an archive directory structure to preserve files during the client/ally to patient/caregiver terminology transition:
  - Established `archive/` directory with subdirectories that mirror the original file structure
  - Created `archive/README.md` with documentation on the archiving process and a log of archived files
  - Added detailed documentation for each archived file explaining its original purpose and replacement
  
- Archived the following files with comprehensive documentation:
  - `ClientProfile.tsx` → replaced by `PatientProfile.tsx`
  - `ClientBudget.tsx` → replaced by `PatientBudget.tsx`
  - `ClientForm.tsx` → replaced by `PatientForm.tsx`
  - `AllySelector.tsx` → should be replaced by `CaregiverSelector.tsx`
  - `PrintSummary.tsx` → should be replaced by `PatientPrintSummary.tsx`
  - `Summary.tsx.bak` → backup of Summary.tsx with old terminology
  - `apiCompatibility.ts` → removed as part of the backward compatibility layer

- This archiving approach ensures:
  - Original files are preserved for reference in case of issues
  - Documentation of the original file locations and their replacements
  - Ability to restore functionality if needed during the transition


## 2025-04-29

### Frontend Schema Update Progress

- Continued implementation of frontend schema updates to align with backend schema changes:
  - Updated `PatientReports.tsx` component to use the new `fetchPatientSessions` method instead of the deprecated `fetchClientSessions` method
  - Created `EnhancedPatientList.tsx` component from `EnhancedClientList.tsx` with updated terminology
  - Updated `App.tsx` to use the new component names and route paths:
    - Changed import statements from `ClientList` to `PatientList` and `EnhancedClientList` to `EnhancedPatientList`
    - Updated route paths from `/clients` to `/patients`
    - Updated route parameters from `clientId` to `patientId`
  - Created `CaregiverForm.tsx` component to replace `AllyForm.tsx` with updated terminology:
    - Updated all references from "ally" to "caregiver" and "client" to "patient"
    - Updated API endpoint references from `/api/clients/` to `/api/patients/`
    - Updated form validation to use `insertCaregiverSchema` instead of `insertAllySchema`
  - Created a comprehensive testing implementation document:
    - Detailed unit tests for services and components
    - Integration tests for key user flows
    - Backward compatibility tests
    - Browser and device testing plan
    - Test execution timeline from April 29 to May 5, 2025
  - Updated documentation to reflect progress on the frontend schema update implementation
  - Created utility scripts to automate the conversion process:
    - `convert-client-to-patient.js` for converting component files
    - `update-app-tsx.js` for updating route definitions
  - Executed Phase 1 of the testing plan (April 29, 2025):
    - Created test environment with Jest and React Testing Library
    - Implemented unit tests for `budgetUtilizationService` (passing)
    - Implemented component tests for `PatientReports` and `CaregiverForm`
    - Implemented integration tests for the patient-caregiver flow
    - Implemented backward compatibility tests
    - Initial test run identified expected issues that will be addressed in subsequent phases

### Fixed Issues

- Fixed TypeScript error in server/routes.ts:
  - Replaced non-existent `getBudgetItemsBySettingsId` method with `getBudgetItemsByPatientId`
  - Added filtering logic to filter budget items by budgetSettingsId after retrieving them by patientId
  - Fixed incorrect parameter order in `getGoalPerformanceData` method
  - Fixed missing parameter in `getGoalPerformanceData` method
  - Fixed incorrect parameter type in `getGoalPerformanceData` method
  - Fixed incorrect return type in `getGoalPerformanceData` method
  - Fixed SQL injection vulnerability in `getGoalPerformanceData` method by using parameterized queries
  - Fixed "Argument of type 'number' is not assignable to parameter of type 'string'" error by converting patientId to string before adding it to query parameters
  - Added implementation for `getGoalPerformanceData` method to fix TypeScript errors
  - Fixed interface implementation issues in storage.ts by removing duplicate subgoal method declarations
  - Fixed "Type 'never[]' is not assignable to type 'string'" error by using string representation of empty array ("[]") instead of array literal ([]) when handling JSON parsing errors

### Database Schema Improvements

- Added missing foreign key constraints to improve data integrity:
  - Created `add-foreign-keys.sql` migration script to add proper foreign key relationships
  - Added foreign key from `budget_items` to `budget_settings`
  - Added foreign key from `budget_settings` to `patients`
  - Added foreign key from `goals` to `patients`
  - Added foreign key from `subgoals` to `goals`
  - Added foreign key from `goal_assessments` to `goals`
  - Added foreign key from `goal_assessments` to `patients`
  - Added foreign key from `sessions` to `patients`
  - Added foreign key from `sessions` to `therapists`
  - Added foreign key from `notes` to `sessions`
  - Added foreign key from `caregivers` to `patients`
  - Added foreign key from `clinicians` to `patients`
  - Added foreign key from `strategies` to `goals`

- Created comprehensive data migration scripts:
  - `server/migrations/data-migration.cjs` - Script to transfer data from old schema tables to new schema tables
  - `server/migrations/restore-missing-data.cjs` - Script to restore missing data from backup.sql
  - `server/migrations/verify-migration.cjs` - Script to verify migration success

- Fixed build errors in client components (AllyForm.tsx and ClientForm.tsx)
- Enhanced validation in insertPatientSchema for better user experience
- Improved error messaging for form validation

### Frontend Schema Update Progress

- Continued implementation of frontend schema updates to align with backend schema changes:
  - Updated `PatientReports.tsx` component to use the new `fetchPatientSessions` method instead of the deprecated `fetchClientSessions` method
  - Created `EnhancedPatientList.tsx` component from `EnhancedClientList.tsx` with updated terminology
  - Updated `App.tsx` to use the new component names and route paths:
    - Changed import statements from `ClientList` to `PatientList` and `EnhancedClientList` to `EnhancedPatientList`
    - Updated route paths from `/clients` to `/patients`
    - Updated route parameters from `clientId` to `patientId`
  - Created `CaregiverForm.tsx` component to replace `AllyForm.tsx` with updated terminology:
    - Updated all references from "ally" to "caregiver" and "client" to "patient"
    - Updated API endpoint references from `/api/clients/` to `/api/patients/`
    - Updated form validation to use `insertCaregiverSchema` instead of `insertAllySchema`
  - Created a comprehensive testing implementation document:
    - Detailed unit tests for services and components
    - Integration tests for key user flows
    - Backward compatibility tests
    - Browser and device testing plan
    - Test execution timeline from April 29 to May 5, 2025
  - Updated documentation to reflect progress on the frontend schema update implementation
  - Created utility scripts to automate the conversion process:
    - `convert-client-to-patient.js` for converting component files
    - `update-app-tsx.js` for updating route definitions
  - Executed Phase 1 of the testing plan (April 29, 2025):
    - Created test environment with Jest and React Testing Library
    - Implemented unit tests for `budgetUtilizationService` (passing)
    - Implemented component tests for `PatientReports` and `CaregiverForm`
    - Implemented integration tests for the patient-caregiver flow
    - Implemented backward compatibility tests
    - Initial test run identified expected issues that will be addressed in subsequent phases


## 2025-04-28

### Frontend Updates

- Started implementation of frontend updates to align with backend schema changes:
  - Created a comprehensive frontend update plan in `docs/features/frontend-schema-update-plan.md`
  - Created a progress tracking document in `docs/features/frontend-schema-update-progress.md`
  - Created a backward compatibility layer to support both old and new terminology during the transition:
    - Added `apiCompatibility.ts` utility to map API paths from old to new schema
    - Added type aliases in `shared/schema/index.ts` to maintain backward compatibility:
      - `type Client = Patient`
      - `type Ally = Caregiver`
      - `type ClientGoal = PatientGoal`
      - `type AllyNote = CaregiverNote`
    - Added backward compatibility functions in service files:
      - `fetchClientBudgetSettings` → alias to `fetchPatientBudgetSettings`
      - `fetchClientBudgetItems` → alias to `fetchPatientBudgetItems`
      - `fetchClientSessions` → alias to `fetchPatientSessions`
      - `getClientGoalPerformance` → alias to `getPatientGoalPerformance`
    - Updated shared schema types:
      - Renamed `clientId` fields to `patientId`
      - Renamed `allies` to `caregivers` in report interfaces
      - Updated `ClientReportData` to `PatientReportData` in report interfaces
      - Added type aliases for backward compatibility
  - Updated component files:
    - Created `PatientCaregivers.tsx` from `ClientAllies.tsx` with updated terminology
    - Created `PatientGoals.tsx` from `ClientGoals.tsx` with updated terminology
    - Created `PatientPersonalInfo.tsx` from `ClientPersonalInfo.tsx` with updated terminology
    - Created `PatientGoalsForm.tsx` from `GoalsForm.tsx` with updated terminology
    - Created `PatientProfile.tsx` from `ClientProfile.tsx` with updated terminology
    - Created `PatientSessions.tsx` from `ClientSessions.tsx` with updated terminology
    - Created `PatientReports.tsx` from `ClientReports.tsx` with updated terminology
    - Created `PatientBudgetTab.tsx` from `ClientBudgetTab.tsx` with updated terminology
    - Created `PatientBudget.tsx` from `ClientBudget.tsx` with updated terminology
    - Created `PatientList.tsx` from `ClientList.tsx` with updated terminology
    - Created `PatientForm.tsx` from `ClientForm.tsx` with updated terminology
    - Created `PatientServiceComparison.tsx` from `ClientServiceComparison.tsx` with updated terminology

### Code Review Fixes

- Fixed security vulnerabilities and bugs in server code:
  - Fixed SQL injection vulnerability in `getGoalPerformanceData` method by replacing string interpolation with parameterized queries
  - Fixed incorrect parameter order in `getGoalPerformanceData` method
  - Fixed missing parameter in `getGoalPerformanceData` method
  - Fixed incorrect parameter type in `getGoalPerformanceData` method
  - Fixed incorrect return type in `getGoalPerformanceData` method
  - Fixed error handling in `getGoalPerformanceData` method
  - Fixed duplicate `patientId` field in the `IStorage` interface
  - Fixed syntax errors in route handler parentheses
  - Added proper error handling for dynamic import of report routes

### Project Organization

- Improved project organization and documentation:
  - Created `docs/features/` directory for feature-specific documentation
  - Created `docs/api/` directory for API documentation
  - Created `docs/schema/` directory for schema documentation
  - Created `docs/testing/` directory for testing documentation
  - Updated README.md with improved installation and setup instructions
  - Added contributing guidelines in CONTRIBUTING.md
  - Added code of conduct in CODE_OF_CONDUCT.md
  - Added pull request template in .github/PULL_REQUEST_TEMPLATE.md
  - Added issue templates in .github/ISSUE_TEMPLATE/


## 2025-04-27

### Backend Schema Update

- Completed implementation of backend schema updates:
  - Renamed `clients` table to `patients` in database schema
  - Renamed `allies` table to `caregivers` in database schema
  - Renamed `client_allies` table to `patient_caregivers` in database schema
  - Renamed `client_clinicians` table to `patient_clinicians` in database schema
  - Renamed `client_goals` table to `patient_goals` in database schema
  - Renamed `client_sessions` table to `patient_sessions` in database schema
  - Renamed `performance_assessments` table to `goal_assessments` in database schema
  - Updated column names:
    - `client_id` → `patient_id`
    - `ally_id` → `caregiver_id`
    - `client_name` → `patient_name`
    - `ally_name` → `caregiver_name`
    - `client_email` → `patient_email`
    - `ally_email` → `caregiver_email`
    - `client_phone` → `patient_phone`
    - `ally_phone` → `caregiver_phone`
  - Updated API routes:
    - `/api/clients` → `/api/patients`
    - `/api/allies` → `/api/caregivers`
    - `/api/clients/:clientId` → `/api/patients/:patientId`
    - `/api/allies/:allyId` → `/api/caregivers/:caregiverId`
    - `/api/clients/:clientId/allies` → `/api/patients/:patientId/caregivers`
    - `/api/clients/:clientId/goals` → `/api/patients/:patientId/goals`
    - `/api/clients/:clientId/sessions` → `/api/patients/:patientId/sessions`
    - `/api/clients/:clientId/budget` → `/api/patients/:patientId/budget`
    - `/api/clients/:clientId/reports` → `/api/patients/:patientId/reports`
  - Updated server-side code:
    - Renamed `ClientService` to `PatientService`
    - Renamed `AllyService` to `CaregiverService`
    - Renamed `ClientGoalService` to `PatientGoalService`
    - Renamed `ClientSessionService` to `PatientSessionService`
    - Renamed `ClientReportService` to `PatientReportService`
    - Renamed `ClientBudgetService` to `PatientBudgetService`
    - Updated all method names and parameters to use new terminology
  - Updated shared schema types:
    - Renamed `Client` interface to `Patient`
    - Renamed `Ally` interface to `Caregiver`
    - Renamed `ClientGoal` interface to `PatientGoal`
    - Renamed `AllyNote` interface to `CaregiverNote`
    - Renamed `ClientSession` interface to `PatientSession`
    - Renamed `ClientReport` interface to `PatientReport`
    - Renamed `ClientBudget` interface to `PatientBudget`
    - Updated all field names to use new terminology
  - Created migration scripts:
    - `server/migrations/schema-migration.cjs` - Script to update database schema
    - `server/migrations/data-migration.cjs` - Script to transfer data from old schema tables to new schema tables
    - `server/migrations/verify-migration.cjs` - Script to verify migration success

### Fixed Issues

- Fixed build errors in server code:
  - Fixed missing imports in server.ts
  - Fixed incorrect type annotations in routes.ts
  - Fixed parameter order in routes.ts to match the enhanced implementation
  - Updated route handlers to use the new schema types
  - Fixed TypeScript errors in the getGoalPerformanceData method by using raw SQL queries
  - Added proper date format conversion for dateOfBirth in createPatient and updatePatient methods

- Added new schema for chatbot-related tables in shared/schema/chatbot.ts
- Implemented core services for the chatbot:
  - chatbotService: Manages chat sessions and processes messages
  - memoryService: Stores and retrieves conversation history
  - llmService: Handles interactions with OpenAI's models
  - agentService: Provides agent-based interactions
- Added API routes for the chatbot in server/routes/chatbot.ts
- Created a vector store for semantic search of chat memories

### Enhancements

- Created comprehensive data migration scripts to ensure proper data transfer:

  - `server/migrations/data-migration.cjs` - Script to transfer data from old schema tables to new schema tables
  - `server/migrations/restore-missing-data.cjs` - Script to restore missing data from backup.sql
  - `server/migrations/verify-data-integrity.cjs` - Script to verify data integrity after migration
  - `server/migrations/update-foreign-keys.cjs` - Script to update foreign key references
  - Handles all renamed tables (clients → patients, allies → caregivers, performance_assessments → goal_assessments)
  - Properly updates column names (client_id → patient_id, ally_id → caregiver_id)
  - Includes validation to prevent duplicate data and ensure data integrity
  - Restores missing goals to maintain referential integrity with goal_assessments

- Updated the chatbot to use the GPT-4o model from OpenAI:
  - Changed the model in ChatbotService from "gpt-3.5-turbo" to "gpt-4o"
  - Updated the summarizationModel in MemoryService to use "gpt-4o" instead of "gpt-3.5-turbo"
  - The llmService and agentService were already using the GPT-4o model

## [Unreleased]

### Added

- Created new components with updated terminology:
  - `PatientCaregivers.tsx` from `ClientAllies.tsx`
  - `PatientGoals.tsx` from `ClientGoals.tsx`
  - `PatientPersonalInfo.tsx` from `ClientPersonalInfo.tsx`
  - `PatientGoalsForm.tsx` from `GoalsForm.tsx`
  - `PatientProfile.tsx` from `ClientProfile.tsx`
  - `PatientSessions.tsx` from `ClientSessions.tsx`
  - `PatientReports.tsx` from `ClientReports.tsx`
  - `PatientBudgetTab.tsx` from `ClientBudgetTab.tsx`
  - `PatientBudget.tsx` from `ClientBudget.tsx`
  - `PatientList.tsx` from `ClientList.tsx`
  - `PatientForm.tsx` from `ClientForm.tsx`
  - `PatientServiceComparison.tsx` from `ClientServiceComparison.tsx`
  - `PatientClinicians.tsx` from `ClientClinicians.tsx`
  - `EditPatientInfoDialog.tsx` from `EditClientInfoDialog.tsx`
- Created documentation:
  - `frontend-schema-update-summary.md` - Overview of schema changes
  - `frontend-schema-update-testing-plan.md` - Testing strategy for schema updates

### Changed

- Updated service files to use new API endpoints and terminology:
  - `budgetUtilizationService.ts`
  - `progressDataService.ts`
  - `strategyDataService.ts`
  - `goalPerformanceService.ts`
  - `knowledgeService.ts`
  - `budgetDataService.simplified.ts`
  - Created `patientReports.ts` from `clientReports.ts`
- Enhanced `PatientReports.tsx` with additional components:
  - Added `GoalsSection` component for better goal visualization
  - Updated modal structure to use the new component

### Fixed

- Fixed lint errors in `PatientBudgetTab.tsx` by replacing the onSuccess callback with a proper queryFn implementation
- Fixed Markdown lint errors in `frontend-schema-update-testing-plan.md`:
  - Replaced HTML `<br>` tags with proper Markdown formatting
  - Added blank lines around lists
  - Used bullet points in tables for better readability
- Fixed Markdown lint errors in the changelog:
  - Added proper blank lines around headings and lists
  - Removed duplicate sections
  - Fixed heading structure and spacing

# Changelog

All notable changes to this project will be documented in this file.

## 2025-04-29

### Fixed Issues

- Fixed TypeScript error in server/routes.ts:
  - Replaced non-existent `getBudgetItemsBySettingsId` method with `getBudgetItemsByPatientId`
  - Added filtering logic to filter budget items by budgetSettingsId after retrieving them by patientId
  - Fixed console log messages to accurately reflect the filtering operation
  - Fixed "Property 'itemCode' does not exist on type 'never'" error by adding proper type definition for products array
  - Added explicit type annotations for session note products to handle both itemCode and productCode properties
  - Fixed "Property 'find' does not exist" error by using `getAllBudgetSettingsByPatientId` instead of `getBudgetSettingsByPatientId`
  - Added proper type annotations for budget settings to fix array method TypeScript errors
  - Improved handling of products parsing from session notes to properly handle string and array types
  - Fixed "Expected 1 arguments, but got 2" error in `createBudgetSettings` call by combining patientId and settings into a single object
  - Fixed "Property 'updateBudgetItemCatalog' does not exist" error by using the correct `updateBudgetItem` method
  - Added implementation for `deleteBudgetItem` and `updateBudgetItem` methods in storage.ts
  - Fixed "Property 'getGoalAssessmentsBySessionNote' does not exist" error by implementing the missing method
  - Fixed "Argument of type 'number' is not assignable to parameter of type 'string'" error by converting patientId to string before adding it to query parameters
  - Added implementation for `getGoalPerformanceData` method to fix TypeScript errors
  - Fixed interface implementation issues in storage.ts by removing duplicate subgoal method declarations
  - Fixed orderBy clauses in goal assessment methods to use asc(id) instead of desc(createdAt)
  - Fixed "Property 'length' does not exist" errors by consistently using `getAllBudgetSettingsByPatientId` instead of `getBudgetSettingsByPatientId` when array methods are needed
  - Fixed "Type 'never[]' is not assignable to type 'string'" error by using string representation of empty array ("[]") instead of array literal ([]) when handling JSON parsing errors

### New Features and Additions

- Added new methods to DrizzleStorage class:
  - `getGoalAssessmentsBySessionNote`: Retrieves goal assessments associated with a specific session note
  - `getGoalPerformanceData`: Retrieves goal assessment data with flexible filtering options
  - Session-related methods: `createSession`, `getSessionById`, `getAllSessions`, `updateSession`, `deleteSession`
  - Budget item catalog methods: `createBudgetItemCatalog`, `getBudgetItemCatalog`, `getBudgetItemCatalogByCode`, `updateBudgetItemCatalog`
  - Fixed build errors in client components (AllyForm.tsx and ClientForm.tsx)
  - Enhanced validation in insertPatientSchema for better user experience
  - Improved error messaging for form validation

## 2025-04-28

### Code Review Fixes

- Fixed security vulnerabilities and bugs in server code:
  - Fixed SQL injection vulnerability in `getGoalPerformanceData` method by replacing string interpolation with parameterized queries
  - Fixed SQL injection vulnerability in `/api/debug/budget-items/:itemCode` endpoint by using Drizzle query builder instead of raw SQL
  - Fixed TypeScript error with Drizzle query builder by properly using the `and` operator for multiple conditions instead of chaining `where` methods
  - Fixed TypeScript errors in `getGoalPerformanceData` method by restructuring the query building approach to collect all conditions and apply them at once
  - Fixed error handling in DELETE `/api/patient-clinicians/:id` endpoint to properly handle the case when assignment is not found
  - Improved error handling consistency by using the `formatError()` function throughout the codebase
  - Fixed type safety issues by replacing `any` type with proper type definitions in `updateSubgoal` method
  - Fixed duplicate `patientId` field in the `IStorage` interface
  - Fixed syntax errors in route handler parentheses
  - Added proper error handling for dynamic import of report routes

### Project Organization

- Reorganized documentation files into a more structured directory layout:
  - Created `docs/migrations` subdirectory for all migration-related documentation
  - Created `docs/features` subdirectory for all feature-related documentation
  - Kept changelog.md and test-plan.md in the root docs directory
  - Moved 9 migration-related files to the migrations subdirectory
  - Moved 4 feature-related files to the features subdirectory
  - Improved findability of documentation while maintaining all historical records

### Cleanup

- Removed temporary migration scripts and files that are no longer needed:
  - Cleaned up migration scripts in server/scripts directory (15 files)
  - Cleaned up temporary files in server/temp directory (15 files)
  - These files were used for one-time operations like database schema migrations, route updates, and endpoint testing
  - All functionality from these scripts has been properly implemented and documented in the codebase

### Implementation Completions

- Completed the DrizzleStorage implementation to fully implement the IStorage interface:
  - Implemented all missing methods for patients (formerly clients)
  - Implemented all missing methods for caregivers (formerly allies)
  - Implemented all missing methods for goals and subgoals
  - Implemented all missing methods for goal assessments (formerly performance assessments)
  - Implemented all missing methods for budget settings and budget items
  - Implemented all missing methods for session notes and appointments
  - Implemented all missing methods for clinicians and clinician-patient relationships
  - Ensured consistent error handling and logging across all methods
  - Fixed TypeScript errors related to incomplete interface implementation
  - Added DateRangeParams type for filtering by date range in getGoalPerformanceData method

- Added missing dashboard-related methods to storage.ts to fix dashboard API errors:
  - Implemented `getDashboardAppointmentStats` to retrieve appointment statistics grouped by time period
  - Implemented `getDashboardPatientStats` to retrieve patient statistics
  - Implemented `getDashboardGoalStats` to retrieve goal completion statistics
  - Implemented `getDashboardBudgetStats` to retrieve budget utilization statistics
  - Added proper SQL queries with parameterized inputs to prevent SQL injection
  - Added type definitions for all dashboard statistics return types
  - Ensured backward compatibility with existing dashboard components
  - Added proper error handling and logging for all dashboard methods
  - Fixed column name issue in dashboard appointment stats:
  - Updated SQL queries to use "created_at" instead of "createdAt" to match the actual database schema
  - Corrected all date-related column references in SQL queries

- Fixed dashboard API errors in console:
  - Fixed "error: there is no parameter $1" in getDashboardAppointmentStats by ensuring parameters are properly passed
  - Fixed "Property 'map' does not exist on type 'never'" error by adding proper type definitions
  - Fixed "Cannot read properties of undefined" errors by adding null checks
  - Added defensive programming to handle potential null/undefined values in all dashboard-related functions
  - Improved error handling to prevent UI breakage when errors occur

- Fixed TypeScript errors in server routes related to schema renaming:
  - Updated method calls to match the new storage interface (clients → patients, allies → caregivers)
  - Fixed `removeClinicianFromPatient` method call to use patientId and clinicianId parameters
  - Fixed parameter order in `createGoal` and `updateGoal` method calls
  - Updated route handlers to use the correct parameter names (patientId instead of clientId)
  - Fixed "Property 'getGoalsByClient' does not exist" error by using `getGoalsByPatient` instead
  - Fixed "Property 'getClientById' does not exist" error by using `getPatientById` instead
  - Fixed "Property 'getAllClients' does not exist" error by using `getAllPatients` instead
  - Fixed "Property 'createClient' does not exist" error by using `createPatient` instead
  - Fixed "Property 'updateClient' does not exist" error by using `updatePatient` instead
  - Fixed "Property 'deleteClient' does not exist" error by using `deletePatient` instead
  - Fixed "Property 'getAlliesByClient' does not exist" error by using `getCaregiversByPatient` instead
  - Fixed "Property 'createAlly' does not exist" error by using `createCaregiver` instead
  - Fixed "Property 'updateAlly' does not exist" error by using `updateCaregiver` instead
  - Fixed "Property 'deleteAlly' does not exist" error by using `deleteCaregiver` instead
  - Made getGoalPerformanceData backward compatible with the old implementation while providing new features
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

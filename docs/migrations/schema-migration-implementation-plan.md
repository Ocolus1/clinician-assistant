# Schema Migration Implementation Plan

## Overview

This document outlines the comprehensive plan for completing the schema migration from the old naming convention (`client`, `allies`) to the new naming convention (`patient`, `caregivers`) throughout the codebase. The migration is being performed to improve AI interpretability and consistency in the application.

## Current Status

Initial work has been completed to update method names and schema references in the codebase:

- Updated method names in `storage.ts` (e.g., `assignClinicianToClient` → `assignClinicianToPatient`)
- Updated schema references in `routes.ts`
- Fixed TypeScript errors related to the schema changes
- Created temporary workarounds using type assertions (`as any`)

## Implementation Steps

### Phase 1: Complete DrizzleStorage Implementation (Priority: High)

1. **Update Interface Methods**
   - Review the `IStorage` interface to ensure all method names follow the new naming convention
   - Update any remaining references to `client` or `allies` in the interface

2. **Implement Missing Methods**
   - Implement all methods defined in the `IStorage` interface in the `DrizzleStorage` class
   - Ensure consistent naming throughout the implementation
   - Add proper type annotations to all methods

3. **Fix Type Errors**
   - Remove type assertions (`as any`) once proper implementations are in place
   - Fix any remaining TypeScript errors in the `storage.ts` file

### Phase 2: Update Routes and API Endpoints (Priority: Medium)

1. **Standardize Method Calls**
   - Update all method calls in `routes.ts` to use the new method names
   - Replace type assertions with proper method calls
   - Update error messages to use the new terminology (`patient` instead of `client`)

2. **Update API Documentation**
   - Update API documentation to reflect the new schema
   - Ensure all endpoint descriptions use the new terminology

3. **Fix Module Resolution Issues**
   - Resolve any module resolution errors in the server startup
   - Ensure all import paths are correct and consistent

### Phase 3: Database Schema Updates (Priority: Low)

1. **Create Migration Script**
   - Create a SQL migration script to update the database schema
   - Rename columns like `clientId` to `patientId` in the database tables
   - Add appropriate indexes and constraints

2. **Test Migration Script**
   - Test the migration script on a development database
   - Verify that all data is correctly migrated
   - Ensure no data loss during the migration

3. **Deploy Database Changes**
   - Schedule a maintenance window for the database migration
   - Execute the migration script on the production database
   - Verify the migration was successful

### Phase 4: Testing and Validation (Priority: High)

1. **Unit Testing**
   - Update unit tests to use the new method names and schema
   - Add tests for the new methods in the `DrizzleStorage` class
   - Ensure all tests pass with the new schema

2. **Integration Testing**
   - Test all API endpoints to ensure they work with the new schema
   - Verify that all data is correctly retrieved and updated
   - Test edge cases and error handling

3. **Performance Testing**
   - Verify that the new schema doesn't impact performance
   - Measure response times for critical endpoints
   - Optimize any slow queries

## Timeline

- **Phase 1**: 2-3 days
- **Phase 2**: 1-2 days
- **Phase 3**: 1 day (plus maintenance window)
- **Phase 4**: 2-3 days

Total estimated time: 6-9 days

## Risks and Mitigation

1. **Data Loss**
   - Risk: Data could be lost during the database migration
   - Mitigation: Create backups before migration, test thoroughly on development environment

2. **API Breakage**
   - Risk: API changes could break client applications
   - Mitigation: Maintain backward compatibility where possible, communicate changes to API consumers

3. **Performance Impact**
   - Risk: Schema changes could impact query performance
   - Mitigation: Add appropriate indexes, monitor performance during testing

## Success Criteria

The schema migration will be considered successful when:

1. All references to `client` and `allies` in the codebase have been updated to `patient` and `caregivers`
2. All TypeScript errors related to the schema migration have been resolved
3. The server starts and runs without errors
4. All API endpoints work correctly with the new schema
5. All tests pass with the new schema
6. The database schema has been updated to reflect the new naming convention

## Rollback Plan

In case of critical issues:

1. Revert code changes to the pre-migration state
2. Restore database from backup if necessary
3. Document the issues encountered for future migration attempts

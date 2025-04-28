# Schema Migration Changes

## Overview

This document outlines the schema migration changes implemented to improve AI interpretability in the clinician assistant application. The primary changes involve renaming entities from "clients" to "patients" and "allies" to "caregivers" throughout the codebase and database.

## Changes Implemented

### Database Schema Changes

- Renamed tables:
  - `clients` → `patients`
  - `allies` → `caregivers`
  - `client_clinicians` → `patient_clinicians`
  - `performance_assessments` → `goal_assessments`

- Renamed columns:
  - `client_id` → `patient_id` in multiple tables
  - `ally_id` → `caregiver_id` in multiple tables
  - `performance_assessment_id` → `goal_assessment_id` in the `milestone_assessments` table
  - `priority` → `importance_level` in the `goals` table

- Updated foreign key constraints:
  - Changed `milestone_assessments.performance_assessment_id` foreign key to reference `goal_assessments` instead of `performance_assessments`

### TypeScript Interface Changes

- Updated the `IStorage` interface in `storage.ts`:
  - Renamed methods related to clients to use "patient" terminology
  - Renamed methods related to allies to use "caregiver" terminology
  - Updated method signatures to use the new parameter names

### Implementation Changes

- Updated the `DrizzleStorage` class implementation:
  - Implemented all methods with the new naming convention
  - Fixed TypeScript errors related to the schema changes
  - Updated database queries to use the new table and column names

### API Endpoint Changes

- Updated API routes in `routes.ts`:
  - Changed `/api/clients` → `/api/patients`
  - Changed `/api/allies` → `/api/caregivers`
  - Changed `/api/client-clinicians` → `/api/patient-clinicians`
  - Updated method calls to use the new method names from the storage interface

## Migration Scripts

- Created SQL migration script (`schema-rename-migration.sql`) to update the database schema
- Created a Node.js script (`update-routes.mjs`) to automatically update method names in `routes.ts`
- Created a CommonJS script (`run-migration.cjs`) to execute the SQL migration script

## Remaining Issues

- TypeScript errors in `storage.ts` related to property names in object literals
- Need to set the DATABASE_URL environment variable to run the migration script
- Need to verify that all API endpoints work correctly with the new schema

## Next Steps

1. Fix remaining TypeScript errors in `storage.ts`
2. Run the migration script with the proper DATABASE_URL
3. Test all API endpoints to ensure they work with the new schema
4. Update client-side code to use the new method names and schema

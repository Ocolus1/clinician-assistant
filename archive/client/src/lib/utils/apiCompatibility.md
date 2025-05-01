# Archived File: apiCompatibility.ts

## Original Location
`/client/src/lib/utils/apiCompatibility.ts`

## Date Archived
2025-04-30

## Reason for Archiving
This file has been archived as part of the final phase of the transition from "client/ally" terminology to "patient/caregiver" terminology. It contained the backward compatibility layer that was used during the transition period and is no longer needed now that all components have been updated to use the new terminology.

## Functions
The file contained the following key functions:

1. `mapLegacyApiPath(url: string): string`
   - Maps legacy API paths (e.g., `/api/clients`) to their new equivalents (e.g., `/api/patients`)
   - Handles special cases like `/api/clients/{id}/allies` to `/api/patients/{id}/caregivers`

2. `mapLegacySchema(data: any): any`
   - Maps legacy data fields to their new equivalents
   - Converts `clientId` to `patientId`, `allyId` to `caregiverId`, etc.
   - Recursively processes nested objects and arrays

3. `mapLegacyArraySchema(dataArray: any[]): any[]`
   - Maps arrays of legacy data objects to their new equivalents
   - Wrapper around `mapLegacySchema` for array processing

4. `mapNewToLegacySchema(data: any): any`
   - Maps new schema data back to legacy format for backward compatibility
   - Converts `patientId` to `clientId`, `caregiverId` to `allyId`, etc.
   - Used to ensure that legacy code could still work with the new API responses

## Usage
This file was used by:
- `queryClient.ts` for handling API requests and responses
- Various service files that needed to maintain backward compatibility during the transition

## Notes
With the removal of this compatibility layer, all components and services should now directly use the new terminology (patient/caregiver) without any mapping or conversion. If any issues arise after removing this file, check for components or services that might still be expecting the old field names or API paths.

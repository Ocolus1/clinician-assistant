# Archived File: ClientProfile.tsx

## Original Location
`/client/src/pages/ClientProfile.tsx`

## Date Archived
2025-04-29

## Reason for Archiving
This file has been archived as part of the transition from "client/ally" terminology to "patient/caregiver" terminology. It has been replaced by `PatientProfile.tsx`.

## Dependencies
This file was dependent on several components that have also been renamed:
- ClientPersonalInfo → PatientPersonalInfo
- ClientAllies → PatientCaregivers
- ClientGoals → PatientGoals
- ClientClinicians → PatientClinicians
- ClientSessions → PatientSessions
- ClientReports → PatientReports
- EditClientInfoDialog → EditPatientInfoDialog
- AddAllyDialog → AddCaregiverDialog

## API Endpoints
This file used API endpoints with `/clients/` which have been replaced with `/patients/` in the new implementation.

## Notes
If you need to restore this file, make sure to also restore its dependencies and update any API endpoints that may have changed since archiving.

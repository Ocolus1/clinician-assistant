# Archived File: PrintSummary.tsx

## Original Location
`/client/src/pages/PrintSummary.tsx`

## Date Archived
2025-04-30

## Reason for Archiving
This file has been archived as part of the transition from "client/ally" terminology to "patient/caregiver" terminology. It should be replaced by a `PatientPrintSummary.tsx` component.

## Dependencies
This file depends on:
- AllySelector component from "../components/summary/AllySelector"
- Client, Ally, Goal, BudgetItem, BudgetSettings types from "@shared/schema"

## API Endpoints
This file uses API endpoints with `/clients/` which should be replaced with `/patients/` in the new implementation:
- `/api/clients/${parsedClientId}`
- `/api/clients/${parsedClientId}/allies`
- `/api/clients/${parsedClientId}/goals`
- `/api/clients/${parsedClientId}/budget-items`
- `/api/clients/${parsedClientId}/budget-settings`

## Notes
This component is responsible for generating a printable summary of client information, including personal details, allies, goals, and budget information. If you need to restore this file, make sure to update all references to "client" to "patient" and "ally" to "caregiver" in the new system.

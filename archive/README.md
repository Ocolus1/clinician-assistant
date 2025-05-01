# Archive Directory

This directory contains files that have been archived during the transition from "client/ally" terminology to "patient/caregiver" terminology.

Each file is stored in a directory structure that mirrors its original location, and includes documentation about when it was archived and why.

## Archive Structure

- `client/` - Contains archived frontend files
- `server/` - Contains archived backend files
- `docs/` - Contains archived documentation files

## Archive Log

| Date | File | Original Location | Reason for Archiving |
|------|------|-------------------|----------------------|
| 2025-04-29 | ClientProfile.tsx | /client/src/pages/ClientProfile.tsx | Replaced by PatientProfile.tsx |
| 2025-04-29 | ClientBudget.tsx | /client/src/components/profile/ClientBudget.tsx | Replaced by PatientBudget.tsx |
| 2025-04-30 | ClientForm.tsx | /client/src/components/onboarding/ClientForm.tsx | Replaced by PatientForm.tsx |
| 2025-04-30 | AllySelector.tsx | /client/src/components/summary/AllySelector.tsx | Should be replaced by CaregiverSelector.tsx |
| 2025-04-30 | PrintSummary.tsx | /client/src/pages/PrintSummary.tsx | Should be replaced by PatientPrintSummary.tsx |
| 2025-04-30 | Summary.tsx.bak | /client/src/pages/Summary.tsx.bak | Backup of Summary.tsx with old terminology |
| 2025-04-30 | apiCompatibility.ts | /client/src/lib/utils/apiCompatibility.ts | Backward compatibility layer no longer needed |

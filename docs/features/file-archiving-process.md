# File Archiving Process for Terminology Transition

## Overview

This document describes the process used to archive files during the transition from "client/ally" terminology to "patient/caregiver" terminology. Rather than completely removing files that have been replaced, we've established an archiving system to preserve the original files for reference and potential restoration if needed.

## Archive Structure

The archive directory mirrors the original file structure to make it easy to locate archived files:

```
archive/
├── README.md                 # Overview and log of archived files
├── client/                   # Frontend files
│   └── src/
│       ├── components/
│       │   ├── onboarding/   # Onboarding-related components
│       │   ├── profile/      # Profile-related components
│       │   └── summary/      # Summary-related components
│       └── pages/            # Page components
├── server/                   # Backend files
└── docs/                     # Documentation files
```

## Archiving Process

For each file that is being replaced during the terminology transition:

1. A corresponding directory structure is created in the `archive/` directory
2. A markdown documentation file is created with the same name as the archived file plus `.md` extension
3. The original file is copied to the archive directory
4. The documentation file includes:
   - Original location
   - Date archived
   - Reason for archiving
   - Dependencies
   - API endpoints used
   - Notes about the file's purpose and usage

## Archived Files

The following files have been archived as part of the terminology transition:

| File | Original Location | Replacement |
|------|-------------------|-------------|
| ClientProfile.tsx | /client/src/pages/ClientProfile.tsx | PatientProfile.tsx |
| ClientBudget.tsx | /client/src/components/profile/ClientBudget.tsx | PatientBudget.tsx |
| ClientForm.tsx | /client/src/components/onboarding/ClientForm.tsx | PatientForm.tsx |
| AllySelector.tsx | /client/src/components/summary/AllySelector.tsx | CaregiverSelector.tsx (to be created) |
| PrintSummary.tsx | /client/src/pages/PrintSummary.tsx | PatientPrintSummary.tsx (to be created) |
| Summary.tsx.bak | /client/src/pages/Summary.tsx.bak | N/A (backup file) |

## Restoration Process

If a file needs to be restored from the archive:

1. Copy the file from the archive directory to its original location
2. Update any references to match the current terminology (patient/caregiver)
3. Update API endpoints from `/clients/` to `/patients/` and `/allies/` to `/caregivers/`
4. Test the functionality to ensure it works with the new schema

## Future Considerations

The archive directory should be maintained for a reasonable period (at least 3-6 months) after the completion of the terminology transition to ensure that any issues that arise can be addressed by referencing the original implementation.

After this period, the archive can be removed or moved to long-term storage if no longer needed for day-to-day development.

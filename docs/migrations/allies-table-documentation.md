# Allies Table Documentation

## Overview

This document provides detailed information about the `allies` table found in the database backup file (`backup.sql`). The allies table stores information about people associated with clients who provide support or have some relationship with the client (caregivers, family members, etc.).

## Table Location

The allies table data was located in the `backup.sql` file between lines 1114-1199.

## Table Structure

The `allies` table has the following structure:

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| id | integer | Primary key identifier for each ally |
| client_id | integer | Foreign key reference to the client this ally is associated with |
| name | text | The name of the ally |
| relationship | text | The relationship between the ally and the client (e.g., parent, sibling, spouse) |
| preferred_language | text | The preferred language of communication for the ally |
| email | text | Email address for contacting the ally |
| access_therapeutics | boolean | Whether the ally has access to therapeutic information |
| access_financials | boolean | Whether the ally has access to financial information |
| phone | text | Phone number for contacting the ally (nullable) |
| notes | text | Additional notes about the ally (nullable) |
| archived | boolean | Whether the ally record is archived |

## Data Summary

The `allies` table contains 104 records of client allies/caregivers. Key observations:

- Most common relationship types: parent, sibling, spouse
- Languages represented: English, Spanish, French, Arabic, Hindi
- Most allies have therapeutic access permissions
- Fewer allies have financial access permissions
- Many records have null values for phone and notes fields

## Migration Context

As part of the clinician-facing chatbot implementation, the `allies` table will be migrated to the new `caregivers` table. This migration is part of the schema changes outlined in the implementation plan to improve AI interpretability of the database schema.

## Sample Data

Here's a sample of the data from the allies table:

```sql
COPY public.allies (id, client_id, name, relationship, preferred_language, email, access_therapeutics, access_financials, phone, notes, archived) FROM stdin;
95	84	Mohamad	parent	arabic	m.chaaban1980@gmail.com	t	t	\N	\N	f
96	84	Mariam	parent	english	Ninja@gmail.com	t	t	\N	\N	f
97	85	Mohamad	parent	french	m.chaaban1980@gmail.com	t	f	\N	\N	f
105	89	Sarah Johnson	Parent	English	sarah@example.com	t	t	\N	\N	f
181	184	dff	parent	english	mshahzaib101ed@gmail.com	t	f	03243329192	sdfdsf	f
```

## Related Tables

The `allies` table has a relationship with the `clients` table through the `client_id` foreign key.

## Notes for Implementation

When implementing the migration from `allies` to `caregivers`:

1. Ensure all data is preserved during the migration
2. Update any foreign key references to the allies table
3. Update application code to reference the new table name
4. Consider adding additional fields that might enhance the chatbot's understanding of caregiver relationships

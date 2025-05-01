-- Migration script to add missing foreign key constraints
-- This script adds foreign key constraints between patients and documents, and ensures session_notes has proper constraints

-- Step 1: Check if documents table exists and add foreign key constraint to patients
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'documents'
    ) THEN
        -- Check if patient_id column exists in documents table
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'patient_id'
        ) THEN
            -- Check if the foreign key constraint already exists
            IF NOT EXISTS (
                SELECT FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'documents' 
                AND ccu.table_name = 'patients'
                AND ccu.column_name = 'id'
            ) THEN
                -- Add foreign key constraint
                RAISE NOTICE 'Adding foreign key constraint from documents.patient_id to patients.id';
                ALTER TABLE documents
                ADD CONSTRAINT fk_documents_patient
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
            ELSE
                RAISE NOTICE 'Foreign key constraint from documents.patient_id to patients.id already exists';
            END IF;
        ELSE
            -- Check if client_id column exists (old name)
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'client_id'
            ) THEN
                RAISE NOTICE 'Renaming client_id to patient_id in documents table';
                ALTER TABLE documents RENAME COLUMN client_id TO patient_id;
                
                -- Add foreign key constraint after renaming
                RAISE NOTICE 'Adding foreign key constraint from documents.patient_id to patients.id';
                ALTER TABLE documents
                ADD CONSTRAINT fk_documents_patient
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
            ELSE
                RAISE NOTICE 'Neither patient_id nor client_id column exists in documents table';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'documents table does not exist, skipping foreign key addition';
    END IF;
END $$;

-- Step 2: Check if session_notes table exists and add/fix foreign key constraint to patients
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'session_notes'
    ) THEN
        -- Check if patient_id column exists in session_notes table
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'session_notes' AND column_name = 'patient_id'
        ) THEN
            -- Check if the foreign key constraint already exists
            IF NOT EXISTS (
                SELECT FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'session_notes' 
                AND ccu.table_name = 'patients'
                AND ccu.column_name = 'id'
            ) THEN
                -- Add foreign key constraint
                RAISE NOTICE 'Adding foreign key constraint from session_notes.patient_id to patients.id';
                ALTER TABLE session_notes
                ADD CONSTRAINT fk_session_notes_patient
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
            ELSE
                RAISE NOTICE 'Foreign key constraint from session_notes.patient_id to patients.id already exists';
            END IF;
        ELSE
            -- Check if client_id column exists (old name)
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'session_notes' AND column_name = 'client_id'
            ) THEN
                RAISE NOTICE 'Renaming client_id to patient_id in session_notes table';
                ALTER TABLE session_notes RENAME COLUMN client_id TO patient_id;
                
                -- Add foreign key constraint after renaming
                RAISE NOTICE 'Adding foreign key constraint from session_notes.patient_id to patients.id';
                ALTER TABLE session_notes
                ADD CONSTRAINT fk_session_notes_patient
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
            ELSE
                RAISE NOTICE 'Neither patient_id nor client_id column exists in session_notes table';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'session_notes table does not exist, skipping foreign key addition';
    END IF;
END $$;

-- Step 3: Verify the foreign key constraints were added successfully
DO $$
DECLARE
    documents_fk_exists BOOLEAN;
    session_notes_fk_exists BOOLEAN;
BEGIN
    -- Check if documents foreign key exists
    SELECT EXISTS (
        SELECT FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'documents' 
        AND ccu.table_name = 'patients'
        AND ccu.column_name = 'id'
    ) INTO documents_fk_exists;
    
    -- Check if session_notes foreign key exists
    SELECT EXISTS (
        SELECT FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'session_notes' 
        AND ccu.table_name = 'patients'
        AND ccu.column_name = 'id'
    ) INTO session_notes_fk_exists;
    
    -- Report results
    IF documents_fk_exists THEN
        RAISE NOTICE 'Foreign key constraint from documents.patient_id to patients.id is now in place';
    ELSE
        RAISE NOTICE 'WARNING: Foreign key constraint from documents.patient_id to patients.id was not created successfully';
    END IF;
    
    IF session_notes_fk_exists THEN
        RAISE NOTICE 'Foreign key constraint from session_notes.patient_id to patients.id is now in place';
    ELSE
        RAISE NOTICE 'WARNING: Foreign key constraint from session_notes.patient_id to patients.id was not created successfully';
    END IF;
END $$;

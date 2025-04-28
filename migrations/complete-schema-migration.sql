-- Complete schema migration script for clinician chatbot feature
-- This script handles all schema changes outlined in the implementation plan

-- Step 1: Rename tables if they haven't been renamed yet

-- Check if clients table exists and patients doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clients'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'patients'
    ) THEN
        RAISE NOTICE 'Renaming clients table to patients';
        ALTER TABLE clients RENAME TO patients;
    ELSIF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'patients'
    ) THEN
        RAISE NOTICE 'Creating patients table as it does not exist';
        -- Create patients table if it doesn't exist at all
        CREATE TABLE patients (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            original_name TEXT,
            unique_identifier TEXT,
            date_of_birth DATE NOT NULL,
            gender TEXT,
            preferred_language TEXT,
            contact_email TEXT,
            contact_phone TEXT,
            address TEXT,
            medical_history TEXT,
            communication_needs TEXT,
            therapy_preferences TEXT,
            funds_management TEXT,
            ndis_funds NUMERIC NOT NULL DEFAULT 0,
            onboarding_status TEXT DEFAULT 'incomplete'
        );
    ELSE
        RAISE NOTICE 'patients table already exists, skipping rename/create';
    END IF;
END $$;

-- Check if allies table exists and caregivers doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'allies'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'caregivers'
    ) THEN
        RAISE NOTICE 'Renaming allies table to caregivers';
        ALTER TABLE allies RENAME TO caregivers;
    ELSIF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'caregivers'
    ) THEN
        RAISE NOTICE 'Creating caregivers table as it does not exist';
        -- Create caregivers table if it doesn't exist at all
        CREATE TABLE caregivers (
            id SERIAL PRIMARY KEY,
            patient_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            relationship TEXT NOT NULL,
            preferred_language TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            notes TEXT,
            access_therapeutics BOOLEAN NOT NULL DEFAULT false,
            access_financials BOOLEAN NOT NULL DEFAULT false,
            archived BOOLEAN NOT NULL DEFAULT false
        );
    ELSE
        RAISE NOTICE 'caregivers table already exists, skipping rename/create';
    END IF;
END $$;

-- Check if client_clinicians table exists and patient_clinicians doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'client_clinicians'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'patient_clinicians'
    ) THEN
        RAISE NOTICE 'Renaming client_clinicians table to patient_clinicians';
        ALTER TABLE client_clinicians RENAME TO patient_clinicians;
    ELSIF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'patient_clinicians'
    ) THEN
        RAISE NOTICE 'Creating patient_clinicians table as it does not exist';
        -- Create patient_clinicians table if it doesn't exist at all
        CREATE TABLE patient_clinicians (
            id SERIAL PRIMARY KEY,
            patient_id INTEGER NOT NULL,
            clinician_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT
        );
    ELSE
        RAISE NOTICE 'patient_clinicians table already exists, skipping rename/create';
    END IF;
END $$;

-- Step 2: Rename columns in existing tables if they exist with old names
DO $$
DECLARE
    tables_with_client_id TEXT[] := ARRAY['goals', 'subgoals', 'sessions', 'session_notes', 'caregivers', 'documents', 'budget_items', 'budget_settings'];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables_with_client_id
    LOOP
        -- Check if table exists
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            -- Check if client_id column exists in this table
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = t AND column_name = 'client_id'
            ) THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN client_id TO patient_id', t);
                RAISE NOTICE 'Renamed client_id to patient_id in % table', t;
            ELSE
                RAISE NOTICE 'client_id column does not exist in % table or already renamed', t;
            END IF;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping column rename', t;
        END IF;
    END LOOP;
END $$;

-- Step 3: Implement additional schema changes from the implementation plan

-- Add status field to goals table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'goals'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'status'
    ) THEN
        RAISE NOTICE 'Adding status field to goals table';
        ALTER TABLE goals ADD COLUMN status TEXT DEFAULT 'in_progress';
    ELSE
        RAISE NOTICE 'Goals table does not exist or status field already exists';
    END IF;
END $$;

-- Rename priority to importance_level in goals table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'goals'
    ) AND EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'priority'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'importance_level'
    ) THEN
        RAISE NOTICE 'Renaming priority to importance_level in goals table';
        ALTER TABLE goals RENAME COLUMN priority TO importance_level;
    ELSE
        RAISE NOTICE 'Goals table does not exist, priority field does not exist, or importance_level field already exists';
    END IF;
END $$;

-- Add completion_date field to subgoals table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'subgoals'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subgoals' AND column_name = 'completion_date'
    ) THEN
        RAISE NOTICE 'Adding completion_date field to subgoals table';
        ALTER TABLE subgoals ADD COLUMN completion_date TIMESTAMP;
    ELSE
        RAISE NOTICE 'Subgoals table does not exist or completion_date field already exists';
    END IF;
END $$;

-- Add ai_summary field to sessions table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sessions'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'ai_summary'
    ) THEN
        RAISE NOTICE 'Adding ai_summary field to sessions table';
        ALTER TABLE sessions ADD COLUMN ai_summary TEXT;
    ELSE
        RAISE NOTICE 'Sessions table does not exist or ai_summary field already exists';
    END IF;
END $$;

-- Rename present_allies to present_caregivers in session_notes table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'session_notes'
    ) AND EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session_notes' AND column_name = 'present_allies'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session_notes' AND column_name = 'present_caregivers'
    ) THEN
        RAISE NOTICE 'Renaming present_allies to present_caregivers in session_notes table';
        ALTER TABLE session_notes RENAME COLUMN present_allies TO present_caregivers;
    ELSE
        RAISE NOTICE 'Session_notes table does not exist, present_allies field does not exist, or present_caregivers field already exists';
    END IF;
END $$;

-- Rename performance_assessments to goal_assessments if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'performance_assessments'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'goal_assessments'
    ) THEN
        RAISE NOTICE 'Renaming performance_assessments to goal_assessments';
        ALTER TABLE performance_assessments RENAME TO goal_assessments;
    ELSE
        RAISE NOTICE 'Performance_assessments table does not exist or goal_assessments table already exists';
    END IF;
END $$;

-- Rename rating to achievement_level in goal_assessments table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'goal_assessments'
    ) AND EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goal_assessments' AND column_name = 'rating'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goal_assessments' AND column_name = 'achievement_level'
    ) THEN
        RAISE NOTICE 'Renaming rating to achievement_level in goal_assessments table';
        ALTER TABLE goal_assessments RENAME COLUMN rating TO achievement_level;
    ELSE
        RAISE NOTICE 'Goal_assessments table does not exist, rating field does not exist, or achievement_level field already exists';
    END IF;
END $$;

-- Add effectiveness field to strategies table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'strategies'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'strategies' AND column_name = 'effectiveness'
    ) THEN
        RAISE NOTICE 'Adding effectiveness field to strategies table';
        ALTER TABLE strategies ADD COLUMN effectiveness TEXT;
    ELSE
        RAISE NOTICE 'Strategies table does not exist or effectiveness field already exists';
    END IF;
END $$;

-- Add completion_date field to milestone_assessments table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'milestone_assessments'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'milestone_assessments' AND column_name = 'completion_date'
    ) THEN
        RAISE NOTICE 'Adding completion_date field to milestone_assessments table';
        ALTER TABLE milestone_assessments ADD COLUMN completion_date TIMESTAMP;
    ELSE
        RAISE NOTICE 'Milestone_assessments table does not exist or completion_date field already exists';
    END IF;
END $$;

-- Step 4: Migrate data from old tables to new tables if needed

-- Migrate data from clients to patients if patients table is empty
DO $$
DECLARE
    clients_exists BOOLEAN;
    patients_exists BOOLEAN;
    patients_empty BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clients'
    ) INTO clients_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'patients'
    ) INTO patients_exists;
    
    -- Check if patients table is empty
    IF patients_exists THEN
        SELECT NOT EXISTS (SELECT 1 FROM patients LIMIT 1) INTO patients_empty;
    ELSE
        patients_empty := TRUE;
    END IF;
    
    -- If clients exists and patients is empty, migrate data
    IF clients_exists AND patients_exists AND patients_empty THEN
        RAISE NOTICE 'Migrating data from clients to patients table';
        
        -- Insert data from clients to patients
        INSERT INTO patients (
            id, 
            name, 
            original_name, 
            unique_identifier, 
            date_of_birth, 
            gender, 
            preferred_language, 
            contact_email, 
            contact_phone, 
            address, 
            medical_history, 
            communication_needs, 
            therapy_preferences, 
            funds_management, 
            ndis_funds, 
            onboarding_status
        )
        SELECT 
            id, 
            name, 
            original_name, 
            unique_identifier, 
            date_of_birth, 
            gender, 
            preferred_language, 
            contact_email, 
            contact_phone, 
            address, 
            medical_history, 
            communication_needs, 
            therapy_preferences, 
            funds_management, 
            ndis_funds, 
            onboarding_status
        FROM clients;
        
        RAISE NOTICE 'Data migration from clients to patients completed successfully';
    ELSIF clients_exists AND NOT patients_exists THEN
        RAISE NOTICE 'Cannot migrate data: patients table does not exist';
    ELSIF NOT clients_exists AND patients_exists AND patients_empty THEN
        RAISE NOTICE 'Cannot migrate data: clients table does not exist, but patients table is empty';
    ELSIF patients_exists AND NOT patients_empty THEN
        RAISE NOTICE 'Skipping data migration: patients table already contains data';
    ELSE
        RAISE NOTICE 'Skipping data migration: required tables do not exist';
    END IF;
END $$;

-- Migrate data from allies to caregivers if caregivers table is empty
DO $$
DECLARE
    allies_exists BOOLEAN;
    caregivers_exists BOOLEAN;
    caregivers_empty BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'allies'
    ) INTO allies_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'caregivers'
    ) INTO caregivers_exists;
    
    -- Check if caregivers table is empty
    IF caregivers_exists THEN
        SELECT NOT EXISTS (SELECT 1 FROM caregivers LIMIT 1) INTO caregivers_empty;
    ELSE
        caregivers_empty := TRUE;
    END IF;
    
    -- If allies exists and caregivers is empty, migrate data
    IF allies_exists AND caregivers_exists AND caregivers_empty THEN
        RAISE NOTICE 'Migrating data from allies to caregivers table';
        
        -- Insert data from allies to caregivers, converting client_id to patient_id
        INSERT INTO caregivers (
            id, 
            patient_id, 
            name, 
            relationship, 
            preferred_language, 
            email, 
            phone, 
            notes, 
            access_therapeutics, 
            access_financials, 
            archived
        )
        SELECT 
            id, 
            client_id AS patient_id, 
            name, 
            relationship, 
            preferred_language, 
            email, 
            phone, 
            notes, 
            access_therapeutics, 
            access_financials, 
            archived
        FROM allies;
        
        RAISE NOTICE 'Data migration from allies to caregivers completed successfully';
    ELSIF allies_exists AND NOT caregivers_exists THEN
        RAISE NOTICE 'Cannot migrate data: caregivers table does not exist';
    ELSIF NOT allies_exists AND caregivers_exists AND caregivers_empty THEN
        RAISE NOTICE 'Cannot migrate data: allies table does not exist, but caregivers table is empty';
    ELSIF caregivers_exists AND NOT caregivers_empty THEN
        RAISE NOTICE 'Skipping data migration: caregivers table already contains data';
    ELSE
        RAISE NOTICE 'Skipping data migration: required tables do not exist';
    END IF;
END $$;

-- Migrate data from client_clinicians to patient_clinicians if patient_clinicians table is empty
DO $$
DECLARE
    client_clinicians_exists BOOLEAN;
    patient_clinicians_exists BOOLEAN;
    patient_clinicians_empty BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'client_clinicians'
    ) INTO client_clinicians_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'patient_clinicians'
    ) INTO patient_clinicians_exists;
    
    -- Check if patient_clinicians table is empty
    IF patient_clinicians_exists THEN
        SELECT NOT EXISTS (SELECT 1 FROM patient_clinicians LIMIT 1) INTO patient_clinicians_empty;
    ELSE
        patient_clinicians_empty := TRUE;
    END IF;
    
    -- If client_clinicians exists and patient_clinicians is empty, migrate data
    IF client_clinicians_exists AND patient_clinicians_exists AND patient_clinicians_empty THEN
        RAISE NOTICE 'Migrating data from client_clinicians to patient_clinicians table';
        
        -- Insert data from client_clinicians to patient_clinicians, converting client_id to patient_id
        INSERT INTO patient_clinicians (
            id, 
            patient_id, 
            clinician_id, 
            role, 
            assigned_date, 
            notes
        )
        SELECT 
            id, 
            client_id AS patient_id, 
            clinician_id, 
            role, 
            assigned_date, 
            notes
        FROM client_clinicians;
        
        RAISE NOTICE 'Data migration from client_clinicians to patient_clinicians completed successfully';
    ELSIF client_clinicians_exists AND NOT patient_clinicians_exists THEN
        RAISE NOTICE 'Cannot migrate data: patient_clinicians table does not exist';
    ELSIF NOT client_clinicians_exists AND patient_clinicians_exists AND patient_clinicians_empty THEN
        RAISE NOTICE 'Cannot migrate data: client_clinicians table does not exist, but patient_clinicians table is empty';
    ELSIF patient_clinicians_exists AND NOT patient_clinicians_empty THEN
        RAISE NOTICE 'Skipping data migration: patient_clinicians table already contains data';
    ELSE
        RAISE NOTICE 'Skipping data migration: required tables do not exist';
    END IF;
END $$;

-- Step 5: Create new chatbot-related tables if they don't exist
-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    clinician_id INTEGER NOT NULL REFERENCES clinicians(id),
    title TEXT NOT NULL DEFAULT 'New Chat',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    metadata JSONB
);

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    chat_session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create query_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS query_logs (
    id SERIAL PRIMARY KEY,
    chat_message_id INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    execution_time INTEGER, -- in milliseconds
    result_count INTEGER,
    error TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_memories table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_memories (
    id SERIAL PRIMARY KEY,
    chat_session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding TEXT, -- Store vector embedding for similarity search
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_summaries table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_summaries (
    id SERIAL PRIMARY KEY,
    chat_session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_range TEXT NOT NULL, -- e.g., "1-50"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_agent_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_agent_config (
    id SERIAL PRIMARY KEY,
    model_name TEXT NOT NULL DEFAULT 'gpt-4o',
    temperature NUMERIC NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 2000,
    system_prompt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insert default AI agent configuration if table is empty
INSERT INTO ai_agent_config (model_name, temperature, max_tokens, system_prompt)
SELECT 'gpt-4o', 0.7, 2000, 'You are a helpful assistant for clinicians, providing information about patients and their treatment.'
WHERE NOT EXISTS (SELECT 1 FROM ai_agent_config);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_memories_session_id ON chat_memories(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_summaries_session_id ON chat_summaries(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_message_id ON query_logs(chat_message_id);

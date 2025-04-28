-- Migration script for clinician chatbot feature
-- This script handles renaming tables and creating new chatbot-related tables

-- Step 0: Check if clinicians table exists and create it if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clinicians'
    ) THEN
        RAISE NOTICE 'Creating clinicians table as it does not exist';
        -- Create clinicians table if it doesn't exist at all
        CREATE TABLE clinicians (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            specialization TEXT,
            active BOOLEAN DEFAULT TRUE,
            notes TEXT
        );
    ELSE
        RAISE NOTICE 'clinicians table already exists';
        -- Ensure clinicians table has a primary key
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE table_schema = 'public' AND table_name = 'clinicians' AND constraint_type = 'PRIMARY KEY'
        ) THEN
            RAISE NOTICE 'Adding primary key to clinicians table';
            ALTER TABLE clinicians ADD COLUMN IF NOT EXISTS id SERIAL;
            ALTER TABLE clinicians ADD PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

-- Step 1: Check if tables exist with old names and rename them
-- First, check if tables exist with their old names before attempting to rename

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
-- For each table, check if client_id column exists before attempting to rename
DO $$
DECLARE
    tables_with_client_id TEXT[] := ARRAY['goals', 'subgoals', 'sessions', 'session_notes', 'caregivers', 'documents', 'budget_items'];
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

-- Step 3: Create new chatbot-related tables if they don't exist
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

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_memories_session_id ON chat_memories(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_summaries_session_id ON chat_summaries(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_message_id ON query_logs(chat_message_id);

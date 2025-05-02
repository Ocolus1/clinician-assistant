-- Migration script to add date fields to goalAssessments and sessionNotes tables
-- and add goalId reference to strategies table

-- Add date fields to goalAssessments table
ALTER TABLE goal_assessments ADD COLUMN IF NOT EXISTS date TIMESTAMP;
ALTER TABLE goal_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE goal_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add date field to sessionNotes table
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS date TIMESTAMP;

-- Add goalId reference field to strategies table
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS goal_id INTEGER REFERENCES goals(id);

-- Update existing records to populate date fields based on createdAt values
UPDATE goal_assessments SET date = created_at WHERE date IS NULL;
UPDATE session_notes SET date = created_at WHERE date IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_goal_assessments_date ON goal_assessments(date);
CREATE INDEX IF NOT EXISTS idx_session_notes_date ON session_notes(date);
CREATE INDEX IF NOT EXISTS idx_strategies_goal_id ON strategies(goal_id);

-- Add date field to goal_assessments table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'goal_assessments'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goal_assessments' AND column_name = 'date'
    ) THEN
        RAISE NOTICE 'Adding date field to goal_assessments table';
        ALTER TABLE goal_assessments ADD COLUMN date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ELSE
        RAISE NOTICE 'goal_assessments table does not exist or date field already exists';
    END IF;
END $$;

-- Add date field to session_notes table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'session_notes'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session_notes' AND column_name = 'date'
    ) THEN
        RAISE NOTICE 'Adding date field to session_notes table';
        ALTER TABLE session_notes ADD COLUMN date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ELSE
        RAISE NOTICE 'session_notes table does not exist or date field already exists';
    END IF;
END $$;

-- Add goalId field to strategies table if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'strategies'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'strategies' AND column_name = 'goal_id'
    ) THEN
        RAISE NOTICE 'Adding goal_id field to strategies table';
        ALTER TABLE strategies ADD COLUMN goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE;
    ELSE
        RAISE NOTICE 'strategies table does not exist or goal_id field already exists';
    END IF;
END $$;

-- Update existing records to set date field to created_at value for goal_assessments
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goal_assessments' AND column_name = 'date'
    ) AND EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'goal_assessments' AND column_name = 'created_at'
    ) THEN
        RAISE NOTICE 'Updating date field in goal_assessments to match created_at for existing records';
        UPDATE goal_assessments SET date = created_at WHERE date IS NULL;
    END IF;
END $$;

-- Update existing records to set date field to created_at value for session_notes
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session_notes' AND column_name = 'date'
    ) AND EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session_notes' AND column_name = 'created_at'
    ) THEN
        RAISE NOTICE 'Updating date field in session_notes to match created_at for existing records';
        UPDATE session_notes SET date = created_at WHERE date IS NULL;
    END IF;
END $$;

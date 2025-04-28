-- Data migration script for clinician chatbot feature
-- This script handles migrating data from old tables to new tables

-- Step 1: Check if we need to migrate data from allies to caregivers
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

-- Step 2: Check if we need to migrate data from clients to patients
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

-- Step 3: Check if we need to migrate data from client_clinicians to patient_clinicians
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

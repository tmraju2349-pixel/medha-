-- MEDHA Supabase Schema & Realtime Setup
-- Execute this script in your Supabase SQL Editor

-- 1. Create Users Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-running
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS safe_zones CASCADE;
DROP TABLE IF EXISTS breadcrumbs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS caregiver_patient_links CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Profiles Table (Base for both Patients and Caregivers)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver')),
  display_name TEXT,
  phone TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Patient Specific Data
CREATE TABLE patient_profiles (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- Used for pairing
  age INTEGER,
  city TEXT,
  medical_notes TEXT,
  emergency_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Caregiver-Patient Links (Many-to-Many)
CREATE TABLE caregiver_patient_links (
  caregiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  relationship TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (caregiver_id, patient_id)
);

-- 6. Safe Zones
CREATE TABLE safe_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT,
  category TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Game Sessions (Cognitive tracking)
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL,
  score INTEGER NOT NULL,
  mistakes INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications / Alerts
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'info', 'warn', 'sos', 'good'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'old')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tasks (Medication, routine, etc)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time TEXT NOT NULL,
  icon TEXT,
  done BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'routine', -- 'meds', 'routine'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Live Location Breadcrumbs (Background tracking)
CREATE TABLE breadcrumbs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level DOUBLE PRECISION,
  is_charging BOOLEAN,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_patient_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE breadcrumbs ENABLE ROW LEVEL SECURITY;

-- Create basic permissive policies for prototyping (Replace with stricter RLS in production)
-- For now, authenticated users can read/write data linked to their profiles.

-- Enable Realtime Sync for relevant tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE safe_zones, tasks, breadcrumbs, notifications;

-- Function to handle new user signups automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (new.id, COALESCE((new.raw_user_meta_data->>'role'), 'patient'), COALESCE((new.raw_user_meta_data->>'full_name'), 'User'));
  
  -- If patient, also create a patient profile
  IF (new.raw_user_meta_data->>'role') = 'patient' THEN
    INSERT INTO public.patient_profiles (id, code, emergency_phone)
    VALUES (new.id, UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)), '+919876543210');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the above function when an auth.user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


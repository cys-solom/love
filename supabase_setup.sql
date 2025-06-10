-- Create tables for visitors data
-- Run this SQL in your Supabase SQL Editor

-- Create normal_visitors table (simplified without PostGIS for now)
CREATE TABLE IF NOT EXISTS normal_visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photos JSONB NOT NULL,
  location TEXT, -- Store as POINT string instead of GEOMETRY
  accuracy FLOAT,
  visit_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stealth_visitors table (simplified without PostGIS for now)
CREATE TABLE IF NOT EXISTS stealth_visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photos JSONB NOT NULL,
  location TEXT, -- Store as POINT string instead of GEOMETRY
  accuracy FLOAT,
  visit_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_normal_visitors_visit_time ON normal_visitors(visit_time DESC);
CREATE INDEX IF NOT EXISTS idx_stealth_visitors_visit_time ON stealth_visitors(visit_time DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS set_timestamp_normal_visitors ON normal_visitors;
CREATE TRIGGER set_timestamp_normal_visitors
  BEFORE UPDATE ON normal_visitors
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_stealth_visitors ON stealth_visitors;
CREATE TRIGGER set_timestamp_stealth_visitors
  BEFORE UPDATE ON stealth_visitors
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- Disable RLS for easier setup (you can enable it later)
ALTER TABLE normal_visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE stealth_visitors DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on normal_visitors" ON normal_visitors;
DROP POLICY IF EXISTS "Allow all operations on stealth_visitors" ON stealth_visitors;

-- Grant permissions to anon and authenticated users
GRANT ALL ON normal_visitors TO anon, authenticated;
GRANT ALL ON stealth_visitors TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
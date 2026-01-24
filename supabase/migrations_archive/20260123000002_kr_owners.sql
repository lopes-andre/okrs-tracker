-- Migration: Add KR Owners
-- Description: Allow assigning an owner to each Key Result for accountability

-- Add owner_id column to annual_krs
ALTER TABLE annual_krs
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for owner queries
CREATE INDEX idx_annual_krs_owner_id ON annual_krs(owner_id);

-- Add comment
COMMENT ON COLUMN annual_krs.owner_id IS 'User responsible for this Key Result';

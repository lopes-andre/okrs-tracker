-- Migration: Fix plan_members RLS for trigger INSERT
-- Description: Allow service_role and plan creators to add themselves as first member

-- Allow service_role to insert plan members (used by triggers)
CREATE POLICY "Service role can insert plan members"
  ON plan_members FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to add themselves as owner of a plan they created
-- This handles the case when the trigger doesn't work properly
CREATE POLICY "Plan creators can add themselves as owner"
  ON plan_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM plans 
      WHERE plans.id = plan_id 
      AND plans.created_by = auth.uid()
    )
  );

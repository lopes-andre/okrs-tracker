-- ============================================================================
-- Migration: Plan Creator Trigger
-- Description: Automatically add plan creator as owner when a plan is created
-- ============================================================================

-- Update plans SELECT policy to allow creators to view their plans
-- (needed for plan_members INSERT policy to work)
DROP POLICY IF EXISTS "Plans are viewable by members" ON plans;
DROP POLICY IF EXISTS "Plans are viewable by members or creator" ON plans;

CREATE POLICY "Plans are viewable by members or creator"
  ON plans FOR SELECT
  TO authenticated
  USING (
    has_plan_access(id, 'viewer')
    OR created_by = auth.uid()
  );

-- Create function to add plan creator as owner
CREATE OR REPLACE FUNCTION add_plan_creator_as_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.plan_members (plan_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_plan_created_add_owner ON plans;

CREATE TRIGGER on_plan_created_add_owner
  AFTER INSERT ON plans
  FOR EACH ROW
  EXECUTE FUNCTION add_plan_creator_as_owner();

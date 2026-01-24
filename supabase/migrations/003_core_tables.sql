-- ============================================================================
-- Migration 003: Core Tables
-- ============================================================================
-- Creates the foundational tables: profiles, plans, plan_members, plan_invites.
-- These tables are the basis for all other features.
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Synced from auth.users via trigger, stores additional user data

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE profiles IS 'User profiles synced from auth.users';

-- ============================================================================
-- PLANS TABLE
-- ============================================================================
-- Annual OKR plans

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INT NOT NULL CHECK (year >= 2020 AND year <= 2100),
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_year ON plans(year);
CREATE INDEX idx_plans_created_by ON plans(created_by);

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE plans IS 'Annual OKR plans';

-- ============================================================================
-- PLAN_MEMBERS TABLE
-- ============================================================================
-- Junction table for plan membership with roles

CREATE TABLE plan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role okr_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, user_id)
);

CREATE INDEX idx_plan_members_plan_id ON plan_members(plan_id);
CREATE INDEX idx_plan_members_user_id ON plan_members(user_id);
CREATE INDEX idx_plan_members_role ON plan_members(role);

CREATE TRIGGER plan_members_updated_at
  BEFORE UPDATE ON plan_members
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE plan_members IS 'Plan membership with role-based access';

-- ============================================================================
-- PLAN_INVITES TABLE
-- ============================================================================
-- Pending invitations to plans

CREATE TABLE plan_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role okr_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_invites_plan_id ON plan_invites(plan_id);
CREATE INDEX idx_plan_invites_email ON plan_invites(email);
CREATE UNIQUE INDEX idx_plan_invites_unique_pending
  ON plan_invites(plan_id, email)
  WHERE accepted_at IS NULL;
CREATE INDEX idx_plan_invites_expires_at
  ON plan_invites(expires_at)
  WHERE accepted_at IS NULL;

COMMENT ON TABLE plan_invites IS 'Pending plan invitations';

-- ============================================================================
-- RLS HELPER FUNCTION: Check plan access
-- ============================================================================

CREATE OR REPLACE FUNCTION has_plan_access(
  p_plan_id UUID,
  p_min_role okr_role DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role okr_role;
BEGIN
  SELECT role INTO user_role
  FROM public.plan_members
  WHERE plan_id = p_plan_id
    AND user_id = auth.uid();

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.okr_role_rank(user_role) >= public.okr_role_rank(p_min_role);
END;
$$;

COMMENT ON FUNCTION has_plan_access IS 'Check if current user has access to a plan with at least the specified role';

-- ============================================================================
-- TRIGGER FUNCTION: Auto-create profile on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- TRIGGER FUNCTION: Auto-add owner as plan member on plan creation
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO plan_members (plan_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_plan_created
  AFTER INSERT ON plans
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_plan();

-- ============================================================================
-- TRIGGER FUNCTION: Auto-accept pending invites on profile creation
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_pending_invites()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add user to plans they were invited to
  INSERT INTO plan_members (plan_id, user_id, role)
  SELECT pi.plan_id, NEW.id, pi.role
  FROM plan_invites pi
  WHERE pi.email = NEW.email
    AND pi.accepted_at IS NULL
    AND pi.expires_at > NOW()
  ON CONFLICT (plan_id, user_id) DO NOTHING;

  -- Mark invites as accepted
  UPDATE plan_invites
  SET accepted_at = NOW()
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_accept_invites
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION accept_pending_invites();

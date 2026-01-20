-- Migration: Activity Events
-- Description: Create activity_events table and triggers for timeline tracking

-- ============================================================================
-- ACTIVITY_EVENTS TABLE
-- ============================================================================
-- Central timeline of all changes (tasks, check-ins, membership, etc.)

CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type event_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  event_type event_type NOT NULL,
  old_data JSONB, -- Previous state (for updates)
  new_data JSONB, -- New state
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_activity_events_plan_id ON activity_events(plan_id);
CREATE INDEX idx_activity_events_user_id ON activity_events(user_id);
CREATE INDEX idx_activity_events_entity ON activity_events(entity_type, entity_id);
CREATE INDEX idx_activity_events_event_type ON activity_events(event_type);
CREATE INDEX idx_activity_events_created_at ON activity_events(created_at DESC);

-- Composite index for timeline queries
CREATE INDEX idx_activity_events_timeline 
  ON activity_events(plan_id, created_at DESC);

COMMENT ON TABLE activity_events IS 'Central timeline of all changes for audit and activity feed';

-- ============================================================================
-- HELPER FUNCTION: Log an activity event
-- ============================================================================

CREATE OR REPLACE FUNCTION log_activity_event(
  p_plan_id UUID,
  p_entity_type event_entity_type,
  p_entity_id UUID,
  p_event_type event_type,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO activity_events (
    plan_id, user_id, entity_type, entity_id, 
    event_type, old_data, new_data, metadata
  )
  VALUES (
    p_plan_id, auth.uid(), p_entity_type, p_entity_id,
    p_event_type, p_old_data, p_new_data, p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Tasks activity events
-- ============================================================================

CREATE OR REPLACE FUNCTION tasks_activity_events()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_event_type event_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_data := jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'priority', NEW.priority,
      'effort', NEW.effort,
      'due_date', NEW.due_date,
      'due_time', NEW.due_time,
      'objective_id', NEW.objective_id,
      'annual_kr_id', NEW.annual_kr_id,
      'quarter_target_id', NEW.quarter_target_id
    );

    PERFORM log_activity_event(
      NEW.plan_id, 'task'::event_entity_type, NEW.id,
      'created'::event_type, NULL, v_new_data
    );

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := jsonb_build_object(
      'title', OLD.title,
      'status', OLD.status,
      'priority', OLD.priority,
      'effort', OLD.effort,
      'due_date', OLD.due_date,
      'due_time', OLD.due_time,
      'objective_id', OLD.objective_id,
      'annual_kr_id', OLD.annual_kr_id,
      'quarter_target_id', OLD.quarter_target_id
    );
    v_new_data := jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'priority', NEW.priority,
      'effort', NEW.effort,
      'due_date', NEW.due_date,
      'due_time', NEW.due_time,
      'objective_id', NEW.objective_id,
      'annual_kr_id', NEW.annual_kr_id,
      'quarter_target_id', NEW.quarter_target_id
    );

    -- Determine specific event type
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'completed' THEN
        v_event_type := 'completed'::event_type;
      ELSE
        v_event_type := 'status_changed'::event_type;
      END IF;
    ELSE
      v_event_type := 'updated'::event_type;
    END IF;

    PERFORM log_activity_event(
      NEW.plan_id, 'task'::event_entity_type, NEW.id,
      v_event_type, v_old_data, v_new_data
    );

  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := jsonb_build_object(
      'title', OLD.title,
      'status', OLD.status,
      'priority', OLD.priority,
      'effort', OLD.effort,
      'objective_id', OLD.objective_id,
      'annual_kr_id', OLD.annual_kr_id,
      'quarter_target_id', OLD.quarter_target_id
    );

    PERFORM log_activity_event(
      OLD.plan_id, 'task'::event_entity_type, OLD.id,
      'deleted'::event_type, v_old_data, NULL
    );

  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tasks_activity_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION tasks_activity_events();

-- ============================================================================
-- TRIGGER: Check-ins activity events
-- ============================================================================

CREATE OR REPLACE FUNCTION checkins_activity_events()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_kr_name TEXT;
  v_new_data JSONB;
BEGIN
  -- Get plan_id and KR name
  SELECT o.plan_id, ak.name INTO v_plan_id, v_kr_name
  FROM annual_krs ak
  JOIN objectives o ON o.id = ak.objective_id
  WHERE ak.id = NEW.annual_kr_id;
  
  v_new_data := jsonb_build_object(
    'value', NEW.value,
    'previous_value', NEW.previous_value,
    'kr_name', v_kr_name,
    'note', NEW.note
  );
  
  PERFORM log_activity_event(
    v_plan_id, 'check_in'::event_entity_type, NEW.id,
    'created'::event_type, NULL, v_new_data
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER checkins_activity_events_trigger
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION checkins_activity_events();

-- ============================================================================
-- TRIGGER: Plan members activity events
-- ============================================================================

CREATE OR REPLACE FUNCTION plan_members_activity_events()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_new_data JSONB;
  v_old_data JSONB;
  v_event_type event_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get user name
    SELECT full_name INTO v_user_name FROM profiles WHERE id = NEW.user_id;
    
    v_new_data := jsonb_build_object(
      'role', NEW.role,
      'user_name', v_user_name
    );
    
    PERFORM log_activity_event(
      NEW.plan_id, 'member'::event_entity_type, NEW.user_id,
      'joined'::event_type, NULL, v_new_data
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      SELECT full_name INTO v_user_name FROM profiles WHERE id = NEW.user_id;
      
      v_old_data := jsonb_build_object('role', OLD.role);
      v_new_data := jsonb_build_object(
        'role', NEW.role,
        'user_name', v_user_name
      );
      
      PERFORM log_activity_event(
        NEW.plan_id, 'member'::event_entity_type, NEW.user_id,
        'role_changed'::event_type, v_old_data, v_new_data
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    SELECT full_name INTO v_user_name FROM profiles WHERE id = OLD.user_id;
    
    v_old_data := jsonb_build_object(
      'role', OLD.role,
      'user_name', v_user_name
    );
    
    PERFORM log_activity_event(
      OLD.plan_id, 'member'::event_entity_type, OLD.user_id,
      'left'::event_type, v_old_data, NULL
    );
    
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER plan_members_activity_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON plan_members
  FOR EACH ROW
  EXECUTE FUNCTION plan_members_activity_events();

-- ============================================================================
-- TRIGGER: Objectives activity events
-- ============================================================================

CREATE OR REPLACE FUNCTION objectives_activity_events()
RETURNS TRIGGER AS $$
DECLARE
  v_new_data JSONB;
  v_old_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_data := jsonb_build_object(
      'code', NEW.code,
      'name', NEW.name
    );
    
    PERFORM log_activity_event(
      NEW.plan_id, 'objective'::event_entity_type, NEW.id,
      'created'::event_type, NULL, v_new_data
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if significant fields changed
    IF OLD.name != NEW.name OR OLD.code != NEW.code OR OLD.description IS DISTINCT FROM NEW.description THEN
      v_old_data := jsonb_build_object('code', OLD.code, 'name', OLD.name);
      v_new_data := jsonb_build_object('code', NEW.code, 'name', NEW.name);
      
      PERFORM log_activity_event(
        NEW.plan_id, 'objective'::event_entity_type, NEW.id,
        'updated'::event_type, v_old_data, v_new_data
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := jsonb_build_object('code', OLD.code, 'name', OLD.name);
    
    PERFORM log_activity_event(
      OLD.plan_id, 'objective'::event_entity_type, OLD.id,
      'deleted'::event_type, v_old_data, NULL
    );
    
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER objectives_activity_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON objectives
  FOR EACH ROW
  EXECUTE FUNCTION objectives_activity_events();

-- ============================================================================
-- TRIGGER: Annual KRs activity events
-- ============================================================================

CREATE OR REPLACE FUNCTION annual_krs_activity_events()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_new_data JSONB;
  v_old_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT plan_id INTO v_plan_id FROM objectives WHERE id = NEW.objective_id;
    
    v_new_data := jsonb_build_object(
      'name', NEW.name,
      'target_value', NEW.target_value,
      'unit', NEW.unit
    );
    
    PERFORM log_activity_event(
      v_plan_id, 'annual_kr'::event_entity_type, NEW.id,
      'created'::event_type, NULL, v_new_data
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT plan_id INTO v_plan_id FROM objectives WHERE id = NEW.objective_id;
    
    -- Only log if significant fields changed (not just current_value from check-ins)
    IF OLD.name != NEW.name OR OLD.target_value != NEW.target_value OR OLD.description IS DISTINCT FROM NEW.description THEN
      v_old_data := jsonb_build_object(
        'name', OLD.name,
        'target_value', OLD.target_value
      );
      v_new_data := jsonb_build_object(
        'name', NEW.name,
        'target_value', NEW.target_value
      );
      
      PERFORM log_activity_event(
        v_plan_id, 'annual_kr'::event_entity_type, NEW.id,
        'updated'::event_type, v_old_data, v_new_data
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    SELECT plan_id INTO v_plan_id FROM objectives WHERE id = OLD.objective_id;
    
    v_old_data := jsonb_build_object('name', OLD.name);
    
    PERFORM log_activity_event(
      v_plan_id, 'annual_kr'::event_entity_type, OLD.id,
      'deleted'::event_type, v_old_data, NULL
    );
    
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER annual_krs_activity_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON annual_krs
  FOR EACH ROW
  EXECUTE FUNCTION annual_krs_activity_events();

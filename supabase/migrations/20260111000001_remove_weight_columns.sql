-- Migration: Remove weight columns from objectives and annual_krs tables
-- Description: Weight is no longer needed as all items will be treated equally

-- First, drop the view that depends on weight columns
DROP VIEW IF EXISTS v_objective_progress;

-- Drop weight column from objectives table
ALTER TABLE objectives DROP COLUMN IF EXISTS weight;

-- Drop weight column from annual_krs table  
ALTER TABLE annual_krs DROP COLUMN IF EXISTS weight;

-- Recreate the v_objective_progress view using simple average instead of weighted average
CREATE VIEW v_objective_progress AS
SELECT 
  o.id,
  o.plan_id,
  o.code,
  o.name,
  COUNT(ak.id) AS kr_count,
  COALESCE(
    AVG(
      CASE 
        WHEN ak.kr_type = 'milestone' THEN
          CASE WHEN ak.current_value >= ak.target_value THEN 100 ELSE 0 END
        WHEN ak.target_value = ak.start_value THEN
          100
        ELSE
          LEAST(100, GREATEST(0, 
            (ak.current_value - ak.start_value) / NULLIF(ak.target_value - ak.start_value, 0) * 100
          ))
      END
    ),
    0
  ) AS progress_percent
FROM objectives o
LEFT JOIN annual_krs ak ON ak.objective_id = o.id
GROUP BY o.id, o.plan_id, o.code, o.name;

COMMENT ON VIEW v_objective_progress IS 'Calculated progress percentage for each objective (simple average of KRs)';

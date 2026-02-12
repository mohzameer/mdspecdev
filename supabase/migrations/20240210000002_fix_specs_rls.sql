-- Drop and recreate the specs_select policy to remove the 'archived_at IS NULL' check

-- Old Policy (for reference):
-- CREATE POLICY "specs_select" ON specs
--   FOR SELECT USING (
--     is_org_member(get_org_from_project(project_id))
--     AND archived_at IS NULL
--   );

DROP POLICY IF EXISTS "specs_select" ON specs;

CREATE POLICY "specs_select" ON specs
  FOR SELECT USING (
    is_org_member(get_org_from_project(project_id))
    -- Removed: AND archived_at IS NULL
  );

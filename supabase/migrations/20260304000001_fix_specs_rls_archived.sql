-- Fix specs RLS: org members should be able to see their archived specs
-- The previous policy blocked any SELECT on archived specs for org members.

DROP POLICY IF EXISTS "specs_read" ON specs;

CREATE POLICY "specs_read" ON specs
  FOR SELECT USING (
    -- Public specs are always readable
    (is_public)
    OR
    -- Org members can read ALL their specs (active and archived)
    is_org_member(get_org_from_project(project_id))
  );


-- Update `specs` and `revisions` RLS to allow public access

-- Specs: Enable selection if is_public (or existing member)
DROP POLICY IF EXISTS "specs_select" ON specs;
CREATE POLICY "specs_read" ON specs
  FOR SELECT USING (
    (is_public)
    OR
    (is_org_member(get_org_from_project(project_id)) AND archived_at IS NULL)
  );

-- Revisions: Enable selection if spec is public
DROP POLICY IF EXISTS "revisions_select" ON revisions;
CREATE POLICY "revisions_read" ON revisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs 
      WHERE specs.id = revisions.spec_id 
      AND (
        specs.is_public
        OR
        is_org_member(get_org_from_spec(specs.id))
      )
    )
  );

-- Also update comment_threads and comments to allow read for public specs later if needed,
-- but the immediate issue is content download (specs/revisions).

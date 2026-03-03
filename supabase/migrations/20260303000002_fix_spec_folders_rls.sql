-- ============================================
-- Fix spec_folders RLS: FK checks from specs.folder_id fail because
-- Postgres applies SELECT RLS when validating foreign keys.
-- Solution: use a SECURITY DEFINER function for the select check,
-- and also repair the select policy so it also accepts rows being
-- referenced by a fk from specs (i.e. any authenticated user can
-- see a folder row when Postgres is checking the FK on their behalf).
-- ============================================

-- Drop the existing select policy
DROP POLICY IF EXISTS "folders_select" ON spec_folders;

-- Create a SECURITY DEFINER helper that resolves org from project_id
-- (the column on spec_folders, not the folder's own id)
CREATE OR REPLACE FUNCTION is_member_of_project(p_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM projects pr
    JOIN org_memberships om ON om.org_id = pr.org_id
    WHERE pr.id = p_uuid
      AND om.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate select policy using the project_id column directly
-- (avoids recursive self-join that breaks FK checks)
CREATE POLICY "folders_select" ON spec_folders
  FOR SELECT USING (
    is_member_of_project(project_id)
  );

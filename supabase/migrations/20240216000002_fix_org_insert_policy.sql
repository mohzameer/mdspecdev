-- Drop existing insert policy if it exists to be safe
DROP POLICY IF EXISTS "orgs_insert" ON organizations;

-- Re-create the policy allowing any authenticated user to create an organization
CREATE POLICY "orgs_insert" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

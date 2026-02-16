
-- Drop the trigger that might be causing issues or double-inserts
DROP TRIGGER IF EXISTS on_org_created ON organizations;
DROP FUNCTION IF EXISTS handle_new_org();

-- Create a secure RPC to handle organization creation
CREATE OR REPLACE FUNCTION create_organization(org_name TEXT, org_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  new_org JSONB;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user is logged in
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Insert Org
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- 2. Insert Membership (owner)
  INSERT INTO org_memberships (org_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'owner');
  
  -- Return the org object
  SELECT jsonb_build_object('id', id, 'name', name, 'slug', slug, 'created_at', created_at)
  INTO new_org
  FROM organizations
  WHERE id = new_org_id;
  
  RETURN new_org;
END;
$$;

-- ============================================
-- Row-Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper Functions
-- ============================================

-- Check if user is member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_memberships
    WHERE org_id = org_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role in an organization
CREATE OR REPLACE FUNCTION get_org_role(org_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM org_memberships
  WHERE org_id = org_uuid AND user_id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage org (owner or admin)
CREATE OR REPLACE FUNCTION can_manage_org(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_org_role(org_uuid) IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is org owner
CREATE OR REPLACE FUNCTION is_org_owner(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_org_role(org_uuid) = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can edit in org (member+ role)
CREATE OR REPLACE FUNCTION can_edit_in_org(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_org_role(org_uuid) IN ('owner', 'admin', 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get org_id from project_id
CREATE OR REPLACE FUNCTION get_org_from_project(project_uuid UUID)
RETURNS UUID AS $$
DECLARE
  org_uuid UUID;
BEGIN
  SELECT org_id INTO org_uuid FROM projects WHERE id = project_uuid;
  RETURN org_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get org_id from spec_id
CREATE OR REPLACE FUNCTION get_org_from_spec(spec_uuid UUID)
RETURNS UUID AS $$
DECLARE
  org_uuid UUID;
BEGIN
  SELECT p.org_id INTO org_uuid 
  FROM specs s 
  JOIN projects p ON s.project_id = p.id 
  WHERE s.id = spec_uuid;
  RETURN org_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Profiles Policies
-- ============================================

-- Anyone authenticated can view profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- Organizations Policies
-- ============================================

-- Org members can view their orgs
CREATE POLICY "orgs_select_member" ON organizations
  FOR SELECT USING (is_org_member(id));

-- Anyone authenticated can create orgs
CREATE POLICY "orgs_insert" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only owners can update orgs
CREATE POLICY "orgs_update_owner" ON organizations
  FOR UPDATE USING (is_org_owner(id));

-- Only owners can delete orgs
CREATE POLICY "orgs_delete_owner" ON organizations
  FOR DELETE USING (is_org_owner(id));

-- ============================================
-- Org Memberships Policies
-- ============================================

-- Members can view memberships in their org
CREATE POLICY "memberships_select" ON org_memberships
  FOR SELECT USING (is_org_member(org_id));

-- Owners/admins can insert memberships
CREATE POLICY "memberships_insert" ON org_memberships
  FOR INSERT WITH CHECK (can_manage_org(org_id));

-- Owners/admins can update memberships (except making new owners)
CREATE POLICY "memberships_update" ON org_memberships
  FOR UPDATE USING (can_manage_org(org_id));

-- Owners can delete memberships, or users can remove themselves
CREATE POLICY "memberships_delete" ON org_memberships
  FOR DELETE USING (is_org_owner(org_id) OR user_id = auth.uid());

-- ============================================
-- Projects Policies
-- ============================================

-- Org members can view projects
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (is_org_member(org_id));

-- Members+ can create projects
CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (can_edit_in_org(org_id));

-- Owners/admins can update projects
CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (can_manage_org(org_id));

-- Only owners can delete projects
CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (is_org_owner(org_id));

-- ============================================
-- Specs Policies
-- ============================================

-- Org members can view non-archived specs
CREATE POLICY "specs_select" ON specs
  FOR SELECT USING (
    is_org_member(get_org_from_project(project_id))
    AND archived_at IS NULL
  );

-- Members+ can create specs
CREATE POLICY "specs_insert" ON specs
  FOR INSERT WITH CHECK (
    can_edit_in_org(get_org_from_project(project_id))
  );

-- Spec owners or org admins can update specs
CREATE POLICY "specs_update" ON specs
  FOR UPDATE USING (
    owner_id = auth.uid() 
    OR can_manage_org(get_org_from_project(project_id))
  );

-- Only org owners can delete specs
CREATE POLICY "specs_delete" ON specs
  FOR DELETE USING (
    is_org_owner(get_org_from_project(project_id))
  );

-- ============================================
-- Revisions Policies
-- ============================================

-- Anyone who can view the spec can view revisions
CREATE POLICY "revisions_select" ON revisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs 
      WHERE specs.id = revisions.spec_id 
      AND is_org_member(get_org_from_spec(specs.id))
    )
  );

-- Anyone who can update the spec can create revisions
CREATE POLICY "revisions_insert" ON revisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM specs 
      WHERE specs.id = revisions.spec_id 
      AND (
        specs.owner_id = auth.uid() 
        OR can_manage_org(get_org_from_spec(specs.id))
      )
    )
  );

-- ============================================
-- Comment Threads Policies
-- ============================================

-- Anyone who can view the spec can view threads
CREATE POLICY "threads_select" ON comment_threads
  FOR SELECT USING (
    is_org_member(get_org_from_spec(spec_id))
  );

-- Org members can create threads
CREATE POLICY "threads_insert" ON comment_threads
  FOR INSERT WITH CHECK (
    is_org_member(get_org_from_spec(spec_id))
  );

-- Thread authors, spec owners, or org admins can resolve threads
CREATE POLICY "threads_update" ON comment_threads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.thread_id = comment_threads.id
      AND c.parent_comment_id IS NULL
      AND c.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM specs s
      WHERE s.id = comment_threads.spec_id
      AND s.owner_id = auth.uid()
    )
    OR can_manage_org(get_org_from_spec(spec_id))
  );

-- ============================================
-- Comments Policies
-- ============================================

-- Anyone who can view the spec can view comments
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comment_threads ct
      WHERE ct.id = comments.thread_id
      AND is_org_member(get_org_from_spec(ct.spec_id))
    )
  );

-- Org members can create comments
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM comment_threads ct
      WHERE ct.id = comments.thread_id
      AND is_org_member(get_org_from_spec(ct.spec_id))
    )
  );

-- Comment authors can update their own comments
CREATE POLICY "comments_update_own" ON comments
  FOR UPDATE USING (author_id = auth.uid());

-- Comment authors can delete their own comments
CREATE POLICY "comments_delete_own" ON comments
  FOR DELETE USING (author_id = auth.uid());

-- ============================================
-- Mentions Policies
-- ============================================

-- Users can view mentions where they are mentioned
CREATE POLICY "mentions_select_own" ON mentions
  FOR SELECT USING (mentioned_user_id = auth.uid());

-- Comment authors can create mentions
CREATE POLICY "mentions_insert" ON mentions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.id = mentions.comment_id
      AND c.author_id = auth.uid()
    )
  );

-- Mentioned users can mark as read
CREATE POLICY "mentions_update_own" ON mentions
  FOR UPDATE USING (mentioned_user_id = auth.uid());

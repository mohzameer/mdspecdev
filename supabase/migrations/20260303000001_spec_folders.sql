-- ============================================
-- spec_folders: Nested folder organization for specs
-- ============================================

-- 1. Create spec_folders table
CREATE TABLE spec_folders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES spec_folders(id) ON DELETE CASCADE,  -- NULL = root folder
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, parent_folder_id, slug)
);

-- 2. Add folder_id to specs (NULL = root level, no folder)
ALTER TABLE specs ADD COLUMN folder_id UUID REFERENCES spec_folders(id) ON DELETE SET NULL;

-- 3. Index for fast folder lookups
CREATE INDEX idx_spec_folders_project_id ON spec_folders(project_id);
CREATE INDEX idx_spec_folders_parent_folder_id ON spec_folders(parent_folder_id);
CREATE INDEX idx_specs_folder_id ON specs(folder_id);

-- 4. Enable RLS on spec_folders
ALTER TABLE spec_folders ENABLE ROW LEVEL SECURITY;

-- Helper: get org_id from a folder id
CREATE OR REPLACE FUNCTION get_org_from_folder(folder_uuid UUID)
RETURNS UUID AS $$
DECLARE
  org_uuid UUID;
BEGIN
  SELECT p.org_id INTO org_uuid
  FROM spec_folders f
  JOIN projects p ON f.project_id = p.id
  WHERE f.id = folder_uuid;
  RETURN org_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS Policies for spec_folders

-- Org members can view folders in their projects
CREATE POLICY "folders_select" ON spec_folders
  FOR SELECT USING (
    is_org_member(get_org_from_folder(id))
  );

-- Members+ can create folders
CREATE POLICY "folders_insert" ON spec_folders
  FOR INSERT WITH CHECK (
    can_edit_in_org((SELECT org_id FROM projects WHERE id = project_id))
  );

-- Members+ can update (rename/move) folders
CREATE POLICY "folders_update" ON spec_folders
  FOR UPDATE USING (
    can_edit_in_org(get_org_from_folder(id))
  );

-- Members+ can delete folders
CREATE POLICY "folders_delete" ON spec_folders
  FOR DELETE USING (
    can_edit_in_org(get_org_from_folder(id))
  );

-- 6. Auto-update updated_at on spec_folders
CREATE OR REPLACE FUNCTION update_spec_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spec_folders_updated_at
  BEFORE UPDATE ON spec_folders
  FOR EACH ROW EXECUTE FUNCTION update_spec_folders_updated_at();

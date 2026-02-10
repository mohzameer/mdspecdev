-- Add unique constraint to organizations slug (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_key') THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Add unique constraint to projects slug scoped to organization (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_org_id_slug_key') THEN
    ALTER TABLE projects ADD CONSTRAINT projects_org_id_slug_key UNIQUE (org_id, slug);
  END IF;
END $$;

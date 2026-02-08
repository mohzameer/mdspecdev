-- Add unique constraint to organizations slug
ALTER TABLE organizations 
ADD CONSTRAINT organizations_slug_key UNIQUE (slug);

-- Add unique constraint to projects slug (scoped to organization)
ALTER TABLE projects 
ADD CONSTRAINT projects_org_id_slug_key UNIQUE (org_id, slug);

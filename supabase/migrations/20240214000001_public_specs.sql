-- Add is_public column to specs
ALTER TABLE specs 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Update RLS policies to allow public access

-- Specs: Allow public select
DROP POLICY IF EXISTS "specs_select" ON specs;
CREATE POLICY "specs_select" ON specs
  FOR SELECT USING (
    is_public 
    OR (
      is_org_member(get_org_from_project(project_id))
      AND archived_at IS NULL
    )
  );

-- Revisions: Allow public select if spec is public
DROP POLICY IF EXISTS "revisions_select" ON revisions;
CREATE POLICY "revisions_select" ON revisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs 
      WHERE specs.id = revisions.spec_id 
      AND (
        specs.is_public
        OR is_org_member(get_org_from_spec(specs.id))
      )
    )
  );

-- Comment Threads: Allow public select if spec is public
DROP POLICY IF EXISTS "threads_select" ON comment_threads;
CREATE POLICY "threads_select" ON comment_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs
      WHERE specs.id = comment_threads.spec_id
      AND (
        specs.is_public
        OR is_org_member(get_org_from_spec(specs.id))
      )
    )
  );

-- Comments: Allow public select if spec is public
DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comment_threads ct
      JOIN specs s ON ct.spec_id = s.id
      WHERE ct.id = comments.thread_id
      AND (
        s.is_public
        OR is_org_member(get_org_from_spec(s.id))
      )
    )
  );

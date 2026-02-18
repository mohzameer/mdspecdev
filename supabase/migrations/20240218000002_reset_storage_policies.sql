-- Nuclear fix: drop ALL storage policies for spec-content and recreate cleanly
-- This resolves conflicts from previous migrations

DROP POLICY IF EXISTS "spec_content_insert" ON storage.objects;
DROP POLICY IF EXISTS "spec_content_update" ON storage.objects;
DROP POLICY IF EXISTS "spec_content_delete" ON storage.objects;
DROP POLICY IF EXISTS "spec_content_select" ON storage.objects;
DROP POLICY IF EXISTS "spec_content_access" ON storage.objects;
DROP POLICY IF EXISTS "spec_content_select_public_access" ON storage.objects;

-- Simple, permissive policies for spec-content bucket
-- Any authenticated user can upload
CREATE POLICY "spec_content_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'spec-content');

-- Any authenticated user can update (needed for upsert)
CREATE POLICY "spec_content_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'spec-content')
WITH CHECK (bucket_id = 'spec-content');

-- Any authenticated user can delete
CREATE POLICY "spec_content_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'spec-content');

-- Public specs readable by anyone; private specs by org members
CREATE POLICY "spec_content_select"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'spec-content' AND (
    -- Public spec: anyone can read
    EXISTS (
      SELECT 1
      FROM revisions r
      JOIN specs s ON r.spec_id = s.id
      WHERE r.content_key = storage.objects.name
      AND s.is_public = true
    )
    OR
    -- Private spec: authenticated org members only
    (
      auth.role() = 'authenticated' AND
      EXISTS (
        SELECT 1
        FROM revisions r
        JOIN specs s ON r.spec_id = s.id
        WHERE r.content_key = storage.objects.name
        AND (
          is_org_member(get_org_from_spec(s.id))
          OR s.owner_id = auth.uid()
        )
      )
    )
  )
);

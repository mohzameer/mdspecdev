
DROP POLICY IF EXISTS "spec_content_access" ON storage.objects;
DROP POLICY IF EXISTS "spec_content_select" ON storage.objects;

-- Create new unified select policy
CREATE POLICY "spec_content_select_public_access"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'spec-content' AND (
      EXISTS (
        SELECT 1 
        FROM revisions r
        JOIN specs s ON r.spec_id = s.id
        WHERE r.content_key = storage.objects.name
        AND s.is_public = true
      )
      OR
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

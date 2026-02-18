-- Fix storage policies for spec-content bucket
-- Ensure INSERT and UPDATE policies exist for authenticated users

-- Drop existing insert/update policies to avoid conflicts
DROP POLICY IF EXISTS "spec_content_insert" ON storage.objects;
DROP POLICY IF EXISTS "spec_content_update" ON storage.objects;
DROP POLICY IF EXISTS "spec_content_delete" ON storage.objects;

-- Allow authenticated users to upload new spec content
CREATE POLICY "spec_content_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'spec-content'
);

-- Allow authenticated users to update (upsert) spec content
-- This is needed because storage.upload with upsert:true triggers an UPDATE
CREATE POLICY "spec_content_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'spec-content'
)
WITH CHECK (
  bucket_id = 'spec-content'
);

-- Allow authenticated users to delete spec content they own
CREATE POLICY "spec_content_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'spec-content'
);

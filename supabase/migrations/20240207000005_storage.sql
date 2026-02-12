-- ============================================
-- Storage Configuration
-- ============================================

-- Create the storage bucket for spec content
INSERT INTO storage.buckets (id, name, public)
VALUES ('spec-content', 'spec-content', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage Policies
-- ============================================

-- Allow authenticated users to upload to their specs
CREATE POLICY "spec_content_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'spec-content'
);

-- Allow users to read spec content if they can view the spec
CREATE POLICY "spec_content_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'spec-content'
);

-- Allow users to update spec content they can modify
CREATE POLICY "spec_content_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'spec-content'
);

-- Allow users to delete spec content they can modify
CREATE POLICY "spec_content_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'spec-content'
);

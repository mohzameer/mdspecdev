-- Fix infinite recursion in RLS policies
-- Problem: threads_update queries comments, and comments_select queries comment_threads
-- Solution: Use a SECURITY DEFINER function to check thread authorship without triggering RLS on comments

-- 1. Create helper function to check authorship safely
CREATE OR REPLACE FUNCTION is_thread_author(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS on the tables it queries (comments)
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM comments
    WHERE thread_id = p_thread_id
    AND parent_comment_id IS NULL
    AND author_id = auth.uid()
  );
END;
$$;

-- 2. Update the threads_update policy to use the safe function
DROP POLICY IF EXISTS "threads_update" ON comment_threads;

CREATE POLICY "threads_update" ON comment_threads
  FOR UPDATE USING (
    -- Case 1: Thread author (via safe function)
    is_thread_author(id)
    
    -- Case 2: Spec Owner
    OR EXISTS (
      SELECT 1 FROM specs s
      WHERE s.id = comment_threads.spec_id
      AND s.owner_id = auth.uid()
    )
    
    -- Case 3: Org Member (Owner, Admin, Member - NOT Viewer)
    OR can_edit_in_org(get_org_from_spec(spec_id))
  );

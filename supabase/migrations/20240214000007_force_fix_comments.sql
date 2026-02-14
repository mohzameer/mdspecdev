-- Force re-application of RLS policies for comments
-- This migration ensures that the logic from 000006 is definitely applied

-- 1. Update RLS policies
DROP POLICY IF EXISTS "threads_select_public" ON comment_threads;
CREATE POLICY "threads_select_public" ON comment_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs
      WHERE specs.id = comment_threads.spec_id
      AND specs.is_public = true
    )
  );

DROP POLICY IF EXISTS "comments_select_public" ON comments;
CREATE POLICY "comments_select_public" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comment_threads ct
      JOIN specs s ON ct.spec_id = s.id
      WHERE ct.id = comments.thread_id
      AND s.is_public = true
    )
  );

DROP POLICY IF EXISTS "threads_update" ON comment_threads;
CREATE POLICY "threads_update" ON comment_threads
  FOR UPDATE USING (
    -- Case 1: Thread author (owner of root comment)
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.thread_id = comment_threads.id
      AND c.parent_comment_id IS NULL
      AND c.author_id = auth.uid()
    )
    -- Case 2: Spec Owner
    OR EXISTS (
      SELECT 1 FROM specs s
      WHERE s.id = comment_threads.spec_id
      AND s.owner_id = auth.uid()
    )
    -- Case 3: Org Member (Owner, Admin, Member - NOT Viewer)
    OR can_edit_in_org(get_org_from_spec(spec_id))
  );

-- 2. Update get_spec_by_slugs to return user_role
CREATE OR REPLACE FUNCTION get_spec_by_slugs(
  p_org_slug TEXT,
  p_project_slug TEXT,
  p_spec_slug TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_spec_data JSONB;
  v_org_data JSONB;
  v_project_data JSONB;
  v_result JSONB;
BEGIN
  -- Verify access and get data
  SELECT 
    to_jsonb(s) || jsonb_build_object(
      'is_member', (is_org_member(o.id) OR s.owner_id = auth.uid()),
      'user_role', get_org_role(o.id),
      'owner', jsonb_build_object(
        'id', pr.id,
        'full_name', pr.full_name,
        'avatar_url', pr.avatar_url,
        'email', pr.email
      ),
      'revisions', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', r.id,
          'revision_number', r.revision_number,
          'created_at', r.created_at,
          'content_key', r.content_key,
          'summary', r.summary,
          'ai_summary', r.ai_summary,
          'author', jsonb_build_object('full_name', ra.full_name)
        ) ORDER BY r.revision_number DESC)
        FROM revisions r
        LEFT JOIN profiles ra ON r.author_id = ra.id
        WHERE r.spec_id = s.id
      ), '[]'::jsonb),
      'comment_threads', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ct.id,
          'resolved', ct.resolved,
          'anchor_heading_id', ct.anchor_heading_id,
          'quoted_text', ct.quoted_text,
          'comments', COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'id', c.id, 
               'deleted', c.deleted,
               'body', c.body,
               'author_id', c.author_id,
               'created_at', c.created_at,
               'parent_comment_id', c.parent_comment_id
             ) ORDER BY c.created_at ASC)
             FROM comments c WHERE c.thread_id = ct.id
          ), '[]'::jsonb)
        ))
        FROM comment_threads ct
        WHERE ct.spec_id = s.id
      ), '[]'::jsonb)
    ),
    jsonb_build_object('id', o.id, 'name', o.name, 'slug', o.slug),
    jsonb_build_object('id', p.id, 'name', p.name, 'slug', p.slug, 'org_id', p.org_id)
  INTO v_spec_data, v_org_data, v_project_data
  FROM specs s
  JOIN projects p ON s.project_id = p.id
  JOIN organizations o ON p.org_id = o.id
  JOIN profiles pr ON s.owner_id = pr.id
  WHERE o.slug = p_org_slug
    AND p.slug = p_project_slug
    AND s.slug = p_spec_slug
    AND (s.is_public OR is_org_member(o.id) OR s.owner_id = auth.uid());

  IF v_spec_data IS NULL THEN
    RETURN NULL;
  END IF;

  v_result := jsonb_build_object(
    'spec', v_spec_data,
    'org', v_org_data,
    'project', v_project_data
  );

  RETURN v_result;
END;
$$;

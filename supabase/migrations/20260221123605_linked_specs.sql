-- Migration to support Linked Specs (Direct Read)

-- 1. Add source_spec_id to specs table
ALTER TABLE specs ADD COLUMN source_spec_id UUID REFERENCES specs(id);

-- 2. Update get_spec_by_slugs to fetch source spec revisions/comments if linked
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
        WHERE r.spec_id = COALESCE(s.source_spec_id, s.id)
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
        WHERE ct.spec_id = COALESCE(s.source_spec_id, s.id)
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

-- 3. We also need to ensure that when inserting a linked spec, the user has access to the source spec
-- The best place for this is likely in the backend server action or a trigger, but we can rely on the server action for now.

-- Re-create the policy to insert specs, just to be safe it's intact
-- No changes strictly required to RLS for reading specs, as the proxy spec will have its own project_id.

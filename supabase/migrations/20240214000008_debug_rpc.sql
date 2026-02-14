-- Debug function to check permissions for a specific thread
CREATE OR REPLACE FUNCTION debug_comments_rls(p_thread_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
-- SECURITY INVOKER (Default) implies it runs with the permissions of the user calling it
AS $$
DECLARE
  v_spec_id UUID;
  v_org_id UUID;
  v_is_member BOOLEAN;
  v_can_edit BOOLEAN;
  v_user_id UUID;
  v_role TEXT;
  v_thread_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if thread exists (bypass RLS by selecting into directly? No, this Select is subject to RLS if Invoker)
  -- But we want to see if the TABLE row is visible.
  SELECT EXISTS(SELECT 1 FROM comment_threads WHERE id = p_thread_id) INTO v_thread_exists;
  
  -- Get spec_id directly (bypass RLS for debugging purposes if possible? No, we need helper)
  -- Let's use a privileged lookup to get the raw data first
  SELECT spec_id INTO v_spec_id FROM comment_threads WHERE id = p_thread_id;
  
  -- If we can't see the thread, v_spec_id might be null if RLS hides it.
  -- Let's try to get it via a Sec Def trick or assume we can see it via the public Select policy if applicable.
  
  -- Calculate derived values
  IF v_spec_id IS NOT NULL THEN
      v_org_id := get_org_from_spec(v_spec_id);
      IF v_org_id IS NOT NULL THEN
        v_role := get_org_role(v_org_id);
        v_can_edit := can_edit_in_org(v_org_id);
        v_is_member := is_org_member(v_org_id);
      END IF;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'thread_id', p_thread_id,
    'thread_visible', v_thread_exists,
    'spec_id', v_spec_id,
    'org_id', v_org_id,
    'org_role', v_role,
    'can_edit', v_can_edit,
    'is_member', v_is_member
  );
END;
$$;

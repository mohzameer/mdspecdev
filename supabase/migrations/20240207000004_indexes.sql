-- ============================================
-- Performance Indexes
-- ============================================

-- Specs indexes
CREATE INDEX specs_project_id_idx ON specs(project_id);
CREATE INDEX specs_owner_id_idx ON specs(owner_id);
CREATE INDEX specs_archived_at_idx ON specs(archived_at) WHERE archived_at IS NULL;
CREATE INDEX specs_status_idx ON specs(status);
CREATE INDEX specs_search_idx ON specs USING gin(search_vector);

-- Revisions indexes
CREATE INDEX revisions_spec_id_idx ON revisions(spec_id);
CREATE INDEX revisions_spec_id_revision_number_idx ON revisions(spec_id, revision_number DESC);
CREATE INDEX revisions_author_id_idx ON revisions(author_id);
CREATE INDEX revisions_content_hash_idx ON revisions(content_hash);

-- Comment threads indexes
CREATE INDEX comment_threads_spec_id_idx ON comment_threads(spec_id);
CREATE INDEX comment_threads_resolved_idx ON comment_threads(resolved);
CREATE INDEX comment_threads_anchor_idx ON comment_threads(anchor_heading_id);

-- Comments indexes
CREATE INDEX comments_thread_id_idx ON comments(thread_id);
CREATE INDEX comments_author_id_idx ON comments(author_id);
CREATE INDEX comments_parent_id_idx ON comments(parent_comment_id);

-- Mentions indexes
CREATE INDEX mentions_comment_id_idx ON mentions(comment_id);
CREATE INDEX mentions_user_read_idx ON mentions(mentioned_user_id, read);

-- Org memberships indexes
CREATE INDEX org_memberships_org_id_idx ON org_memberships(org_id);
CREATE INDEX org_memberships_user_id_idx ON org_memberships(user_id);

-- Projects indexes
CREATE INDEX projects_org_id_idx ON projects(org_id);

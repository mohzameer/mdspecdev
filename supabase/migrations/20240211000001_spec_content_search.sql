-- ============================================
-- Deep Search Implementation
-- Index spec content by section for granular search
-- ============================================

CREATE TABLE spec_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  heading_id TEXT NOT NULL,
  heading_text TEXT NOT NULL,
  content TEXT NOT NULL, -- The text content of the section
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX spec_sections_spec_id_idx ON spec_sections(spec_id);
CREATE INDEX spec_sections_search_idx ON spec_sections USING gin(search_vector);

-- ============================================
-- Search Vector Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_spec_section_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Weight A: Heading
  -- Weight B: Content
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.heading_text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spec_sections_search_update
  BEFORE INSERT OR UPDATE ON spec_sections
  FOR EACH ROW EXECUTE FUNCTION update_spec_section_search_vector();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE spec_sections ENABLE ROW LEVEL SECURITY;

-- Anyone who can view the spec can view its sections
-- Note: We join with specs to check permissions
CREATE POLICY "sections_select" ON spec_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM specs 
      WHERE specs.id = spec_sections.spec_id 
      AND is_org_member(get_org_from_spec(specs.id))
    )
  );

-- Only system/triggers should ideally insert here, but for now we follow the pattern
-- that anyone who can edit the spec can update its sections index
CREATE POLICY "sections_insert" ON spec_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM specs 
      WHERE specs.id = spec_sections.spec_id 
      AND (
        specs.owner_id = auth.uid() 
        OR can_manage_org(get_org_from_spec(specs.id))
      )
    )
  );

CREATE POLICY "sections_delete" ON spec_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM specs 
      WHERE specs.id = spec_sections.spec_id 
      AND (
        specs.owner_id = auth.uid() 
        OR can_manage_org(get_org_from_spec(specs.id))
      )
    )
  );

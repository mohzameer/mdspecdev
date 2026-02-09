-- ============================================
-- mdspec Initial Schema
-- Organizations, Profiles, Memberships, Projects, Specs, Revisions, Comments
-- ============================================

-- ============================================
-- Organizations (top-level container)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Profiles (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Organization Memberships with roles
-- ============================================
CREATE TABLE org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- ============================================
-- Projects within organizations
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Specifications (main entity)
-- ============================================
CREATE TABLE specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Metadata from frontmatter
  progress DECIMAL(3,1) CHECK (progress >= 0 AND progress <= 10),
  status TEXT CHECK (status IN ('planned', 'in-progress', 'completed')),
  maturity TEXT CHECK (maturity IN ('draft', 'review', 'stable', 'deprecated')),
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  
  -- Full-text search vector
  search_vector TSVECTOR,
  
  UNIQUE(project_id, slug)
);

-- ============================================
-- Revisions (snapshot-based versioning)
-- ============================================
CREATE TABLE revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  content_key TEXT NOT NULL,       -- Supabase Storage path
  content_hash TEXT NOT NULL,       -- SHA256 for deduplication
  summary TEXT,                     -- Summary of Changes
  author_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_tier TEXT NOT NULL DEFAULT 'hot' CHECK (storage_tier IN ('hot', 'cold')),
  UNIQUE(spec_id, revision_number)
);

-- ============================================
-- Comment Threads (section-anchored)
-- ============================================
CREATE TABLE comment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  anchor_heading_id TEXT NOT NULL,   -- e.g., "authentication-flow"
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Comments (threaded discussions)
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- Mentions (@username in comments)
-- ============================================
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

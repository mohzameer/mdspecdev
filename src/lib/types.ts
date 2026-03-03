// ============================================
// Core Enums
// ============================================

export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type Status = 'planned' | 'in-progress' | 'completed';
export type Maturity = 'draft' | 'review' | 'stable' | 'deprecated';
export type StorageTier = 'hot' | 'cold';

// ============================================
// Database Entities
// ============================================

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface OrgMembership {
  id: string;
  org_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  // Joined data
  organization?: Organization;
  profile?: Profile;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  organization?: Organization;
}

export interface Spec {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  owner_id: string;
  progress: number | null;
  status: Status | null;
  maturity: Maturity | null;
  file_name: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  // Joined data
  project?: Project;
  owner?: Profile;
  revisions?: Revision[];
  comment_threads?: CommentThread[];
}

export interface Revision {
  id: string;
  spec_id: string;
  revision_number: number;
  content_key: string;
  content_hash: string;
  summary: string | null;
  author_id: string;
  created_at: string;
  storage_tier: StorageTier;
  // Joined data
  author?: Profile;
}

export interface CommentThread {
  id: string;
  spec_id: string;
  anchor_heading_id: string;
  quoted_text?: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  // Joined data
  comments?: Comment[];
  resolver?: Profile;
}

export interface Comment {
  id: string;
  thread_id: string;
  parent_comment_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  // Joined data
  author?: Profile;
  replies?: Comment[];
  mentions?: Mention[];
}

export interface Mention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  read: boolean;
  created_at: string;
  // Joined data
  mentioned_user?: Profile;
}

// ============================================
// Spec Metadata (from frontmatter)
// ============================================

export interface SpecMetadata {
  progress?: number;
  status?: Status;
  maturity?: Maturity;
  owner?: string;
  tags?: string[];
  target_date?: string;
  last_reviewed?: string;
  reviewers?: string[];
  blockers?: string[];
  depends_on?: string[];
  custom?: Record<string, any>;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateSpecInput {
  project_id: string;
  name: string;
  slug: string;
  file_name?: string;
  content: string;
}

export interface UpdateSpecInput {
  name?: string;
  file_name?: string;
  content?: string;
  summary?: string;
}

export interface CreateCommentInput {
  spec_id: string;
  anchor_heading_id: string;
  body: string;
  parent_comment_id?: string;
}

// ============================================
// UI/Display Types
// ============================================

export interface SpecCardData {
  id: string;
  name: string;
  slug: string;
  progress: number | null;
  status: Status | null;
  maturity: Maturity | null;
  tags: string[] | null;
  updated_at: string;
  owner: Pick<Profile, 'full_name' | 'avatar_url'> | null;
  project: Pick<Project, 'id' | 'name'> | null;
  unresolved_count: number;
  revision_count: number;
}

export interface DashboardFilters {
  project_id?: string;
  status?: Status;
  owner_id?: string;
  search?: string;
  my_specs?: boolean;
  show_archived?: boolean;
}

export interface HeadingInfo {
  id: string;
  text: string;
  level: number;
}

export interface StructuralDiff {
  added: string[];
  removed: string[];
  modified: string[];
  reordered: boolean;
}

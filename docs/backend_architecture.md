# Backend Architecture

## Overview

The backend architecture is built on a **Serverless** and **BaaS (Backend-as-a-Service)** model using **Next.js** (App Router) key infrastructure provider **Supabase**.

- **Database**: PostgreSQL (via Supabase).
- **Authentication**: Supabase Auth.
- **File Storage**: Supabase Storage.
- **API Layer**: Next.js Server Actions and Route Handlers.
- **AI Integration**: OpenAI (via Server Actions).

---

## 1. Database Schema (PostgreSQL)

The core data model revolves around **Organizations**, **Projects**, and **Specifications**.

### Core Entities

- **Organizations (`organizations`)**: Top-level grouping for users and projects.
- **Projects (`projects`)**: Belong to an organization; act as containers for specs.
- **Specifications (`specs`)**: The central entity. Represents a technical document.
    - Contains metadata: `status`, `maturity`, `tags`, `progress`.
    - Supports full-text search via `search_vector` (tsvector).

### User Management & Access

- **Profiles (`profiles`)**: Extends `auth.users`. Stores display info (`full_name`, `avatar_url`).
- **Memberships (`org_memberships`)**: Links users to organizations with roles (`owner`, `admin`, `member`, `viewer`).

### Version Control (`revisions`)

We use a **snapshot-based** versioning system for specs.

- **Content Storage**: Actual markdown content is stored in **Supabase Storage** (not the DB row directly) to keep the DB light.
- **deduplication**: `content_hash` allows detecting unchanged content.
- **AI Summaries**: `ai_summary` field stores the auto-generated diff summary between revisions.
- **Tiers**: `storage_tier` distinction (`hot` vs `cold`) suggests future archival strategies.

### Collaboration (`comments` & `comment_threads`)

- **Threads**: Anchored to specific headings (`anchor_heading_id`) within a spec.
- **Comments**: Standard threaded messages.
- **Mentions**: Tracked in `mentions` table for notifications.

---

## 2. Authentication & Authorization

### Authentication
Handled by Supabase Auth (`auth.users`).
- **Middleware**: `src/middleware.ts` maintains session state by refreshing cookies on every request.
- **Client/Server**:
    - `src/lib/supabase/client.ts`: For Client Components.
    - `src/lib/supabase/server.ts`: For Server Components/Actions.

### Authorization (RLS)
Security is enforced at the **Database Level** using Row Level Security (RLS). application logic does *not* need to explicitly check permissions for data access, it just attempts the query.

Key RLS Patterns:
1.  **Helper Functions**: SQL functions encapsulate complex logic.
    - `is_org_member(org_id)`
    - `can_manage_org(org_id)`
    - `get_org_from_project(project_id)`: Transitive lookups.
2.  **Policies**:
    - **Global Read**: Org members can read almost anything in their org.
    - **Revisions**: Visible if you can see the parent spec.
    - **Comments**: Visible if you can see the parent spec.
    - **Archival**: Explicit check `archived_at IS NULL` was removed from RLS to allow "Show Archived" filters in the frontend.

---

## 3. API & Async Architecture

### Next.js App Router
We use a mix of **Server Actions** and **Route Handlers**.

- **Route Handlers (`src/app/api/`)**: Used for REST-like access or webhooks.
- **Server Actions**: Used for form submissions and mutations (e.g., creating a spec, keeping logic closer to UI).

### AI Integration (`src/lib/ai-summary.ts`)
- **Trigger**: Saving a new revision triggers an async AI summary generation.
- **Model**: OpenAI (`gpt-3.5-turbo-16k` for large context).
- **Process**:
    1. Fetches current and previous revision content from Storage.
    2. diffs them.
    3. Prompts LLM for a summary.
    4. Updates the `revisions` table with the result.
- **Performance**: The operation is designed to be non-blocking for the user flow where possible.

### Storage Strategy
- **Bucket**: `spec-content`
- **Structure**: Files reference `content_key` in the DB.
- **Pattern**: When fetching a revision, the app:
    1. Gets metadata from DB (`revisions` table).
    2. Downloads content from Storage using the key.

### Background Jobs
- **pg_cron**: Used for database-native scheduling.
    - **Auto-Archive**: Marks specs as archived based on rules defined in SQL migrations, running directly within Postgres.

---

## 4. Key Architectural Decisions

1.  **Logic in SQL**: Heavy reliance on SQL access control (RLS) implies the application layer is thin on security logic. This "thick database" approach reduces the risk of authorization bugs.
2.  **Content Separation**: Separating metadata (DB) from content (Storage) allows efficient listing/searching of specs without loading the heavy markdown body.
3.  **Hybrid Auth**: Using `middleware` for session management but RLS for data protection allows flexible rendering (SSR) while maintaining security depth.

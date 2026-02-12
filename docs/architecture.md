# Architecture Overview

## Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **AI Integration**: [OpenAI API](https://openai.com/) (GPT-4o-mini)
- **Deployment**: Vercel (Frontend/Functions), Supabase (Database/Storage)

## Project Structure

```
├── .agent/             # Agent workflows and configurations
├── docs/               # Project documentation
├── public/             # Static assets
├── scripts/            # Utility scripts (e.g., migrations, seeding)
├── src/
│   ├── app/            # Next.js App Router pages and layouts
│   │   ├── (auth)/     # Authentication routes (login, signup)
│   │   ├── api/        # backend API routes
│   │   └── dashboard/  # Authenticated user dashboard
│   ├── components/     # Reusable UI components
│   │   ├── diffuse/    # Diff viewer specific components
│   │   ├── editor/     # Markdown editor components
│   │   └── ui/         # Shadcn/Base UI primitives
│   ├── lib/            # Utilities, hooks, and types
│   │   ├── supabase/   # Supabase client instantiation
│   │   └── ai-summary  # AI generation logic
│   └── styles/         # Global styles (globals.css)
├── supabase/
│   ├── functions/      # Supabase Edge Functions (if any)
│   └── migrations/     # Database schema migrations
└── ...tf/config files
```

## Core Components

### 1. Specification Management
The core entity is a `Spec`. Specs belong to `Projects`, which belong to `Organizations`.
- **Data Model**: `specs` table links to `projects`.
- **Versioning**: Every save creates a new row in the `revisions` table, linked to the `spec_id`.

### 2. Authentication & Authorization
- **Auth**: Managed via Supabase Auth (Email/Password).
- **Authorization**: Row Level Security (RLS) policies in PostgreSQL enforce access control.
  - Users can only view specs in Organizations they are members of.
  - Organization roles (Owner, Member) determine write access.

### 3. Realtime Updates
Supabase Realtime is used to push updates to the client for:
- New comments on a spec.
- Status changes on a spec.

### 4. Background Jobs
- **pg_cron**: Used for scheduled maintenance tasks like auto-archiving.
- **Server Actions**: Used for "background-like" tasks in Next.js (e.g., triggering AI summary generation after a response is sent).

# Deployment Guide

## Prerequisites

1.  **Supabase Project**: Create a new project at [supabase.com](https://supabase.com/).
2.  **Supabase CLI**: Ensure you have the CLI installed and logged in (`npx supabase login`).
3.  **Vercel Account**: For deploying the frontend.

## Database Deployment

### 1. Link to Remote Project

Link your local environment to your remote Supabase project. You will need your project Reference ID (from the dashboard URL).

```bash
npx supabase link --project-ref <project-ref>
```

### 2. Push Migrations

Apply your local schema changes to the remote database.

```bash
npx supabase db push
```
*Note: This will apply all SQL files in `supabase/migrations/` in order.*

### 3. Verify Storage Buckets

Ensure the following buckets exist in your Supabase Storage (if not created by migrations):
- `markdown`: Public = false
- `avatars`: Public = true

## Application Deployment

### Environment Variables

Configure these variables in your deployment platform (e.g., Vercel Project Settings):

| Variable | Description | Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Supabase Dashboard > Settings > API (**Keep Secret**) |
| `OPENAI_API_KEY` | OpenAI API Key | OpenAI Dashboard |
| `RESEND_API_KEY` | Email Service Key | Resend Dashboard |
| `NEXT_PUBLIC_APP_URL` | Production URL | e.g. `https://myapp.vercel.app` |

### Email Configuration

For production email delivery:
1.  Verify your domain in [Resend](https://resend.com).
2.  Update `src/lib/email.ts` or `RESEND_FROM_EMAIL` env var to match your verified domain.

## Verification

After deployment:
1.  **Auth**: Try signing up and logging in.
2.  **Database**: Verify you can create a Project and a Spec.
3.  **Realtime**: Open the app in two tabs and verify updates appear.
4.  **Storage**: Upload an avatar image to verify bucket permissions.
5.  **Cron**: Check executing jobs in Supabase Dashboard > Database > Extensions > pg_cron (or querying `cron.job_run_details`).

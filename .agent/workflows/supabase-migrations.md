---
description: How to apply database migrations to Supabase
---

// turbo-all

## Applying Migrations

This project uses **Supabase Remote** (not local). Always push migrations to the remote database.

1. Push migrations to remote:
```bash
npx supabase db push
```

**Important Notes:**
- Do NOT use `supabase migration up` (that's for local dev)
- Do NOT use `supabase start` — there is no local Supabase instance
- The remote Supabase project is already linked
- Migration files are in `supabase/migrations/`

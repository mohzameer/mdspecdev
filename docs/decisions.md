# Architectural Decision Log (ADR)

## 1. Tailwind CSS v4 Dark Mode Strategy

### Context
Tailwind CSS v4 introduces a native dark mode variant based on media queries. However, our application uses `next-themes` to allow users to toggle themes manually (holding state in `localStorage` and applying a `.dark` class to the `<html>` element).

### Decision
We overrode the default `dark` variant in `src/app/globals.css` to use the class-based approach compatible with `next-themes` and v4's new `@variant` directive.

```css
@import "tailwindcss";
/* Override default media-query based dark mode with class-based */
@variant dark (&:where(.dark, .dark *));
```

### Rationale
- **User Control**: Essential feature for typical SaaS apps.
- **Compatibility**: Allows `next-themes` to continue working without complex configuration in a `tailwind.config.js` file (which v4 aims to reduce).

## 2. Auto-Archiving via `pg_cron`

### Context
We needed a reliable way to archive old specifications without manual intervention.

### Options Considered
- **Vercel Cron Jobs**: Would require an API endpoint and configuration in `vercel.json`.
- **Supabase Edge Functions**: Triggered by a cron schedule.
- **Database Native (`pg_cron`)**: Runs directly within the Postgres instance.

### Decision
We chose **`pg_cron`**.

### Rationale
- **Simplicity**: No external HTTP requests or function cold starts.
- **Data Locality**: The logic is purely data-manipulation (`UPDATE` query), so running it where the data lives is most efficient.
- **Self-Contained**: The schedule and logic are defined in a migration file, making the database schema the single source of truth for data lifecycle.

## 3. RLS Policies for Archived Specs

### Context
Initially, the `specs` table had a Row Level Security (RLS) policy that implicitly filtered out archived specs (`archived_at IS NULL`). This meant archived specs vanished from the UI entirely, even when explicitly requested.

### Decision
We updated the `specs_select` policy to remove the `archived_at IS NULL` check. Filtering active vs. archived specs is now handled at the application query level (in the Supabase client query).

### Rationale
- **Flexibility**: The frontend should decide whether to show active, archived, or all specs.
- **Security vs. Visibility**: RLS is for security (who *can* see this?), not for business logic (what *should* be shown by default?).

## 4. AI Generation via Server Actions

### Context
We generate AI summaries for specs. This can take several seconds.

### Decision
We trigger the generation in a **Server Action** (`saveRevision`), but we do not await the result for the user response.

### Rationale
- **UX**: User gets immediate feedback that the save was successful.
- **Reliability**: The generation happens in the background. If it fails, the spec is still saved.
- **Implementation**: We update the `revisions` table with the summary once the AI response is received, effectively using the database as a queue/cache for the result.

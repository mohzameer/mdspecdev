# Features Documentation

## 1. Auto-Archiving Specifications

### Overview
To keep the dashboard focused on relevant work, specifications that haven't been updated for a significant period are automatically archived. Archived specifications remain accessible in a read-only state.

### Implementation Logic
- **Mechanism**: We use `pg_cron`, a PostgreSQL extension available in Supabase, to schedule database-level jobs.
- **Schedule**: The job runs daily at midnight (`0 0 * * *`).
- **Criteria**: Specs are archived if:
  - They are currently active (`archived_at IS NULL`).
  - Their `updated_at` timestamp is older than **100 days**.
- **Query**:
  ```sql
  UPDATE specs
  SET archived_at = NOW()
  WHERE archived_at IS NULL
  AND updated_at < NOW() - INTERVAL '100 days';
  ```

### UI Behavior
- **Dashboard**:
  - A toggle allows users to switch between "Active" and "Archived" views.
  - Archived specs are displayed with reduced opacity to visually distinguish them.
- **Spec Detail**:
  - A persistent banner alerts the user: "This specification is archived."
  - Editing controls are disabled.

## 2. Theme System

### Overview
The application supports both Light and Dark modes, with a specific focus on high contrast for readability in dark environments.

### Implementation
- **Tech Stack**: `next-themes` and Tailwind CSS v4.
- **Configuration**:
  - We use a class-based strategy for dark mode.
  - In `globals.css`, we override the default Tailwind v4 `dark` variant to utilize the `.dark` class efficiently:
    ```css
    @variant dark (&:where(.dark, .dark *));
    ```
- **Design Decisions**:
  - **Dark Mode Palette**: Uses `slate-950` for backgrounds and `slate-800` for cards to ensure depth and contrast, avoiding "washed out" gray tones.
  - **Consistency**: The theme toggle in the navigation bar persists preference across all pages, including public-facing pages like Login and Landing.

## 3. Dashboard

### Overview
The central hub for managing specifications within an organization.

### Key Features
- **Metrics**: Real-time counters for Active Specs, Total Views, and Pending Reviews.
- **Filtering**:
  - **Search**: Full-text search on spec titles.
  - **Tags**: Filter by associated tags (e.g., "Feature", "Bug", "Enhancement").
  - **Status**: Visual indicators for Draft, Review, Approved, etc.
- **Card Layout**:
  - Uses a responsive grid system.
  - Cards are designed with a `flex-col` layout where content spacers (`flex-1`) ensure that progress bars and footers always align horizontally across rows, regardless of variable content height above them.

## 4. Specification Editor & Viewer

### Overview
A rich Markdown editor and viewer tailored for technical specifications.

### Key Features
- **Layout**: Three-pane layout consisting of a Comment Sidebar (left), Main Content (center), and Table of Contents (right).
- **Smart Table of Contents (ToC)**:
  - **Collapsible**: Can be manually toggled to save screen space.
  - **Condensed Mode**: When collapsed, it occupies minimal width (16px).
  - **Responsive**: Automatically adjusts based on screen width and the state of the comment sidebar.
- **Comment System**:
  - Threaded comments linked to specific text blocks.
  - "Unresolved" tracking keeps count of open discussions.

## 5. AI Summary Generation

### Overview
Automatically generates a concise summary of changes whenever a specification is saved.

### Workflow
1. **Trigger**: User saves a revision via the Editor.
2. **Server Action**: The `saveRevision` server action updates the database.
3. **Async Generation**: A fire-and-forget background call is made to `generateAISummary`.
4. **Storage**: The result is stored in the `revisions` table under the `ai_summary` column.
5. **Display**: The summary appears in the Spec Header and Diff Viewer once available.

## 6. Diff Viewer

### Overview
Visualizes the evolution of a specification between revisions.

### Features
- **Unified View**: Standard top-to-bottom diff.
- **Split View**: Side-by-side comparison.
- **Rendered View**: Shows the visual difference in the rendered Markdown outcome.

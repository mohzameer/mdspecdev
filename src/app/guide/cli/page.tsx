import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownContent = `# mdspec CLI

Sync your local Markdown specs with [mdspec](https://mdspec.dev) from the terminal. No editor required.

---

## Installation

**Option A — npm (requires Node.js 18+)**
\`\`\`bash
npm install -g mdspec-cli
\`\`\`

**Option B — Standalone binary (no Node.js)**
Download from [GitHub Releases](https://github.com/your-org/mdspec-cli/releases):
- **macOS (Apple Silicon):** \`mdspec-macos-arm64\`
- **macOS (Intel):** \`mdspec-macos-x64\`
- **Windows:** \`mdspec-win-x64.exe\`

Put the file in your PATH. On macOS: \`chmod +x mdspec-macos-arm64\`.

Check it works:
\`\`\`bash
mdspec whoami
\`\`\`
You’ll see “Not signed in” until you log in.

---

## Sign in

**Browser (recommended)**  
Opens mdspec in your browser; you sign in there and the CLI gets your token automatically.
\`\`\`bash
mdspec login
\`\`\`

**Email + password**  
Sign in without a browser:
\`\`\`bash
mdspec login --email you@example.com --password yourpassword
\`\`\`

**CI / scripts**  
Use a token (e.g. from a secret):
\`\`\`bash
mdspec login --token YOUR_ACCESS_TOKEN
\`\`\`
Or set \`MDSPEC_TOKEN=YOUR_ACCESS_TOKEN\` in the environment; then all commands use it and \`login\`/\`logout\` don’t change it.

**Sign out**
\`\`\`bash
mdspec logout
\`\`\`

---

## Link this folder to an mdspec project

From your repo root (or the folder that contains your specs):

\`\`\`bash
mdspec init
\`\`\`

You’ll be asked for:
- **Org slug** — your organization (e.g. \`my-company\`)
- **Project slug** — the project (e.g. \`product-docs\`)
- **Spec root** — folder where your \`.md\` specs live (default: current directory)

This creates \`.mdspec/config.json\`. To skip prompts (e.g. in scripts):

\`\`\`bash
mdspec init --org my-company --project product-docs --root docs/specs
\`\`\`

---

## Daily workflow

### See what’s tracked and what’s changed

\`\`\`bash
mdspec status
\`\`\`

Shows:
- **Tracked** — synced, local changes, or never synced; files whose remote spec is a linked (proxy) spec show “(linked spec)”
- **Untracked** — \`.md\` files not yet tracked
- **Remote only** — count of specs on the server that aren’t linked to a local file

### Add a file for sync

\`\`\`bash
mdspec track docs/auth.md
\`\`\`

Then upload it:

\`\`\`bash
mdspec sync docs/auth.md
\`\`\`

First sync creates the spec on mdspec; later syncs upload new revisions.

### Sync one file or all changed files

\`\`\`bash
mdspec sync docs/auth.md
mdspec sync --all
\`\`\`

- If nothing changed locally, you’ll see “No changes since last sync” (unless you use \`--force\`).
- Optional: \`--summary "Short description"\` for the revision, \`--force\` to upload even when the local hash matches.

### Pull the latest from mdspec

\`\`\`bash
mdspec pull docs/auth.md
mdspec pull --all
\`\`\`

Overwrites the local file with the latest spec content. If you have local changes, the command fails unless you use \`--force\` (and \`--yes\` to skip the overwrite prompt).

### List remote specs

\`\`\`bash
mdspec list
\`\`\`

Shows two groups:
- **Linked locally** — remote specs that have a local file (with a **linked** column: “yes” when the spec is a linked/proxy spec)
- **Remote only** — specs that exist only on the server

### Download a “remote only” spec as a new local file

**Pick from a list:**
\`\`\`bash
mdspec link
\`\`\`

**By slug (download existing spec in this project):**
\`\`\`bash
mdspec link onboarding --path docs/onboarding.md
\`\`\`

**Create a linked (proxy) spec in this project** — create a spec that points to another spec by ID, then save it locally:
\`\`\`bash
mdspec link --source-spec-id <source_spec_uuid> [slug] [--path docs/spec.md]
\`\`\`
Use this when you want to add a linked spec to your project; the CLI sends \`source_spec_id\` to the API and downloads the content to the given path.

\`--path\` skips the “Save as” prompt. Use \`--yes\` to overwrite an existing file without being asked.

### Open a spec or project in the browser

\`\`\`bash
mdspec open                    # project page
mdspec open docs/auth.md       # that spec’s page
\`\`\`

---

## Global options

These work with any command:

| Option | Description |
|--------|-------------|
| \`--json\` | Print machine-readable JSON instead of human-readable text |
| \`--config <path>\` | Use a different config file |
| \`--api <url>\` | Use a different API base (default: \`https://mdspec.dev/api\`) |

**Examples**
\`\`\`bash
mdspec status --json
mdspec list --json
mdspec sync --all --json
\`\`\`

Use \`--json\` in scripts and combine with \`jq\` or your own tooling.

---

## Stop tracking a file

\`\`\`bash
mdspec untrack docs/old-spec.md
\`\`\`

You’ll be asked to confirm. This only removes the file from the CLI’s tracking list; it does **not** delete the file on disk or the spec on mdspec.

---

## Quick reference

| Goal | Command |
|------|---------|
| Sign in | \`mdspec login\` |
| Sign out | \`mdspec logout\` |
| Who’s signed in | \`mdspec whoami\` |
| Link folder to project | \`mdspec init\` |
| What’s tracked / changed | \`mdspec status\` |
| Track a file | \`mdspec track <file>\` |
| Upload (sync) | \`mdspec sync [file]\` or \`mdspec sync --all\` |
| Download latest | \`mdspec pull [file]\` or \`mdspec pull --all\` |
| List remote specs | \`mdspec list\` |
| Download remote-only spec | \`mdspec link [slug]\` or \`mdspec link\` |
| Create linked spec in project | \`mdspec link --source-spec-id <uuid> [slug]\` |
| Open in browser | \`mdspec open [file]\` |
| Untrack a file | \`mdspec untrack <file>\` |

---

## Tips

- **No auto-sync** — The CLI never syncs in the background. You run \`sync\` or \`pull\` when you want.
- **Markdown only** — Only \`.md\` files are tracked.
- **Linked specs** — A “linked” spec on the server is a proxy that points to another spec (\`source_spec_id\`). You can’t upload revisions to the proxy; edit the source. Use \`mdspec link --source-spec-id <uuid>\` to create a linked spec in your project.
- **CI** — Use \`MDSPEC_TOKEN\` and \`mdspec init --org ... --project ... --root ...\` plus \`mdspec sync --all --json\` for headless pipelines.
- **Session expiry** — If your token expires, the CLI will try to refresh it automatically when possible. If that fails, run \`mdspec login\` again.
`;

export default function CLIGuidePage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-4xl prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-500">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
}
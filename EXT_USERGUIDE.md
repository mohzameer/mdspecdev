# mdspec VS Code Extension — User Guide

## What is mdspec?

The mdspec extension lets you sync Markdown files between your local workspace and the mdspec web platform. You can push local specs to mdspec, or pull the latest version down.

There is no auto-sync, no background uploads, and nothing happens without you clicking a button.

---

## Getting Started

### 1. Open the Sidebar

Click the **mdspec** icon in the Activity Bar (left side of VS Code). This opens the mdspec sidebar panel.

### 2. Log In

Run the **mdspec: Login** command:
- Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
- Type `mdspec: Login`
- Enter your mdspec email and password when prompted

Your credentials are never stored. Only the session token is saved securely in VS Code's secret storage.

### 3. Set Your Project

Run the **mdspec: Set Project** command:
- Open the Command Palette
- Type `mdspec: Set Project`
- Enter your organization slug (e.g. `my-org`)
- Enter your project slug (e.g. `product-docs`)

This links your workspace to a specific mdspec project. The org and project slugs are saved in `.mdspec/config.json`.

### 4. Track Files

The sidebar lists all `.md` files found in your workspace. Each file has a checkbox:

- **Check** a file to start tracking it
- **Uncheck** a file to stop tracking it

Only tracked files can be synced to mdspec.

### 5. Sync a File (Upload)

Click the **cloud upload** icon next to any **tracked, non-linked** file in the sidebar. This uploads the file content to mdspec.

- **First sync** — creates a new spec on the mdspec platform. The spec name is taken from the first `# Heading` in the file. If there's no heading, the filename is used.
- **Subsequent syncs** — uploads a new revision of the existing spec.

**Linked files are read-only:** if a file is linked to a remote spec (see [Linked specs](#linked-specs)), the Sync button is not shown. Use **Download** to pull the latest version from mdspec.

### 6. Download a Spec (Pull)

Click the **cloud download** icon next to any tracked file that has already been synced (or linked). This pulls the latest content from mdspec and overwrites your local file.

- **Download is blocked if you have local changes.** If the file has been edited since the last sync, you'll see an error: "Cannot download — you have local changes. Sync first or discard your changes."
- This prevents you from accidentally losing unsaved work.

### 7. Link a Remote Spec (Optional)

You can attach a local file to an existing spec on mdspec without creating a new spec. That file becomes **linked** (read-only from your side): you can only **Download** to pull updates; you cannot **Sync** (upload).

- Expand **Remote Only** in the sidebar. It lists specs on mdspec that are not yet linked to a local file in this workspace.
- Click **Link to local file** on a spec. Enter the relative path for a new or existing file (e.g. `docs/specs/api.md`). The extension downloads the spec content into that file and tracks it as linked.
- Linked files show a link icon and **linked** in the sidebar, with **[Download]** and **[Unlink]** (no Sync).

### 8. Unlink a Spec (Optional)

For a **linked** file, click **Unlink (keep local file)**. This removes the link on the mdspec project (the spec stays on the server; only the “proxy” in your project is removed) and stops tracking the file as linked. Your local file is kept. You can link again from Remote Only if needed.

That's it. You're syncing.

---

## The Sidebar

```
mdspec
├── Project: my-org/product-docs
├── ☑ auth.md              [Download] [Sync]
├── ☑ api.md               [Download] [Sync]
├── ☐ notes.md
├── ☑ security.md          [Sync ●]
├── ☑ shared-spec.md       [Download] [Unlink]  linked
├── Remote Only  (2)
│   └── … (expand to see specs not yet linked locally)
└── Open in Web
```

| Element | Meaning |
|---------|---------|
| ☑ | File is tracked |
| ☐ | File is not tracked |
| [Sync] | Click to upload this file (only for non-linked files) |
| [Download] | Click to pull latest from mdspec |
| [Unlink] | Remove link, keep local file (only for linked files) |
| **linked** | File is linked to a remote spec — read-only; use Download only |
| ● | File has local changes — download blocked, sync available |
| **Remote Only** | Specs on mdspec that have no local file here; expand to **Link to local file** |
| Open in Web | Opens your mdspec project in the browser |

### Refresh

Click the **refresh** icon at the top of the sidebar to re-scan your workspace for `.md` files and recompute change indicators.

The sidebar also refreshes automatically when you save a `.md` file.

---

## Linked specs

A **linked spec** is a local file that mirrors an existing spec on mdspec. It is **read-only** from your workspace: you can only **Download** to get the latest content; **Sync** (upload) is not available. Linking is useful when the spec is owned in another project or you want to reuse it without creating a duplicate.

- **Create a link:** In the sidebar, expand **Remote Only**, then click **Link to local file** on the spec you want. Enter the local path; the file is created or overwritten and marked as linked.
- **Update a linked file:** Use **Download** to pull the latest revision from mdspec.
- **Remove the link:** Click **Unlink (keep local file)**. The link is removed on the server (for your project); the local file is kept. The spec remains on mdspec.

---

## Commands

All commands are available from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).

| Command | What it does |
|---------|-------------|
| `mdspec: Login` | Log in with your mdspec email and password |
| `mdspec: Logout` | Clear your stored session |
| `mdspec: Set Project` | Link this workspace to an mdspec org + project |
| `Refresh` | Re-scan workspace and update the sidebar |
| `Open in Web` | Open your mdspec project in the browser |
| `Link to local file` | (Sidebar: on a Remote Only spec) Create or overwrite a local file and track it as linked |
| `Unlink (keep local file)` | (Sidebar: on a linked file) Remove the link on the server, keep the local file |

Syncing, downloading, linking, and unlinking are done via the inline buttons in the sidebar (or the same commands from the Command Palette when the right item is selected).

---

## How Change Detection Works

The extension uses **SHA-256 hashing** to detect changes. It does not rely on timestamps.

When you sync a file, the extension saves a hash of the file content. On subsequent saves or refreshes, it compares the current hash with the saved one. If they differ, the file shows a **●** indicator in the sidebar.

This means:
- If you edit and save a file, the dot appears
- If you undo your edits so the content matches the last sync, the dot disappears
- Whitespace-only changes still count as changes

---

## Configuration

The extension stores its state in a config file at:

```
.mdspec/config.json
```

This file is created automatically in your workspace root. It contains:

- Your linked organization and project slugs
- Which files are tracked
- For each tracked file: slug, spec ID (when known), whether it is **linked** (read-only), and the last synced content hash

You generally don't need to edit this file manually. The extension manages it for you.

You may want to commit `.mdspec/config.json` to your repository so your team shares the same tracked file mappings.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mdspec.apiBaseUrl` | `https://mdspec.dev/api` | Base URL for the mdspec API |
| `mdspec.project` | _(empty)_ | mdspec project in `org-slug/project-slug` format |

To change settings, go to **Settings** (`Cmd+,` / `Ctrl+,`) and search for `mdspec`.

---

## What the Extension Does NOT Do

- It will never delete your local files
- It will never delete specs from the mdspec platform
- It will never auto-sync in the background
- It does not render markdown previews
- It does not show diffs
- It does not manage comments, users, or billing

---

## Troubleshooting

### "Not authenticated" error
Your session may have expired. Run `mdspec: Login` again.

### File not showing in sidebar
- Make sure it has a `.md` extension
- Make sure it's not inside `node_modules`, `.git`, `dist`, or `.mdspec`
- Click the **refresh** button in the sidebar
- If you set a `specRoot` in your config, the file must be under that folder

### "Cannot download — you have local changes"
Your local file has been modified since the last sync. Either sync (upload) your changes first, or revert the file to its last synced state, then try downloading again.

### Sync failed with 409 Conflict
A spec with the same slug already exists on mdspec. This can happen if two files generate the same slug. The spec name is derived from the first heading in the file (or the filename if there's no heading), so renaming and re-tracking will resolve this.

### Upload revision failed with 404 or "no spec"
If the same spec slug exists as both a source spec and a linked spec in another project, the server may not resolve the slug. The extension will try to resolve the correct spec automatically. If it still fails, click **Refresh** in the sidebar, then try **Sync** again. Ensure the file was originally created with **Sync** (first upload) so the correct spec ID is stored in `.mdspec/config.json`.

### Sync failed with network error
Check your internet connection and try again. The extension will show an error message with a description of what went wrong.

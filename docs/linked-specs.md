# Linked Specs Specification

## Overview
The **Linked Specs** feature allows a project to include a "read-only" link to a specification that originates from another project. This enables cross-project documentation sharing while maintaining a single source of truth. The linked spec automatically receives updated data as the source specification evolves.

## Key Characteristics
1. **Read-Only Destination**: A linked spec cannot be directly edited in the destination project. Users cannot upload new revisions or modify the content of a linked spec natively.
2. **Automatic Updates**: When the source spec is updated, the linked spec receives the updated data.
3. **Initial Creation**: When first linking a spec, a new spec record is created in the destination project that acts as a proxy/mirror of the source spec.
4. **Revision Pulling**: On each new revision in the source spec, the destination linked spec pulls the updated data from the target link.

## Proposed Data Model Changes
To support linked specs, the database schema will need to track the relationship between the destination proxy spec and the source spec.

### `specs` Table
We will need to add a reference to the source specification.
- **`source_spec_id`** (`uuid`, nullable): A foreign key referencing `specs(id)`. If this is populated, it indicates the spec is a linked spec.
- **`is_linked`** (`boolean`, default `false`): (Optional) A quick flag to identify linked specs, though `source_spec_id IS NOT NULL` might suffice.

### Behavior
- When a user views a linked spec in the destination project, the UI will clearly indicate that it is a linked, read-only specification.
- The "Edit" or "Upload Revision" buttons will be disabled or hidden.
- Revisions are synced from the source. This can be handled in two ways:
  1. **Mirroring Revisions**: Create identical `revisions` rows in the destination project whenever the source receives a new revision.
  2. **Direct Reads**: When querying revisions for a linked spec, the backend seamlessly fetches the revisions belonging to the `source_spec_id`. (This ensures no data duplication).

## Workflows

### 1. Creating a Link
- A user in **Project B** chooses to "Link Existing Spec".
- They select a spec from **Project A** (which they have read access to) or provide a link.
- The system creates a new spec in **Project B** with `source_spec_id` pointing to the spec in **Project A**.

### 2. Pulling Revisions (Direct Reads)
- Whenever **Project A**'s spec receives a new revision, **Project B**'s linked spec should seamlessly reflect this.
- The backend and UI pull the latest revisions directly from the source spec (`source_spec_id`).
- No revision mirroring is performed, preventing data duplication and out-of-sync issues.
- The linked spec acts purely as a proxy to the source spec's content and revisions.

## UI / UX Considerations
- **Visual Indication**: Linked specs in the dashboard should have a "🔗 Linked" badge or icon.
- **Disabled Actions**: The spec viewer should disable editing, archiving, or resolving comments (unless comments are local to the destination project).
- **Source Link**: The UI should provide a way to navigate back to the original source project/spec, provided the user has permissions to view it.

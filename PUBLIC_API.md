# Public API Documentation

This API allows external tools and scripts to interact with mdspec.

## Authentication

All endpoints (except login) require a **Bearer Token**.
Pass the token in the `Authorization` header:
```
Authorization: Bearer <your_access_token>
```

---

## Endpoints

### 1. Login
Authenticate specifically for API usage to get an access token.

- **URL**: `/api/public/auth/login`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | User's registered email |
| `password` | string | Yes | User's password |

#### Response (200 OK)
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token_string",
    "refresh_token": "refresh_token_string",
    "expires_in": 3600,
    "token_type": "bearer"
  }
}
```

---

### 2. Refresh Token
Get a new access token using a refresh token.

- **URL**: `/api/public/auth/refresh`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `refresh_token` | string | Yes | The refresh token obtained from login |

#### Response (200 OK)
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "new_jwt_token_string",
    "refresh_token": "new_refresh_token_string",
    "expires_in": 3600,
    "token_type": "bearer"
  }
}
```

---

### 3. List Specs
Get a list of all specifications visible to the authenticated user.

- **URL**: `/api/public/specs`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

#### Response (200 OK)
```json
{
  "specs": [
    {
      "id": "uuid",
      "name": "Spec Name",
      "slug": "spec-slug",
      "updated_at": "2024-01-01T00:00:00Z",
      "project_id": "uuid",
      "latest_revision": {
        "revision_number": 2,
        "content_hash": "sha256_hash_string",
        "created_at": "2024-01-02T00:00:00Z"
      }
    }
  ]
}
```

---

### 4. Get Spec (Download)
Retrieve a specific specification by its slug, including its full markdown content.

- **URL**: `/api/public/specs/[slug]`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

#### Response (200 OK)
```json
{
  "spec": {
    "id": "uuid",
    "name": "Spec Name",
    "slug": "spec-slug",
    "updated_at": "2024-01-01T00:00:00Z",
    "project_id": "uuid",
    "latest_revision": {
      "revision_number": 5,
      "content_hash": "sha256_hash",
      "created_at": "2024-01-05T00:00:00Z"
    }
  },
  "content": "# Full Markdown Content\n\nThis is the latest content of the spec."
}
```

#### Errors
- `404 Not Found`: If the spec does not exist or user does not have access.

---

### 5. Create Spec
Create a new specification.

- **URL**: `/api/public/specs`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Title of the specification |
| `content` | string | Yes | Initial markdown content |
| `file_name` | string | No | Original file name (e.g., README.md) |
| `project_slug` | string | No | **Recommended**. The slug of the project to create the spec in. |
| `org_slug` | string | No | **Recommended**. The slug of the organization the project belongs to. Used to resolve ambiguous project slugs. |
| `project_id` | string | No | **Legacy**. The UUID of the project. If provided, takes precedence over slugs. |
| `slug` | string | No | Custom URL slug for the spec. Auto-generated from name if omitted. |

#### Response (200 OK)
```json
{
  "success": true,
  "spec": {
    "id": "uuid",
    "slug": "generated-slug",
    "name": "Spec Name",
    "latest_revision_number": 1
  }
}
```

> **Note:** If neither `project_id` nor `project_slug` is provided, the API attempts to assign the spec to the user's first available project. Behavior is undefined if the user has multiple projects but no default context.

#### Errors
- `409 Conflict`: If the provided or generated slug already exists.

---

### 6. Upload Revision
Upload a new version of content for an existing specification.

- **URL**: `/api/public/specs/[slug]/revisions`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | Full markdown content of the new revision |
| `summary` | string | No | Optional change summary/message |

#### Response (200 OK)
```json
{
  "success": true,
  "revision": {
    "revision_number": 3,
    "content_hash": "sha256_hash_string",
    "created_at": "2024-01-03T00:00:00Z"
  }
}
```

#### Deduplication
If the uploaded `content` is identical to the latest revision (based on SHA-256 hash), a new revision is **not** created.
**Response (200 OK - Deduplicated):**
```json
{
  "message": "Content identical to latest revision",
  "revision_number": 3
}
```

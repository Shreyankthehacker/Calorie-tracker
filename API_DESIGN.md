# API Design

Base URL:

```text
/api/v1
```

---

# Authentication

Authentication is foundational infrastructure.

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Protected endpoints derive identity from the access token (or equivalent auth mechanism).

Never accept a client-supplied `userId` as the owner of a resource when an authenticated identity is available.

Auth endpoints should be rate-limited.

---

# Goals

Goal is a **1:1** resource: the authenticated user's current active nutrition goal.

v1 does not implement goal history.

```text
GET    /goals
PUT    /goals
POST   /goals
DELETE /goals
```

Semantics:

- `GET /goals` — return the current user's goal, or 404 if none exists
- `POST /goals` — create the current goal (409 if one already exists)
- `PUT /goals` — create-or-replace / update the current goal
- `DELETE /goals` — remove the current goal

Alternative acceptable shape during implementation: `PUT /goals` as upsert only, without separate `POST`, as long as 1:1 semantics and ownership are preserved.

Do not expose multi-goal list pagination in v1.

Goals belong exclusively to the authenticated user.

---

# Food Entries

```text
POST   /food-entries
GET    /food-entries
GET    /food-entries/:id
PUT    /food-entries/:id
DELETE /food-entries/:id
```

## Create / update body (conceptual)

Must support:

- mealType
- foodName
- quantity
- quantityUnit
- calories (kcal, non-negative)
- protein (grams, non-negative)
- carbs (grams, non-negative)
- fat (grams, non-negative)
- consumedAt
- micronutrients[]: `{ nutrientKey, amount, unit }`

## List filters

```text
startDate
endDate
mealType
page
pageSize
```

`startDate` and `endDate` filter on **`consumedAt`**, not `createdAt`.

## Pagination

Offset pagination:

- `page` (1-based)
- `pageSize`
- maximum `pageSize` = **50**
- default ordering: **`consumedAt DESC`**

Example:

```text
GET /food-entries?startDate=2026-09-01&endDate=2026-09-07&mealType=DINNER&page=1&pageSize=20
```

Ownership: every read/update/delete by id must verify the entry belongs to the authenticated user.

---

# Reports

```text
GET /reports/calories
GET /reports/macros
GET /reports/micros
GET /reports/goals
```

Reports support a time range, for example:

```text
GET /reports/calories?startDate=2026-09-01&endDate=2026-09-07
```

Rules:

- Aggregate persisted food entries at request time
- Bucket days using `consumedAt` in the **user's configured timezone**
- Compare against the user's current goal for goal-vs-actual
- Return aggregate series suitable for charts
- **Do not paginate** report responses

Required report coverage:

- weekly calorie trend
- macro breakdown
- micronutrient summary
- goal vs actual

---

# AI Nutrition Extraction

```text
POST /ai/nutrition-extract
```

Input:

```text
multipart/form-data
image=<file>
```

Flow:

```text
upload → MIME/size validation → AIExtractionService → Zod validation
  → structured payload for frontend review → user saves via POST /food-entries
```

Rules:

- Must **not** automatically create a `FoodEntry`
- Validate MIME type and file size
- Validate AI response structure with Zod
- Validate nutritional value ranges
- Rate-limit this endpoint
- Provider is abstracted; tests mock the AI provider

Response contains structured nutrition information intended to pre-fill a food entry form.

---

# Common API Response Pattern

Successful list response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {}
  }
}
```

Internal errors must return a generic 500 body without stack traces.

---

# HTTP Status Codes

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

---

# API Rules

- Validate every request with Zod.
- Authenticate protected endpoints.
- Enforce resource ownership server-side.
- Paginate food entry list endpoints (max page size 50).
- Scope all user-owned queries to the authenticated user.
- Never expose password hashes, tokens, or sensitive internals.
- Return consistent error structures.
- Keep handlers thin; no Prisma in routes/handlers.

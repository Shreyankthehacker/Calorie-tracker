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

Protected endpoints derive identity from the access token. Never accept a client-supplied `userId` as the owner of a resource.

Auth endpoints (register, login, refresh, logout) are rate-limited (`AUTH_RATE_LIMIT_MAX`, default 20 requests / 60s). `/auth/me` requires a Bearer access token.

Request bodies:

```text
POST /auth/register  { email, password, timezone? }   → 201 { user, accessToken, refreshToken }
POST /auth/login     { email, password }              → 200 { user, accessToken, refreshToken }
POST /auth/refresh   { refreshToken }                 → 200 { accessToken, refreshToken }
POST /auth/logout    { refreshToken }                 → 204
GET  /auth/me                                         → 200 { user }
```

`timezone` is an IANA name (default `UTC`). Duplicate email returns `409 CONFLICT`. Invalid credentials and reused/revoked refresh tokens return `401 UNAUTHORIZED`. Access tokens are short-lived JWTs (default `15m`). Refresh tokens are rotated on use and stored hashed.

CORS: browsers may call these endpoints only from origins listed in `CORS_ORIGIN` (comma-separated). `*` is not allowed.

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

Reports are derived at request time from persisted `FoodEntry` rows. There is no `Report` table, cache, or materialized total.

```text
GET /reports/today
GET /reports/calories?startDate=&endDate=
GET /reports/macros?startDate=&endDate=
GET /reports/micros?startDate=&endDate=
GET /reports/micronutrients?startDate=&endDate=   (alias of /micros)
GET /reports/goals?startDate=&endDate=
GET /reports/goal-vs-actual?startDate=&endDate=   (alias of /goals)
```

Example:

```text
GET /reports/calories?startDate=2026-09-01&endDate=2026-09-07
```

Daily vs weekly support uses the same endpoints: pass a 1-day range for today, or a week (Monday–Sunday) for weekly charts. Calorie and macro responses include per-day `data` (zero-filled) plus period `totals`. Goal-vs-actual scales the current daily goal by the inclusive day count.

Query:

- `startDate` / `endDate`: required `YYYY-MM-DD` calendar dates (except `/reports/today`)
- Inclusive range; maximum **93** days
- Missing dates, inverted ranges, and oversized ranges return `400`
- Client `userId` and client timezone parameters are ignored; owner and timezone come from the authenticated user

Timezone:

- Calendar days are computed from `FoodEntry.consumedAt` in `User.timezone` (IANA, default `UTC`)
- Example: `2026-09-12T23:30:00Z` for `Asia/Kolkata` belongs to **2026-09-13**, not 2026-09-12

`GET /reports/today` uses the current instant in the user's timezone and is **not** paginated. It is the source of dashboard daily totals (do not sum a food-entry list page).

Rules:

- Aggregate persisted food entries at request time in the database
- Bucket days using `consumedAt` in the **user's configured timezone**
- Days with no entries are returned as zeros so charts stay continuous
- Micronutrients are grouped by `nutrientKey` **and** `unit` (never mix units)
- Compare against the user's **current** goal only; `goal` is `null` when none exists
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

Authenticated. Rate-limited separately from auth (`AI_RATE_LIMIT_MAX`, default 10 requests / 60s).

Input:

```text
multipart/form-data
image=<file>
```

Supported types: `image/jpeg`, `image/png`, `image/webp`. Maximum size: **5MB**. Images are processed in memory and discarded; they are not stored.

The vision provider is Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL`, default `gemini-2.5-flash`), behind `NutritionExtractionProvider`. Tests inject a mock provider. The browser never calls Gemini.

Flow:

```text
upload → MIME/size/magic-byte validation → AIExtractionService → provider
  → Zod validation → structured payload for frontend review → user saves via POST /food-entries
```

Example success:

```json
{
  "extraction": {
    "foodName": "Chicken rice bowl",
    "quantity": 1,
    "quantityUnit": "serving",
    "calories": 620,
    "protein": 42,
    "carbs": 65,
    "fat": 18,
    "micronutrients": [{ "nutrientKey": "iron", "amount": 3.2, "unit": "mg" }],
    "confidence": 0.87,
    "notes": "Estimated from visible nutrition information.",
    "source": "label",
    "mealType": null
  }
}
```

`source` is `label`, `photo_estimate`, or `unknown`. `mealType` is an optional suggestion only.

Rules:

- Must **not** automatically create a `FoodEntry`
- Negative calories/macros/micros and invalid structures are rejected (not clamped)
- If the model reports `detected: false`, respond `422` with no invented values
- Provider timeout: `504` / `AI_PROVIDER_ERROR`
- Provider failure: `502` / `AI_PROVIDER_ERROR` (no raw provider payload)
- Oversized upload: `413` / `PAYLOAD_TOO_LARGE`
- Unsupported or mismatched image type: `415` / `UNSUPPORTED_MEDIA_TYPE`
- Validate AI response structure with Zod
- Rate-limit this endpoint
- User must explicitly confirm via `POST /food-entries` after review/edit

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

Unknown routes return `404` with `code: "NOT_FOUND"`.

Unexpected failures return a generic 500 body with **no** stack traces, Prisma messages, Gemini payloads, or secrets:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

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
413 Payload Too Large
415 Unsupported Media Type
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
504 Gateway Timeout
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

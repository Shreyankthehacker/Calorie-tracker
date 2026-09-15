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

`timezone` is an IANA name (default `UTC`). Duplicate email returns `409 CONFLICT`. Invalid credentials and reused/revoked refresh tokens return `401 UNAUTHORIZED`. Access tokens are short-lived JWTs (default `15m`). Refresh tokens last 30 days by default (`JWT_REFRESH_EXPIRES_IN`), are rotated on use, and stored hashed. The browser keeps the session in `localStorage` so other tabs stay signed in.

CORS: browsers may call these endpoints from `http://localhost:5173`, `https://calorie-tracker-frontend-tau.vercel.app`, and any extra origins listed in `CORS_ORIGIN` (comma-separated). `*` is not allowed.

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
GET    /food-entries/recents
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

## Recent foods

```text
GET /food-entries/recents?limit=12
```

Authenticated. Returns distinct foods the **authenticated user** has logged, newest last-eaten first. `limit` is 1–20 (default 12). This is not a paginated entry list: each row is a template from the most recent snapshot of that food name.

```json
{
  "data": [
    {
      "foodName": "Overnight oats",
      "mealType": "BREAKFAST",
      "quantity": 1,
      "quantityUnit": "bowl",
      "calories": 340,
      "protein": 12,
      "carbs": 54,
      "fat": 6,
      "micronutrients": [],
      "lastConsumedAt": "2026-09-11T08:00:00.000Z",
      "timesLogged": 2
    }
  ]
}
```

Another user's foods are never included. Empty history returns `{ "data": [] }`.

---

# Food Catalog

Reusable nutrition records. Meal logging copies scaled values into a normal `FoodEntry`. Catalog edits do **not** rewrite past entries. There is no live foreign key from `FoodEntry` to `FoodItem`.

```text
GET  /food-items
GET  /food-items/:id
POST /food-items/:id/entries
```

Authenticated. Identity for `POST .../entries` comes from the access token. The catalog itself is shared system data (seeded `SYSTEM` foods).

## List filters

```text
mealType
q
page
pageSize
```

- `mealType` filters foods tagged for that meal (a food can have several tags, e.g. banana → BREAKFAST and SNACKS)
- `q` is a case-insensitive name search
- offset pagination: `page` (1-based), `pageSize`, maximum `pageSize` = **50**, default order `name ASC`

`GET /food-items/:id` → `200 { foodItem }` or `404`.

## Log from catalog

```json
POST /food-items/:id/entries
{
  "quantity": 3,
  "mealType": "BREAKFAST",
  "consumedAt": "2026-09-13T08:00:00.000Z"
}
```

The server computes `factor = quantity / servingSize`, scales calories, macros, and micronutrients, and creates a `FoodEntry` through `FoodEntryService.create`.

`201 { foodEntry }` — same shape as `POST /food-entries`.

Unknown catalog id: `404`. Quantity must be positive. Unauthenticated: `401`.

Meal type on the entry is **when the user ate it**. Catalog meal tags are only for browsing.

PDF import and conversational AI do **not** match against this catalog yet. Chat `searchFood` still uses the in-memory estimate provider.

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
GET /reports/insights?startDate=&endDate=
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

`GET /reports/insights` is request-time too. It returns period averages (inclusive day count, including empty days), `daysTracked` (calories > 0), `daysOnTarget` / `daysOver` versus the current daily calorie goal, and `currentStreak` (consecutive tracked days ending today, or yesterday if today is still empty). Streak lookback is 90 days and is independent of the requested range. `dailyGoal` is `null` when the user has no goal; on-target counts are then 0.

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

# Conversational AI

```text
POST /ai/chat
POST /ai/chat/confirm-meal
```

Authenticated. Rate-limited with the same AI budget as extraction (`AI_RATE_LIMIT_MAX`, default 10 requests / 60s). Identity comes from the access token. Requests must not include a `userId`. Chat is stateless (no chat-history tables). Optional `history` is accepted only for the current request.

The LLM is reached through `LlmProvider` (Gemini in production, a mock in tests). **The LLM never accesses the database directly.** It may only request allowlisted application tools, whose arguments are Zod-validated before existing services run:

| Tool | Mutates data | Service |
| --- | --- | --- |
| `getGoals` | no | `GoalService` |
| `getNutritionSummary` | no | `ReportService` |
| `getWeeklyReport` | no | `ReportService` |
| `listMeals` | no | `FoodEntryService.list` |
| `searchFood` | no | `FoodSearchProvider` (`PrismaFoodSearchProvider` over `FoodItem`; tests may inject a mock) |
| `logMeal` | no in the chat loop | Validated proposal only; persist via confirm-meal → `FoodEntryService` |

`POST /ai/chat` request:

```json
{
  "message": "How many calories have I eaten today?",
  "history": [{ "role": "user", "content": "Hi" }]
}
```

`message` is required, 1–4000 characters. `history` is optional, max 20 items.

Success:

```json
{
  "message": "You've consumed 1033 kcal today.",
  "pendingMeal": null
}
```

When the model proposes `logMeal`, `pendingMeal` contains the validated entry fields (no `userId`). No `FoodEntry` is created. The frontend must show Save meal / Cancel. Typing "yes" in chat does not persist.

`POST /ai/chat/confirm-meal` persists that payload for the authenticated user and returns `201`:

```json
{
  "message": "Saved 2 eggs to breakfast.",
  "foodEntry": {}
}
```

Rules:

- Unknown tools are rejected and never executed
- Tool loop max is 5 rounds (`502` / `AI_PROVIDER_ERROR` if exceeded)
- Provider timeout: `504` / `AI_PROVIDER_ERROR`
- Provider failure: `502` / `AI_PROVIDER_ERROR` (no raw provider payload)
- Negative calories/macros/quantities and invalid dates/meal types are rejected
- `searchFood` results are catalog estimates (`source: catalog_estimate`) from the `FoodItem` table, not an authoritative laboratory database
- Do not return raw Gemini payloads

---

# PDF Food Diary Import

```text
POST /imports/food-diary/preview
POST /imports/food-diary/confirm
```

Authenticated. Identity comes from the access token. Requests must not include a `userId`.

## Preview

Multipart field `file`. Rate-limited (`PDF_RATE_LIMIT_MAX`, default 10 requests / 60s). Maximum upload `PDF_MAX_UPLOAD_BYTES` (default 5MB). Declared MIME must be `application/pdf`, filename must end in `.pdf`, and the buffer must start with `%PDF-`.

Preview extracts positioned text with `pdfjs-dist`, reconstructs rows/columns, and returns candidate meals. It does **not** create `FoodEntry` rows. Temporary record ids look like `preview-1` and are not database ids.

Success `200`:

```json
{
  "filename": "food-diary.pdf",
  "pageCount": 1,
  "records": [
    {
      "id": "preview-1",
      "foodName": "Oatmeal",
      "quantity": 1,
      "quantityUnit": "bowl",
      "mealType": "BREAKFAST",
      "consumedAt": "2026-09-13T08:00:00.000Z",
      "calories": 320,
      "protein": 12,
      "carbs": 52,
      "fat": 8,
      "micronutrients": [],
      "status": "valid",
      "confidence": 0.95,
      "issues": [],
      "layout": "table",
      "duplicate": false
    }
  ],
  "warnings": []
}
```

`status` is `valid`, `warning`, or `unparsed`. Missing calories/macros stay `null`. Scanned/empty PDFs return `200` with no records and a `NO_TEXT` warning. Unsupported layouts return `NO_RECORDS`. Possible duplicates of existing meals set `duplicate: true`.

Errors:

- Unauthenticated: `401`
- Missing file: `400`
- Oversized: `413` / `PAYLOAD_TOO_LARGE`
- Wrong type / non-PDF magic bytes: `415` / `UNSUPPORTED_MEDIA_TYPE`
- Malformed PDF / too many pages / too much text: `400` / `VALIDATION_ERROR` (no parser stack traces)
- Rate limit: `429`

## Confirm

JSON body. Not on the PDF preview rate limiter. Maximum 100 records. Each record is validated with the existing food-entry create schema (no client `userId`).

```json
{
  "records": [
    {
      "foodName": "Oatmeal",
      "quantity": 1,
      "quantityUnit": "bowl",
      "mealType": "BREAKFAST",
      "consumedAt": "2026-09-13T08:00:00.000Z",
      "calories": 320,
      "protein": 12,
      "carbs": 52,
      "fat": 8,
      "micronutrients": []
    }
  ]
}
```

Success `201`:

```json
{
  "importedCount": 1,
  "foodEntries": []
}
```

`foodEntries` is the created public food-entry list. Import is transactional: all records succeed or none are written. Ownership is always the authenticated user.

Invalid records: `400` / `VALIDATION_ERROR` with no partial insert.

---

# Barcode Product Lookup

```text
POST /barcode/lookup
```

Authenticated. Rate-limited with the same budget as AI extraction (`AI_RATE_LIMIT_MAX`). Identity comes from the access token. This is **not** image/vision extraction.

Flow:

```text
barcode digits → BarcodeLookupService → BarcodeLookupProvider → Zod-validated product → user review → POST /food-entries
```

Production provider: Open Food Facts (`OpenFoodFactsBarcodeProvider`). Tests inject a mock provider. Nutrition is returned per **100 g** as the scaling base (`quantity: 100`, `quantityUnit: "g"`).

Request:

```json
{ "barcode": "3017620422003" }
```

`barcode` must be 6–14 digits.

Success `200`:

```json
{
  "product": {
    "barcode": "3017620422003",
    "name": "Nutella",
    "brand": "Ferrero",
    "quantity": 100,
    "quantityUnit": "g",
    "calories": 539,
    "protein": 6.3,
    "carbs": 57.5,
    "fat": 30.9,
    "micronutrients": [{ "nutrientKey": "sodium", "amount": 107, "unit": "mg" }],
    "imageUrl": null,
    "source": "open_food_facts"
  }
}
```

The lookup must **not** create a `FoodEntry`. Unknown barcodes: `404` / `NOT_FOUND`. Provider timeout: `504` / `BARCODE_PROVIDER_ERROR`. Provider failure: `502` / `BARCODE_PROVIDER_ERROR`.

---

# Family

Family membership is an extra relationship layer. Food entries stay owned by `userId`.

```text
GET    /family
POST   /family
POST   /family/join
POST   /family/leave
```

Authenticated. Identity comes from the access token.

`GET /family` returns `{ "family": null }` when the user has not joined a family.

`POST /family` creates a family (optional `{ "name" }`, default `Household`), assigns the current user, and returns `201`. Creating a second family while already a member is `409` / `CONFLICT`.

`POST /family/join` body `{ "familyId" }` attaches the current user to that family. Unknown id: `404`. Already in a family: `409`.

`POST /family/leave` returns `204`. The family row is deleted when the last member leaves.

Member profiles include `id`, `email`, `timezone`, `createdAt`, `isCurrentUser`, and `todayCalories` (that member's entries for their timezone's current calendar day). Other members' full food-entry lists are not returned.

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

# Architecture

## 1. High-Level Architecture

```text
┌───────────────────────────────┐
│          React App            │
│   TypeScript + Vite           │
│   TanStack Query + Recharts   │
└───────────────┬───────────────┘
                │
                │ HTTPS / REST
                ▼
┌───────────────────────────────┐
│       Node.js Backend         │
│       TypeScript + Fastify    │
│                               │
│  Routes                       │
│     ↓                         │
│  Handlers                     │
│     ↓                         │
│  Services                     │
│     ↓                         │
│  Repositories                 │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       Neon PostgreSQL         │
│           + Prisma            │
└───────────────────────────────┘

                │
                ▼
        ┌────────────────────┐
        │ AIExtractionService│
        │ ChatService        │
        │  (provider + tools)
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ Gemini (or test mock)
        │ Application tools only
        └────────────────────┘
```

---

# 2. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Recharts

## Backend

- Node.js
- TypeScript
- Fastify
- Zod
- Prisma
- pdfjs-dist (PDF text extraction with coordinates; used only for food-diary import)

## Database

- PostgreSQL hosted on Neon
- Prisma ORM

## Testing

- Vitest
- Fastify inject / API tests

## AI

- Gemini, used only on the backend behind `NutritionExtractionProvider` / `AIExtractionService` and `LlmProvider` / `ChatService` abstractions
- Tests inject mock providers and must not call Gemini

## Explicitly out of scope for the stack

Do not introduce Express, NestJS, FastAPI, GraphQL, Redis, or other unnecessary infrastructure.

---

# 3. Backend Architecture

```text
HTTP Request
     ↓
Route
     ↓
Validation (Zod)
     ↓
Handler
     ↓
Service
     ↓
Repository
     ↓
Prisma
     ↓
Neon PostgreSQL
```

### Routes

Responsible for:

- defining endpoints
- authentication hooks
- wiring request validation
- delegating to handlers

### Handlers

Thin request/response adapters.

Responsible for:

- reading validated input
- calling a single service method
- mapping results to HTTP responses

Handlers must remain thin.

Routes and handlers must **not** contain Prisma queries.

### Services

Responsible for business logic.

Examples:

```text
AuthService
GoalService
FoodEntryService
FoodItemService
NutritionReportService
AIExtractionService
```

### Repositories

Responsible for database access only.

Examples:

```text
UserRepository
GoalRepository
FoodEntryRepository
FoodItemRepository
```

Centralized error handling in `registerErrorHandler` maps `AppError`, Zod failures, Fastify client errors, and unknown exceptions to `{ error: { code, message } }`. Unexpected errors are logged and returned as a generic `INTERNAL_SERVER_ERROR`.

---

# 4. Frontend Architecture

```text
Pages
 ↓
Feature Components
 ↓
Hooks
 ↓
API Client
 ↓
Backend API
```

Frontend must not contain database logic.

Charts (Recharts) consume report API aggregate series.

---

# 5. Database Design

## Entities and relationships

```text
User
  │
  ├── Goal                 (1:1 — current active goal only)
  │
  └── FoodEntry            (1:many — what the user ate; nutrition is a snapshot)
          │
          └── FoodEntryNutrient   (1:many)

FoodItem                   (shared catalog; not user-owned)
  │
  ├── FoodItemMealType     (many meal tags: BREAKFAST / LUNCH / DINNER / SNACKS)
  └── FoodItemNutrient     (1:many)
```

v1 does **not** implement goal history.

Do **not** create Family / FamilyMember / FamilyInvitation / FamilyPermission / `familyId` tables or columns in v1.

`FoodEntry` does **not** foreign-key to `FoodItem`. Logging from the catalog copies scaled nutrition into the entry so later catalog edits cannot rewrite history.

## Schema

```text
users
-----
id
email                  (unique)
password_hash
timezone               (IANA timezone string; sensible default e.g. UTC)
created_at
updated_at


goals
-----
id
user_id               (unique — enforces 1:1 with User)
daily_calorie_target
protein_target
carb_target
fat_target
weight_goal
created_at
updated_at


food_entries
------------
id
user_id
meal_type              (BREAKFAST | LUNCH | DINNER | SNACKS)
food_name
quantity
quantity_unit
calories
protein
carbs
fat
consumed_at            (when the meal was eaten — source of truth for reports)
created_at             (audit only)
updated_at


food_entry_nutrients
--------------------
id
food_entry_id
nutrient_key           (canonical key, e.g. vitamin_c, iron, sodium)
amount
unit


food_items
----------
id
name
category               (optional food kind: fruit, grain, protein, … — not meal type)
serving_size
serving_unit
calories
protein
carbs
fat
image_url              (URL only; never store image bytes in PostgreSQL)
source_type            (SYSTEM | USDA | USER | PDF | AI; v1 seed is SYSTEM)
source_reference
verified
created_at
updated_at


food_item_meal_types
--------------------
food_item_id
meal_type              (composite primary key with food_item_id)


food_item_nutrients
-------------------
id
food_item_id
nutrient_key
amount
unit
```

Recommended indexes:

- `food_entries (user_id, consumed_at)`
- `food_entry_nutrients (food_entry_id)`
- `food_items (name)`
- `food_items (source_type, name)` unique
- `food_item_nutrients (food_item_id)`

---

# 6. Food Entry Time

`consumedAt` is the source of truth for all nutrition, date filtering, and reporting logic.

`createdAt` is only the database audit timestamp for when the row was inserted.

Example:

A meal eaten at 8 AM but logged at 2 PM must appear in the 8 AM day's nutrition report (in the user's timezone).

Date filters on list APIs (`startDate`, `endDate`) apply to `consumedAt`, not `createdAt`.

---

# 7. Nutrition Units and Validation

Conventions:

| Field | Unit |
|-------|------|
| calories | kcal |
| protein | grams |
| carbohydrates (carbs) | grams |
| fat | grams |
| micronutrients | amount + explicit unit |
| quantity | numeric amount + `quantityUnit` |

Validation:

- calories and macro values must be non-negative
- micronutrient amounts should be non-negative where present
- use canonical `nutrientKey` values rather than arbitrary free-text names where practical

Micronutrients remain a flexible child table (EAV-style) rather than a wide fixed column set.

---

# 8. Timezone

Daily reports must aggregate food entries according to the user's configured timezone.

- `User.timezone` stores an IANA timezone identifier (for example `America/New_York`).
- Default: `UTC` (or another documented sensible default at implementation time).
- Calendar-day boundaries for reports are computed in that timezone using `consumedAt`.

This assumption is mandatory for correct weekly calorie trends and goal-vs-actual comparisons.

---

# 9. Data Ownership

Every user-owned resource has an ownership relationship:

```text
goals.user_id        → users.id   (1:1)
food_entries.user_id → users.id   (1:many)
```

The backend must always enforce ownership.

Every user-owned database query must be scoped using the authenticated user's identity.

Never trust a `userId` supplied by the frontend.

The frontend must never be trusted to enforce access control.

---

# 10. Authentication

Authentication is **foundational infrastructure** for this application, even though multi-user support is listed as a bonus in the product requirements.

Implement:

- registration
- login
- refresh
- logout
- current-user (`/auth/me`)

Mechanisms:

- password hashing
- short-lived access JWT
- refresh token mechanism with secure handling (for example hashed refresh tokens at rest, rotation on use)
- authenticated identity derived only from the auth mechanism

Services operate on the authenticated user identity resolved at the backend boundary.

---

# 11. Reporting

Reports aggregate persisted `FoodEntry` data **at request time** for v1.

Do not introduce caching or materialized daily totals in v1.

Required reports:

- weekly calorie intake trend
- macronutrient breakdown
- micronutrient summary
- goal vs actual

Pipeline:

```text
Food Entries (scoped to user)
     ↓
Filter / bucket by consumedAt in user timezone
     ↓
Aggregate nutrition
     ↓
Compare against current Goal (when applicable)
     ↓
Report API
     ↓
Charts (Recharts)
```

Reports return aggregate series and do **not** use list pagination.

---

# 12. AI Extraction

```text
Image upload
     ↓
File validation (MIME type, file size)
     ↓
AIExtractionService (provider abstraction)
     ↓
Structured AI response
     ↓
Zod validation (+ nutritional value range checks)
     ↓
Frontend review / edit
     ↓
FoodEntry creation API
     ↓
Database
```

Rules:

- The AI extraction endpoint must **not** automatically create a `FoodEntry`.
- AI output is never treated as authoritative.
- Validate MIME type, file size, magic bytes, AI response structure, and nutritional value ranges.
- Gemini credentials (`GEMINI_API_KEY`) are loaded only on the backend.
- Provider implementations are swappable behind `NutritionExtractionProvider`.
- Mock the AI provider in automated tests; tests must not call Gemini.
- Images are processed in memory and are not persisted.

---

# 12b. Conversational AI

```text
Frontend
     ↓
POST /api/v1/ai/chat
     ↓
Chat Handler
     ↓
Chat Service / agent orchestrator
     ↓
LLM Provider (Gemini or test mock)
     ↓
Allowlisted application tools
     ↓
Existing Goal / Report / FoodEntry services
     ↓
Repositories
     ↓
Prisma
     ↓
PostgreSQL
```

**The LLM never accesses the database directly.** It never receives `DATABASE_URL`, Prisma, SQL, or arbitrary repository methods. It may only request these allowlisted tools:

- `getGoals` — read current **daily** calorie/macro targets (no mutation)
- `getNutritionSummary` — aggregated intake vs daily and period targets (no mutation)
- `getWeeklyReport` — Monday–Sunday aggregates with labeled kcal/gram fields (no mutation)
- `listMeals` — logged food entries for a date range or `today`/`week` (no mutation)
- `searchFood` — in-app catalog estimates behind `FoodSearchProvider` (no mutation)
- `logMeal` — propose a food entry; the chat loop does **not** persist it

Tool arguments are Zod-validated before execution. Owner identity always comes from the JWT `sub`. Tool names are allowlisted; unknown tools are rejected. The orchestrator stops after `CHAT_MAX_TOOL_ROUNDS` (5).

Meal confirmation is enforced at the application layer:

1. A `logMeal` tool call is validated and returned as `pendingMeal`.
2. No `FoodEntry` is created.
3. The client shows Save meal / Cancel.
4. Only `POST /api/v1/ai/chat/confirm-meal` (authenticated) calls `FoodEntryService.create`.

`searchFood` uses a `FoodSearchProvider` abstraction. The current implementation is an in-memory `CatalogFoodSearchProvider` of labeled estimates (`source: catalog_estimate`), not a laboratory food database. A real provider can replace it later.

Chat is stateless: no chat-history tables. Optional `history` may be sent on the request. Gemini credentials stay on the backend. Tests inject a mock `LlmProvider` and must not call Gemini.

---

# 12c. PDF Food Diary Import

PDF import is a post-core bonus. Parsing is deterministic and structure-aware. Preview never writes `FoodEntry` rows. Confirmation uses the existing `FoodEntryService` / repository path. Bulk confirm writes entries and nutrients in two batched `createMany` statements inside a Prisma transaction (60s timeout) so Neon round-trips do not expire the default 5s interactive transaction.

```text
PDF upload
     ↓
MIME + extension + magic-bytes (`%PDF-`) + size validation
     ↓
PdfExtractor (pdfjs-dist positioned text)
     ↓
Normalize text blocks (keep x/y/page)
     ↓
Row reconstruction (Y proximity, then X reading order)
     ↓
Column detection from header aliases / X positions
     ↓
Deterministic food-diary parser (table, then line/mixed)
     ↓
Zod on confirm (reuse FoodEntry create schema)
     ↓
Confidence + warnings + duplicate flags
     ↓
Preview (temporary preview-* ids)
     ↓
User edits / removes / unchecks
     ↓
POST confirm → FoodEntryService.createMany
     ↓
PostgreSQL
```

Library: `pdfjs-dist` 4.x. Each text item exposes `transform[4]`/`[5]` as x/y in PDF user space (origin bottom-left). Rows use a 4-point Y tolerance. Columns are not hardcoded to a single X; they are inferred from header cell centers plus a column tolerance.

Supported layouts (practical, not universal):

- Tabular diaries with Date / Meal / Food / Qty / Calories / Protein / Carbs / Fat headers (aliases such as kcal, Energy, Prot., CHO, Total Fat)
- Line-oriented diaries (date and meal headings, then food name + nutrition lines)
- Mixed dash/pipe lines (`Oatmeal - 1 bowl - 320 kcal - 12g protein`)

Limitations:

- Scanned/image-only PDFs are not supported (no OCR)
- Arbitrary document layouts are not claimed; unsupported text yields warnings and no invented meals
- Missing calories/macros stay `null` and must be filled before confirm
- AI/LLM assistance is **not** enabled for PDF import
- PDFs are processed in memory and discarded; there is no PDF storage table

Duplicates: preview compares food name (case-insensitive), meal type, quantity, rounded calories, and `consumedAt`. Matches are marked `duplicate` and excluded from import until the user checks them. No uniqueness constraint was added to `FoodEntry`.

---

# 12d. Food Catalog

The catalog is a shared `FoodItem` table, not separate breakfast/lunch/dinner tables. Meal type (when eaten) and food category (fruit, grain, protein) are different fields. A food can be tagged for several meals through `FoodItemMealType`.

```text
GET /food-items  (filter by mealType / q)
     ↓
User selects a food and quantity
     ↓
POST /food-items/:id/entries
     ↓
FoodItemService (scale = quantity / servingSize)
     ↓
FoodEntryService.create  (copied calories, macros, micros)
     ↓
FoodEntry snapshot
```

Rules:

- Seeded rows use `sourceType = SYSTEM`. `imageUrl` is optional; the UI falls back to an emoji when it is null.
- Logging copies nutrition into `FoodEntry`. Changing Eggs from 78 kcal to 80 kcal later must not change old entries.
- `FoodEntry` has no `foodItemId` in this version (avoids a live dependency and a FoodEntry redesign).
- PDF import and AI extraction do **not** match names against `FoodItem` yet. Chat `searchFood` stays on the in-memory `CatalogFoodSearchProvider`.

---

# 13. Error Handling

All API errors use a single JSON envelope:

```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Validation failures may include a `details` object from Zod.

Status mapping:

- `400` invalid request / input (`VALIDATION_ERROR`)
- `401` unauthenticated (`UNAUTHORIZED`)
- `403` authorization failures (`FORBIDDEN`)
- `404` missing resource or unknown route (`NOT_FOUND`)
- `409` conflicts (`CONFLICT`)
- `413` oversized upload (`PAYLOAD_TOO_LARGE`)
- `415` unsupported media type (`UNSUPPORTED_MEDIA_TYPE`)
- `429` rate limit (`RATE_LIMITED`)
- `500` unexpected server error (`INTERNAL_SERVER_ERROR`)
- `502` / `504` AI provider failure / timeout (`AI_PROVIDER_ERROR`)

Unexpected errors are logged server-side. The client always receives:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

Do not expose stack traces, Prisma errors, connection strings, Gemini payloads, filesystem paths, or secrets.

---

# 14. Neon / Prisma Configuration

Neon hosts PostgreSQL for this project.

Document and configure:

- a **pooled** connection string for application runtime where appropriate
- a **direct** connection string for Prisma migrations where required by the Prisma + Neon setup

Create `.env.example` during Phase 0.

Never commit `.env` or secrets.

---

# 15. API Versioning

Initial APIs use:

```text
/api/v1/
```

Examples:

```text
/api/v1/auth/login
/api/v1/goals
/api/v1/food-entries
/api/v1/reports
/api/v1/ai/nutrition-extract
/api/v1/ai/chat
/api/v1/ai/chat/confirm-meal
/api/v1/imports/food-diary/preview
/api/v1/imports/food-diary/confirm
```

---

# 16. Pagination

Food entry list APIs use **offset pagination**:

```text
GET /api/v1/food-entries?page=1&pageSize=20
```

Rules:

- `page` and `pageSize` query parameters
- maximum `pageSize` = **50**
- default ordering: `consumedAt DESC`
- validate pagination limits server-side

Example response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Reports do not require pagination.

---

# 17. Security

Enforce:

- environment-based secrets (never commit API keys, DB passwords, JWT secrets, or `.env`)
- Argon2id password hashing
- JWT security (short-lived access tokens, default 15 minutes, strong secrets)
- refresh token security: CSPRNG tokens, SHA-256 hashes at rest with `JWT_REFRESH_SECRET` as pepper, rotation on use, revocation on logout
- ownership checks on all user-owned resources; never trust a client `userId`
- CORS allowlist from `CORS_ORIGIN` (comma-separated origins; `*` is rejected)
- upload validation for AI endpoints (MIME, magic bytes, 5MB cap)
- rate limiting for authentication, AI extraction, and AI chat endpoints
- generic HTTP 500 responses without stack traces, Prisma errors, Gemini payloads, or secrets
- Gemini credentials loaded only on the backend
- conversational AI tools cannot receive a client `userId` or execute SQL; only allowlisted tools run

---

# 18. Testing Strategy

Testing happens **during each implementation phase**, not only at the end.

Priority coverage:

- authentication
- ownership
- goals
- food CRUD
- filters
- pagination
- report calculations
- AI response validation (with mocked provider)
- conversational AI tools, confirmation, ownership, and mocked LLM provider loops
- PDF import preview/confirm, parser fixtures, ownership, and transactional confirm
- food catalog list/filter/search, quantity scaling, snapshot logging, and unauthenticated 401

Use Vitest and Fastify inject/API tests for backend-critical paths.

---

# 19. Future Family Functionality

v1 ownership is strictly per-user.

Family functionality (later) must be an **additional authorization/policy layer** over existing user-owned data — not a replacement of `userId` ownership, and not part of the v1 schema.

Do not implement in v1:

- family system

Conversational AI, PDF food diary import, and the food catalog are implemented as post-core bonuses. The LLM never accesses the database directly. PDF preview never writes food entries. Catalog logging copies nutrition into `FoodEntry` rather than live-linking catalog rows.

Required functionality comes first.

---

# 20. Assumptions

1. Auth (register/login/refresh/logout/me) is implemented as core infrastructure despite being listed under bonus multi-user support in the product requirements.
2. Each user has exactly one current `Goal` in v1; goal history is out of scope.
3. `consumedAt` + `User.timezone` define nutrition day boundaries.
4. Macros use fixed units (kcal / grams); micros use `amount` + `unit` with canonical keys.
5. Reports are computed on read with no materialization in v1.
6. AI extract never persists food entries; the user confirms via the food entry API.
7. Conversational AI may propose a meal, but only explicit `confirm-meal` (Save meal) creates a `FoodEntry`.
8. PDF import may propose meals from a text-based diary, but only explicit confirm creates `FoodEntry` rows.
9. Family tables remain deferred.
10. Catalog logging copies scaled nutrition into `FoodEntry`. Later `FoodItem` edits do not rewrite history.
11. Chat `searchFood` remains an in-memory estimate provider; it is not wired to `FoodItem` in this version.

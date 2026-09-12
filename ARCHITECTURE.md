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
        │  (provider abstraction)
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ Vision-capable LLM │
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

## Database

- PostgreSQL hosted on Neon
- Prisma ORM

## Testing

- Vitest
- Fastify inject / API tests

## AI

- Vision-capable LLM API behind an `AIExtractionService` abstraction

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
```

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
  └── FoodEntry            (1:many)
          │
          └── FoodEntryNutrient   (1:many)
```

v1 does **not** implement goal history.

Do **not** create Family / FamilyMember / FamilyInvitation / FamilyPermission / `familyId` tables or columns in v1.

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
```

Recommended indexes:

- `food_entries (user_id, consumed_at)`
- `food_entry_nutrients (food_entry_id)`

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
- Validate MIME type, file size, AI response structure, and nutritional value ranges.
- Provider implementations are swappable behind `AIExtractionService`.
- Mock the AI provider in tests.

---

# 13. Neon / Prisma Configuration

Neon hosts PostgreSQL for this project.

Document and configure:

- a **pooled** connection string for application runtime where appropriate
- a **direct** connection string for Prisma migrations where required by the Prisma + Neon setup

Create `.env.example` during Phase 0.

Never commit `.env` or secrets.

---

# 14. API Versioning

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
```

---

# 15. Pagination

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

# 16. Security

Enforce:

- environment-based secrets (never commit API keys, DB passwords, JWT secrets, or `.env`)
- password hashing
- JWT security (short-lived access tokens, strong secrets)
- refresh token security (secure storage/handling, rotation as designed)
- ownership checks on all user-owned resources
- CORS allowlist for the frontend origin
- upload validation for AI endpoints
- rate limiting for authentication and AI endpoints
- generic HTTP 500 responses without stack traces or internal details

---

# 17. Testing Strategy

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

Use Vitest and Fastify inject/API tests for backend-critical paths.

---

# 18. Future Family Functionality

v1 ownership is strictly per-user.

Family functionality (later) must be an **additional authorization/policy layer** over existing user-owned data — not a replacement of `userId` ownership, and not part of the v1 schema.

Do not implement in v1:

- conversational AI
- PDF import
- family system

Required functionality comes first.

---

# 19. Assumptions

1. Auth (register/login/refresh/logout/me) is implemented as core infrastructure despite being listed under bonus multi-user support in the product requirements.
2. Each user has exactly one current `Goal` in v1; goal history is out of scope.
3. `consumedAt` + `User.timezone` define nutrition day boundaries.
4. Macros use fixed units (kcal / grams); micros use `amount` + `unit` with canonical keys.
5. Reports are computed on read with no materialization in v1.
6. AI extract never persists food entries; the user confirms via the food entry API.
7. Family tables and bonus features are deferred until the core app is stable.

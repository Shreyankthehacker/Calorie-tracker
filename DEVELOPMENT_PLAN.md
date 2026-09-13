# Development Plan

The project will be implemented incrementally.

**Testing is part of every phase.** A phase is not complete until its tests pass.

Do not implement bonus or family features until the core application (Phases 0–6) is stable.

Stack constraints: React, TypeScript, Vite, TanStack Query, Recharts, Node.js, Fastify, Zod, Prisma, Neon PostgreSQL, Vitest. Do not introduce Express, NestJS, FastAPI, GraphQL, Redis, or other unnecessary infrastructure.

---

## Phase 0 — Project Foundation

Implement:

- Monorepo layout (`frontend/`, `backend/`)
- Backend (Node.js + TypeScript + Fastify)
- Frontend (React + TypeScript + Vite)
- Prisma + Neon PostgreSQL configuration
  - pooled connection for app runtime where appropriate
  - direct connection for migrations where required
- Environment configuration and `.env.example` (never commit `.env`)
- Linting / formatting
- Health endpoint
- Basic frontend shell that can call the backend
- Initial test harness (Vitest + Fastify inject smoke/health test)

### Completion Criteria

```text
Frontend runs
Backend runs
Database connects
Health endpoint works
Frontend can call backend
Initial tests pass
.env.example exists; .env is not committed
```

---

## Phase 1 — Authentication + Ownership + Tests

Implement:

- Registration
- Login
- Logout
- Password hashing
- Short-lived access JWT
- Refresh token mechanism (secure handling)
- Current-user endpoint (`GET /auth/me`)
- Auth rate limiting
- Ownership helpers / patterns for scoping queries to the authenticated user

### Tests (required before phase complete)

- Registration and login success/failure paths
- Protected route rejects unauthenticated requests
- `/auth/me` returns the authenticated user
- Refresh / logout behavior as designed
- Ownership scoping utilities (or equivalent) cannot be bypassed by client-supplied `userId`

### Completion Criteria

A user can register, log in, refresh, log out, and access protected endpoints. Auth tests pass.

---

## Phase 2 — Goals + Tests

Implement:

- Current goal create / read / update / delete (1:1 with user)
- Validation for calorie and macro targets
- Ownership enforcement

Do not implement goal history.

### Tests (required before phase complete)

- Create and retrieve current goal
- Update current goal
- Conflict / not-found behavior as designed
- Another user cannot read or mutate this user's goal

### Completion Criteria

Authenticated users can manage their own current goal. Goal tests pass.

---

## Phase 3 — Food Entries + Tests

Implement:

- Create / read / update / delete food entries
- Fields: mealType, foodName, quantity, quantityUnit, calories, protein, carbs, fat, consumedAt, micronutrients
- Non-negative validation for calories and macros
- Canonical micronutrient keys via `FoodEntryNutrient`
- Filtering by `consumedAt` range (`startDate` / `endDate`) and meal type
- Offset pagination (`page`, `pageSize`, max 50)
- Default order: `consumedAt DESC`
- Ownership enforcement

### Tests (required before phase complete)

- Food CRUD
- Filters on `consumedAt` and meal type
- Pagination metadata and max page size
- Ownership checks on get/update/delete by id
- Micronutrient create/read with parent entry

### Completion Criteria

Users can fully manage their own food history with correct time filtering and pagination. Food entry tests pass.

---

## Phase 4 — Reports + Charts + Tests

Implement:

- Weekly calorie trend
- Macro breakdown
- Micronutrient summary
- Goal vs actual
- Aggregation using `consumedAt` and the user's timezone
- Frontend charts with Recharts

No caching or materialized daily totals in v1.

Reports return aggregate series (not paginated lists).

### Tests (required before phase complete)

- Aggregation calculations for calories / macros / micros
- Day bucketing respects user timezone
- Goal vs actual uses the current goal
- Entries are scoped to the authenticated user

### Completion Criteria

Frontend displays all required nutrition reports. Aggregation tests pass.

---

## Phase 5 — AI Nutrition Extraction + Tests

Implement:

- Image upload endpoint
- MIME type and file size validation
- `AIExtractionService` provider abstraction
- Vision LLM integration (real provider in development)
- Zod validation of structured AI output
- Nutritional value range checks
- Rate limiting on the AI endpoint
- Frontend review/edit UI
- Persist only via existing food entry create API after user confirmation

The extract endpoint must not create a `FoodEntry`.

### Tests (required before phase complete)

- Reject invalid MIME / oversized files
- Mocked provider returns structured data that passes Zod
- Invalid AI payloads are rejected
- Extract endpoint does not insert food entries
- Happy path returns editable structured nutrition for the client

### Completion Criteria

User can upload an image, review/edit extracted nutrition, and save via food entry creation. AI tests pass with a mocked provider.

---

## Phase 6 — Hardening + Documentation + Final Testing

Implement / verify:

- Consistent error handling (including generic 500 bodies)
- Loading and empty states on the frontend
- CORS allowlist
- Security checklist (secrets, JWT, refresh tokens, ownership, upload validation, rate limits)
- OpenAPI / Swagger is **not** used; `API_DESIGN.md` is the API contract
- README and environment documentation synchronized with implementation
- Architecture / API docs updated if behavior drifted
- Gap-fill tests and regression pass

### Completion Criteria

```text
Core required features work end-to-end
Security baselines documented and enforced
Documentation matches implementation
Test suite green
```

---

## After Core Is Stable

Only after Phases 0–6 are complete and stable:

### Bonus — Conversational AI

Potential tools:

```text
logMeal
getGoals
getNutritionSummary
getWeeklyReport
searchFood
```

The LLM should call application tools rather than accessing the database directly.

### Bonus — PDF Import

```text
PDF → extraction → table detection → normalization → validation → preview → import
```

### Future — Family System

Additional authorization/policy layer over existing user-owned data.

Do **not** add Family tables in v1. No `familyId` on existing models until this phase intentionally begins.

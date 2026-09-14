# AGENTS.md

## Project

This repository contains a full-stack Personal Calorie Tracker.

The primary objective is to implement all required assignment functionality before implementing bonus or future functionality.

The application consists of:

- React + TypeScript frontend (Vite, TanStack Query, Recharts)
- Node.js + TypeScript backend (Fastify, Zod)
- PostgreSQL on Neon via Prisma
- REST APIs
- AI-powered nutrition extraction behind `AIExtractionService`

Do not introduce Express, NestJS, FastAPI, GraphQL, Redis, or other unnecessary infrastructure.

---

# Engineering Principles

## 1. Follow the requirements

`PROJECT_REQUIREMENTS.md` is the source of truth for product requirements.

`ARCHITECTURE.md` is the source of truth for technical decisions and assumptions.

Do not add unnecessary features unless explicitly requested.

Required functionality always takes priority over bonus functionality.

Do not implement the future family nutrition system until the core application is complete and stable.

Do not implement bonus conversational AI or PDF import until Phases 0–6 are complete and stable.

---

## 2. Incremental implementation

Do not implement the entire application in one operation.

Work in small, reviewable phases as defined in `DEVELOPMENT_PLAN.md`.

Before implementing a major feature:

1. Understand the existing architecture.
2. Identify the files that need to change.
3. Implement the feature.
4. Run tests/type checking for that phase.
5. Fix errors.
6. Summarize what changed.

A phase is not complete until its tests pass.

Do not make unrelated changes.

---

## 3. Architecture

Use a clear separation of concerns.

Backend:

```text
Routes
  ↓
Handlers
  ↓
Services
  ↓
Repositories
  ↓
Prisma
  ↓
Neon PostgreSQL
```

Handlers must remain thin.

Routes and handlers must not contain Prisma queries.

Business logic belongs in services.

Database access belongs in repositories.

Frontend should communicate with the backend through API clients/services.

---

# Backend Rules

## TypeScript

Use strict TypeScript.

Avoid:

- `any`
- unnecessary type assertions
- duplicated types
- untyped request/response objects

Prefer explicit types and reusable schemas.

---

## Validation

Validate all external input.

Use Zod schemas for:

- request bodies
- query parameters
- route parameters
- important external responses (including AI extraction output)

Never assume frontend input is valid.

Calories and macro values must be non-negative.

---

## Error Handling

Use centralized error handling.

API responses should have a consistent structure.

Do not expose:

- stack traces
- database internals
- secrets
- sensitive implementation details

Use appropriate HTTP status codes.

Generic HTTP 500 responses only for unexpected failures.

---

## Authentication

Authentication is foundational infrastructure (register, login, refresh, logout, current user), even though multi-user support is listed as a bonus in the product requirements.

Authenticated endpoints must identify the current user from the authentication mechanism.

Use:

- password hashing
- short-lived access JWT
- secure refresh token handling

Never trust:

```text
user_id
```

sent by the frontend when the authenticated identity is already available.

For user-owned resources, ownership must be enforced server-side.

Every user-owned database query must be scoped to the authenticated user.

Example:

```text
GET /food-entries/123
```

must verify that entry `123` belongs to the authenticated user.

---

## Database

Use PostgreSQL on Neon through Prisma.

v1 models:

- User (includes `timezone`)
- Goal (1:1 with User — current goal only; no goal history)
- FoodEntry
- FoodEntryNutrient

`FoodEntry.consumedAt` is the source of truth for filtering and reporting.

`createdAt` is audit-only.

Family membership is optional (`Family` + `User.familyId`). Food entries remain owned by `userId`. Do not add FamilyInvitation / FamilyPermission tables unless explicitly required.

Use a pooled Neon connection for application runtime where appropriate and a direct connection for Prisma migrations where required.

Do not manually construct SQL when Prisma can safely express the query.

Raw SQL may be used when necessary for complex analytics, but should be justified.

All schema changes must be represented through migrations.

Never modify production database structure manually.

---

## Pagination

Food entry list APIs must support offset pagination:

```text
?page=1&pageSize=20
```

Rules:

- maximum `pageSize` = 50
- default ordering: `consumedAt DESC`
- validate pagination limits
- do not return unbounded result sets

Reports return aggregate series and do not use list pagination.

---

## Nutrition Data

Food entries must support:

- meal type
- food name
- quantity + quantityUnit
- calories (kcal)
- protein (grams)
- carbohydrates (grams)
- fat (grams)
- micronutrients (`nutrientKey`, amount, unit)
- consumedAt

Micronutrients should use canonical keys and a flexible child table rather than a large fixed column set.

---

## Reporting

Aggregate at request time from persisted food entries.

Use `consumedAt` and the user's timezone for daily bucketing.

Do not introduce caching or materialized daily totals in v1.

---

## AI Nutrition Extraction

AI-generated nutrition data is untrusted input.

The AI extraction flow must be:

```text
Image upload
  ↓
File validation (MIME, size)
  ↓
AIExtractionService
  ↓
Structured response
  ↓
Zod validation (+ value ranges)
  ↓
User review/edit
  ↓
FoodEntry creation
```

Never automatically persist AI output as a food entry.

The extract endpoint must not create a `FoodEntry`.

Mock the AI provider in tests.

Rate-limit authentication and AI endpoints.

---

## Security

Never commit:

- API keys
- database passwords
- JWT secrets
- private credentials
- `.env` files

Use `.env.example` for configuration documentation (created in Phase 0).

Also enforce:

- CORS allowlist
- upload validation
- rate limiting for auth and AI
- ownership checks
- refresh token security

---

# Frontend Rules

Use React + TypeScript + Vite.

Keep:

- UI components
- API communication
- state management
- business logic

appropriately separated.

Do not put large API calls directly inside reusable UI components.

Use a centralized API client (TanStack Query for server state).

Handle:

- loading states
- empty states
- errors
- validation errors
- successful mutations

Use Recharts for nutrition report visualization.

---

# Dependencies

Do not introduce a new dependency without considering whether the existing stack can solve the problem.

When adding an important dependency:

- explain why it is needed
- use a stable version
- avoid duplicate libraries solving the same problem

---

# Testing

Business-critical backend functionality must have tests **in the same phase** that implements the feature.

Do not defer all testing to a final quality phase.

At minimum cover:

- authentication
- ownership checks
- goal creation/update
- food entry creation
- food entry filtering
- pagination
- nutrition / report calculations
- AI response validation (mocked provider)

Use Vitest and Fastify inject/API tests.

---

# Documentation

Keep documentation synchronized with the implementation.

Important architectural decisions should be documented in:

```text
ARCHITECTURE.md
```

API changes should be reflected in:

```text
API_DESIGN.md
```

Setup instructions belong in:

```text
README.md
```

---

# Git Discipline

Keep commits focused.

Prefer:

```text
feat: add food entry API
feat: add goal management
fix: enforce food entry ownership
test: add pagination tests
```

Avoid giant commits containing unrelated changes.

---

# Cursor/Agent Behavior

Before making large changes:

- inspect existing files
- understand existing patterns
- reuse existing abstractions
- avoid unnecessary rewrites

When uncertain between multiple approaches, explain the tradeoff before implementing.

Do not silently change the technology stack.

Do not introduce family functionality unless explicitly instructed.

Do not implement bonus features before required features are complete.

The goal is a clean, maintainable engineering project rather than the maximum amount of generated code.

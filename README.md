# Personal Calorie Tracker

A full-stack nutrition tracking application for managing meals, nutrition goals, and health insights.

## Features

### Required

- Personal nutrition goals (one current goal per user)
- Meal and food logging with `consumedAt`
- Calorie and macronutrient tracking
- Micronutrient tracking (canonical keys)
- Date and meal-type filtering
- Paginated food entry APIs (max page size 50)
- Nutrition reports (timezone-aware)
- Goal vs actual comparisons
- AI-powered nutrition extraction from images (review before save)

### Foundational (implemented as core)

- Multi-user authentication (register, login, refresh, logout, current user)

Authentication is treated as required infrastructure even though multi-user support is listed under bonus features in the product requirements. See Assumptions below.

### Bonus (deferred)

- Conversational AI
- PDF nutrition history import

### Future (deferred)

- Family nutrition management

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
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

## Testing

- Vitest
- Fastify inject / API tests

## AI

- Vision-capable LLM API via `AIExtractionService` abstraction

Do not introduce Express, NestJS, FastAPI, GraphQL, Redis, or other unnecessary infrastructure.

---

# Assumptions

1. **Auth is core.** Register/login/refresh/logout/`me` ship in Phase 1 as foundational infrastructure.
2. **One current goal per user.** No goal history in v1.
3. **`consumedAt` drives nutrition time.** Audit `createdAt` does not affect reports or date filters.
4. **User timezone.** Daily report buckets use `User.timezone` (IANA; default documented at implementation, typically `UTC`).
5. **Units.** Calories = kcal; protein/carbs/fat = grams; micros = amount + unit; quantity = amount + `quantityUnit`.
6. **Reports are on-read aggregates.** No materialized daily totals in v1.
7. **AI never auto-saves entries.** Extract → validate → user edit → `POST /food-entries`.
8. **Strict user ownership in v1.** No family tables or `familyId`.
9. **Testing is per-phase.** A phase is incomplete until its tests pass.

Details: `ARCHITECTURE.md`.

---

# Repository Structure

```text
.
├── frontend/          (created in Phase 0)
├── backend/           (created in Phase 0)
├── docs/              (optional)
├── AGENTS.md
├── PROJECT_REQUIREMENTS.md
├── ARCHITECTURE.md
├── API_DESIGN.md
├── DEVELOPMENT_PLAN.md
└── README.md
```

Application source directories are created during Phase 0 — not before.

---

# Prerequisites

Install:

- Node.js
- pnpm
- Neon PostgreSQL project / connection strings
- Git

---

# Environment Variables

Backend configuration is provided through environment variables.

See:

- `.env.example` (index)
- `backend/.env.example`
- `frontend/.env.example`

Copy `backend/.env.example` → `backend/.env` and fill in database URLs.

For Neon:

- `DATABASE_URL` — pooled connection (application runtime)
- `DIRECT_URL` — direct/non-pooled connection (Prisma migrations)

For local development without Neon credentials, both URLs may temporarily point at the same local PostgreSQL instance.

Secrets must never be committed to Git. Never commit `.env`.

---

# Neon / Prisma

- Use a **pooled** connection for the running application where appropriate.
- Use a **direct** connection for Prisma migrations where required by the Prisma + Neon setup.

Commands (after Phase 0):

```bash
pnpm db:migrate
pnpm db:generate
```

---

# Development

After Phase 0 scaffolding:

```bash
pnpm install
pnpm dev:backend
pnpm dev:frontend
```

---

# Testing

Tests run throughout development, not only at the end.

```bash
pnpm test
```

Each phase in `DEVELOPMENT_PLAN.md` lists required tests for completion.

---

# Security (baseline)

- Environment-based secrets
- Password hashing
- Short-lived access JWTs and secure refresh token handling
- Server-side ownership checks
- CORS allowlist
- Upload validation for AI
- Rate limiting on auth and AI endpoints
- Generic 500 responses without stack traces

---

# API Documentation

When the backend is running, API documentation will be available through the configured OpenAPI/Swagger endpoint (added during foundation/hardening as implemented).

---

# Architecture

See `ARCHITECTURE.md` for system design, schema decisions, and assumptions.

---

# Development Guidelines

See `AGENTS.md` for coding and engineering guidelines.

---

# Project Requirements

See `PROJECT_REQUIREMENTS.md` for product requirements.

---

# Development Roadmap

See `DEVELOPMENT_PLAN.md` for the phased implementation sequence (tests included in each phase).

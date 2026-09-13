# Personal Calorie Tracker

A full-stack personal nutrition tracker for logging meals, setting a current nutrition goal, reviewing timezone-aware reports, extracting nutrition from food photos, chatting with an assistant that uses application tools, and importing text-based PDF food diaries after review.

Users review and edit AI-extracted values before anything is saved. Extraction never creates a food entry on its own. Conversational meal logging also requires an explicit Save meal confirmation. PDF import never creates food entries until the user confirms the previewed meals.

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- TanStack Query
- Recharts
- React Router

## Backend

- Node.js
- TypeScript
- Fastify
- Zod
- Prisma

## Database

- PostgreSQL hosted on Neon

## AI

- Gemini, used only on the backend through `NutritionExtractionProvider` / `AIExtractionService` and `LlmProvider` / `ChatService` abstractions

The browser never receives `GEMINI_API_KEY` and never calls Gemini.

Do not introduce Express, NestJS, FastAPI, GraphQL, Redis, or other unnecessary infrastructure.

---

# Features

Implemented:

- Authentication: register, login, refresh, logout, current user
- One current nutrition goal per user (create, update, delete)
- Meal / food entries with calories, macros, micronutrients, quantity, meal type, and `consumedAt`
- Offset pagination for food-entry lists (default order `consumedAt DESC`, max `pageSize` 50)
- Date and meal-type filtering on `consumedAt`
- Timezone-aware reports (today, calorie trend, macros, micronutrients, goal vs actual)
- Charts for calorie and macro trends
- Goal vs actual comparison (daily goal multiplied by inclusive day count)
- AI food/nutrition extraction from JPEG, PNG, or WebP images
- Review/edit of extracted nutrition before an explicit save through `POST /food-entries`
- Conversational AI assistant (`/chat`) that reads goals, summaries, and weekly reports through application tools
- Explicit Save meal confirmation before chat-proposed meals are persisted
- PDF food diary import (`/import`): structural text extraction, preview, edit/remove, then explicit confirmation

Deferred (not implemented):

- Family accounts / dependent accounts

---

# Project Structure

```text
.
├── AGENTS.md
├── API_DESIGN.md
├── ARCHITECTURE.md
├── DEVELOPMENT_PLAN.md
├── PROJECT_REQUIREMENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── backend/
│   ├── src/                 application code (routes → handlers → services → repositories)
│   ├── tests/               Vitest + Fastify inject tests
│   ├── prisma/              schema and migrations
│   ├── .env.example
│   └── .env.test.example    isolated test database (never Neon)
└── frontend/
    ├── src/
    │   ├── api/             HTTP client and resource modules
    │   ├── auth/            session provider
    │   ├── components/      shared UI
    │   ├── pages/           Dashboard, Goals, Meals, Reports, Scan Food, auth
    │   └── routes/
    └── .env.example
```

---

# Assumptions

1. **Auth is core.** Register/login/refresh/logout/`me` are foundational infrastructure.
2. **One current goal per user.** No goal history in v1.
3. **`consumedAt` drives nutrition time.** Audit `createdAt` does not affect reports or date filters.
4. **User timezone.** Daily report buckets use `User.timezone` (IANA; default `UTC`).
5. **Units.** Calories = kcal; protein/carbs/fat = grams; micros = amount + unit; quantity = amount + `quantityUnit`.
6. **Reports are on-read aggregates.** No materialized daily totals.
7. **AI never auto-saves entries.** Extract → validate → user edit → `POST /food-entries`.
8. **Strict user ownership in v1.** No family tables or `familyId`.

Details: `ARCHITECTURE.md`.

---

# Prerequisites

- Node.js 20+
- pnpm 9
- PostgreSQL (Neon for hosted development/production; local Postgres for tests)
- Git
- A Gemini API key only if you want live image extraction (backend-only)

---

# Setup

## 1. Install dependencies

From the repository root:

```bash
pnpm install
```

## 2. Configure environment variables

Copy examples and fill in real values locally. Never commit `.env` files.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Frontend needs only `VITE_API_BASE_URL` (default `http://localhost:3001`). Do **not** put `GEMINI_API_KEY` in any frontend env file.

See [Environment variables](#environment-variables).

## 3. Run database migrations

Neon (or other app database pointed to by `backend/.env`):

```bash
pnpm db:generate
pnpm db:migrate
```

`DATABASE_URL` is the pooled runtime connection. `DIRECT_URL` is the direct connection used for Prisma migrations.

## 4. Start the backend

```bash
pnpm dev:backend
```

Listens on `PORT` (default `3001`). `tsx watch` does not reload `.env`; restart the process after changing `backend/.env`.

## 5. Start the frontend

```bash
pnpm dev:frontend
```

Vite defaults to `http://localhost:5173`.

## 6. Run tests

See [Testing](#testing).

---

# Environment Variables

Root `.env.example` points at package-specific examples. Application secrets live in `backend/.env`.

## Backend (`backend/.env.example`)

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` / `HOST` | HTTP bind address (default `3001` / `0.0.0.0`) |
| `DATABASE_URL` | Pooled PostgreSQL URL for the running app |
| `DIRECT_URL` | Direct PostgreSQL URL for Prisma migrations |
| `CORS_ORIGIN` | Comma-separated frontend origin allowlist. Do **not** use `*` |
| `JWT_ACCESS_SECRET` | Access-token signing secret (≥ 32 characters) |
| `JWT_REFRESH_SECRET` | Refresh hashing pepper and related secret (≥ 32 characters) |
| `JWT_ACCESS_EXPIRES_IN` | Short-lived access JWT lifetime (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (default `7d`) |
| `AUTH_RATE_LIMIT_MAX` | Auth requests per window (default `20`) |
| `AUTH_RATE_LIMIT_TIME_WINDOW_MS` | Auth window in ms (default `60000`) |
| `GEMINI_API_KEY` | Gemini key. Backend only. Leave empty to disable live extraction |
| `GEMINI_MODEL` | Default `gemini-2.5-flash` |
| `AI_MAX_UPLOAD_BYTES` | Upload cap (default `5242880` / 5MB) |
| `AI_RATE_LIMIT_MAX` | AI requests per window (default `10`) |
| `AI_RATE_LIMIT_TIME_WINDOW_MS` | AI window in ms (default `60000`) |
| `AI_PROVIDER_TIMEOUT_MS` | Provider timeout (default `25000`) |
| `PDF_MAX_UPLOAD_BYTES` | PDF upload cap (default `5242880` / 5MB) |
| `PDF_RATE_LIMIT_MAX` | PDF preview requests per window (default `10`) |
| `PDF_RATE_LIMIT_TIME_WINDOW_MS` | PDF preview window in ms (default `60000`) |

The frontend must never receive `GEMINI_API_KEY`.

## Frontend (`frontend/.env.example`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend origin, no trailing slash (default `http://localhost:3001`) |

Secrets must never be committed. `.env` and `.env.test` are gitignored.

---

# Testing

Backend tests use an **isolated** database from `backend/.env.test` (see `backend/.env.test.example`). Vitest refuses to run if `DATABASE_URL` points at Neon (`neon.tech`). Do not copy production credentials into test config.

Example local test database:

```bash
docker run -d --name calorie-tracker-test-pg \
  -e POSTGRES_USER=calorie_test \
  -e POSTGRES_PASSWORD=calorie_test \
  -e POSTGRES_DB=calorie_tracker_test \
  -p 5434:5432 postgres:16-alpine

cd backend
cp .env.test.example .env.test
set -a && source .env.test && set +a
pnpm exec prisma migrate deploy
```

Commands from the repository root:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Package-specific:

```bash
pnpm --filter @calorie-tracker/backend test
pnpm --filter @calorie-tracker/backend typecheck
pnpm --filter @calorie-tracker/backend lint
pnpm --filter @calorie-tracker/backend build

pnpm --filter @calorie-tracker/frontend test
pnpm --filter @calorie-tracker/frontend typecheck
pnpm --filter @calorie-tracker/frontend lint
pnpm --filter @calorie-tracker/frontend build
```

Prisma:

```bash
pnpm --filter @calorie-tracker/backend exec prisma validate
pnpm --filter @calorie-tracker/backend exec prisma migrate status
```

Frontend tests use Vitest + Testing Library with mocked API modules (no live database, no Gemini).

Backend AI tests inject mock `NutritionExtractionProvider` and `LlmProvider` implementations and do not call Gemini.

---

# AI Usage

- Endpoint: `POST /api/v1/ai/nutrition-extract` (authenticated, rate-limited)
- Supported types: JPEG, PNG, WebP (`image/jpeg`, `image/png`, `image/webp`)
- Maximum size: 5MB
- Images are validated (declared MIME + magic bytes), processed in memory, and discarded
- The backend asks Gemini (or a test mock) for structured nutrition, then validates with Zod
- The client shows a review/edit form. Saving uses the normal food-entry API
- Extraction does **not** create a `FoodEntry`
- Conversational AI: `POST /api/v1/ai/chat` (authenticated, same AI rate limit). Optional `history` is request-scoped only; there is no chat-history table
- The assistant uses allowlisted tools (`getGoals`, `getNutritionSummary`, `getWeeklyReport`, `listMeals`, `searchFood`, `logMeal`) that call existing services. **The LLM never accesses the database directly.**
- `logMeal` in the chat loop only returns a `pendingMeal`. Persist with `POST /api/v1/ai/chat/confirm-meal` after Save meal
- `searchFood` uses an in-app catalog of labeled estimates, not a live external food database
- `GEMINI_API_KEY` stays on the backend

---

# PDF Food Diary Import

- Preview: `POST /api/v1/imports/food-diary/preview` (authenticated, multipart `file`, rate-limited)
- Confirm: `POST /api/v1/imports/food-diary/confirm` (authenticated JSON; uses `FoodEntryService.createMany`)
- Supported: text-based tabular, line-oriented, and mixed dash/pipe food diaries
- Library: Mozilla `pdfjs-dist` extracts positioned text (page, x, y, width, height). Rows are grouped by Y proximity; columns are inferred from header X positions
- Preview does **not** create `FoodEntry` rows. Confirmation is all-or-nothing
- Scanned/image-only PDFs are **not** supported (no OCR). AI is **not** used for PDF parsing
- Maximum upload: 5MB. Preview rate limit: 10 requests / 60s. Maximum 30 pages and 100 previewed meals
- Possible duplicates (same food name, meal type, quantity, calories, `consumedAt`) are flagged in preview; the user chooses whether to import them

---

# Security

- Passwords hashed with Argon2id
- Short-lived JWT access tokens (default 15 minutes)
- Refresh tokens generated with CSPRNG, stored hashed (SHA-256 with `JWT_REFRESH_SECRET` as pepper), rotated on use, and revoked on logout
- Ownership is enforced server-side from the access token; client `userId` is ignored
- Zod validation at API boundaries, including AI output
- Rate limits on auth (default 20 / 60s), AI extraction/chat (default 10 / 60s), and PDF preview (default 10 / 60s)
- CORS allowlist via `CORS_ORIGIN` (no `*`)
- Upload validation for AI images and PDF diaries; oversized uploads return 413; unsupported types return 415
- Generic HTTP 500 bodies never include stack traces, Prisma errors, provider payloads, or secrets

---

# API Documentation

There is no Swagger/OpenAPI UI in this repository.

The implemented HTTP contract is documented in `API_DESIGN.md`.

---

# Architecture

See `ARCHITECTURE.md` for layering, schema decisions, reporting, AI extraction, conversational AI tools, PDF import, and security boundaries.

---

# Development Guidelines

See `AGENTS.md`.

---

# Project Requirements

See `PROJECT_REQUIREMENTS.md`.

---

# Development Roadmap

See `DEVELOPMENT_PLAN.md` for the phased sequence. Phases 0–6 are the v1 core. Bonus conversational AI and PDF food diary import are implemented. Family accounts remain out of scope.

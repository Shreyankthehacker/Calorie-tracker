# AGENTS.md

## Project

This repository contains a full-stack Personal Calorie Tracker.

The primary objective is to implement all required assignment functionality before implementing bonus or future functionality.

The application consists of:

- React + TypeScript frontend
- Node.js + TypeScript backend
- PostgreSQL database
- REST APIs
- AI-powered nutrition extraction

---

# Engineering Principles

## 1. Follow the requirements

`PROJECT_REQUIREMENTS.md` is the source of truth for product requirements.

Do not add unnecessary features unless explicitly requested.

Required functionality always takes priority over bonus functionality.

Do not implement the future family nutrition system until the core application is complete and stable.

---

## 2. Incremental implementation

Do not implement the entire application in one operation.

Work in small, reviewable phases.

Before implementing a major feature:

1. Understand the existing architecture.
2. Identify the files that need to change.
3. Implement the feature.
4. Run tests/type checking.
5. Fix errors.
6. Summarize what changed.

Do not make unrelated changes.

---

## 3. Architecture

Use a clear separation of concerns.

Backend:

```text
API/Routes
    ↓
Controllers/Handlers
    ↓
Services
    ↓
Repositories
    ↓
Database
```

Business logic should not be placed directly inside route handlers.

Database queries should not be scattered throughout the application.

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
- important external responses

Never assume frontend input is valid.

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

---

## Authentication

Authenticated endpoints must identify the current user from the authentication mechanism.

Never trust:

```text
user_id
```

sent by the frontend when the authenticated identity is already available.

For user-owned resources, ownership must be enforced server-side.

Example:

```text
GET /food-entries/123
```

must verify that entry `123` belongs to the authenticated user.

---

## Database

Use PostgreSQL through Prisma.

Do not manually construct SQL when Prisma can safely express the query.

Raw SQL may be used when necessary for complex analytics, but should be justified.

All schema changes must be represented through migrations.

Never modify production database structure manually.

---

## Pagination

Every list API must support pagination.

Use a consistent convention, for example:

```text
?page=1&pageSize=20
```

or cursor pagination where appropriate.

Do not return unbounded database result sets.

Pagination limits must be validated.

---

# Frontend Rules

Use React + TypeScript.

Keep:

- UI components
- API communication
- state management
- business logic

appropriately separated.

Do not put large API calls directly inside reusable UI components.

Use a centralized API client.

Handle:

- loading states
- empty states
- errors
- validation errors
- successful mutations

---

# Nutrition Data

Food entries must support:

- meal type
- food name
- quantity
- calories
- protein
- carbohydrates
- fat
- micronutrients

Micronutrients should be modeled flexibly rather than creating an unnecessarily large fixed table of columns.

---

# AI Nutrition Extraction

AI-generated nutrition data is untrusted input.

The AI extraction flow must be:

```text
Image
  ↓
AI Vision
  ↓
Structured response
  ↓
Schema validation
  ↓
User review/edit
  ↓
Database
```

Never automatically persist unvalidated AI output.

The user must be able to review and modify extracted nutrition values before saving.

---

# Security

Never commit:

- API keys
- database passwords
- JWT secrets
- private credentials
- `.env` files

Use `.env.example` for configuration documentation.

---

# Dependencies

Do not introduce a new dependency without considering whether the existing stack can solve the problem.

When adding an important dependency:

- explain why it is needed
- use a stable version
- avoid duplicate libraries solving the same problem

---

# Testing

Business-critical backend functionality must have tests.

At minimum test:

- authentication
- goal creation/update
- food entry creation
- food entry filtering
- pagination
- ownership checks
- nutrition calculations
- report calculations

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